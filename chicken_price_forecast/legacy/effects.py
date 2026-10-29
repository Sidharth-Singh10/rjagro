"""Reusable event-effect estimator (shared by reporting and backtesting).

The same function estimates historical event effects for the report and, at
each backtest origin, re-estimates them using only data available up to that
origin. That guarantees the validation is honest.
"""
from __future__ import annotations

import numpy as np
import pandas as pd

import cplib as cp

MATCH_DAYS = 14
BOOT_BLOCK = 7
TAU_BETWEEN = 0.04 ** 2


def random_effects(y, s):
    y = np.asarray(y, float)
    s = np.asarray(s, float)
    ok = np.isfinite(y) & np.isfinite(s)
    y, s = y[ok], np.maximum(s[ok], 1e-6)
    k = len(y)
    if k == 0:
        return dict(n=0, mu=np.nan, se=np.nan, tau2=np.nan)
    if k == 1:
        return dict(n=1, mu=float(y[0]), se=float(s[0]), tau2=0.0)
    w = 1 / s ** 2
    mu_f = float((w * y).sum() / w.sum())
    q = float((w * (y - mu_f) ** 2).sum())
    c = float(w.sum() - (w ** 2).sum() / w.sum())
    tau2 = max(0.0, (q - (k - 1)) / c) if c > 0 else 0.0
    ws = 1 / (s ** 2 + tau2)
    return dict(n=k, mu=float((ws * y).sum() / ws.sum()),
                se=float(np.sqrt(1 / ws.sum())), tau2=tau2)


def _delta(lp, ev_days, match_days, boot, rng):
    if len(ev_days) == 0 or len(match_days) < 4:
        return np.nan, np.nan, len(ev_days), len(match_days)
    le = lp.loc[ev_days].values
    lm = lp.loc[match_days].values
    delta = float(le.mean() - lm.mean())
    if boot <= 0:
        # analytic fallback (used by the backtest): variance of the difference
        # of the two means, inflated for first-order serial correlation
        infl = 1.0
        if len(np.concatenate([le, lm])) > 3:
            local = np.concatenate([le, lm])
            rho = float(np.corrcoef(local[:-1], local[1:])[0, 1])
            rho = np.clip(rho if np.isfinite(rho) else 0.0, 0.0, 0.9)
            infl = (1 + rho) / (1 - rho) if rho < 1 else 1.0
            infl = min(infl, 4.0)
        pool_sd = float(np.std(np.concatenate([le, lm]), ddof=1))
        v = pool_sd ** 2 * (1.0 / len(le) + 1.0 / len(lm))
        se = float(np.sqrt(max(v, 1e-8) * infl))
        return delta, se, len(le), len(lm)
    local = np.concatenate([le, lm])
    ne, n = len(le), len(local)
    draws = np.empty(boot)
    for b in range(boot):
        idx = cp.block_bootstrap_idx(n, BOOT_BLOCK, rng)
        draws[b] = local[idx[:ne]].mean() - local[idx[ne:]].mean()
    return delta, float(np.std(draws, ddof=1)), ne, len(lm)


def estimate(prices: pd.Series, evt: cp.EventTables, cutoff=None, boot: int = 0,
             seed: int = 20261028, match_days: int = MATCH_DAYS):
    """Estimate event effects.

    Parameters
    ----------
    prices : observed price series (INR), gaps simply absent
    evt    : EventTables from cplib.load_event_calendar
    cutoff : if given, only occurrences whose matched window ends on or before
             this date are used (no look-ahead)
    boot   : block-bootstrap replications for the per-occurrence standard error
    """
    rng = np.random.default_rng(seed)
    lp = np.log(prices.astype(float))
    occ = evt.occurrences.copy()
    occ = occ[~occ["definition_id"].isin(cp.REGIME_EVENTS)].copy()
    if cutoff is not None:
        occ = occ[occ["influence_end"] + pd.Timedelta(days=match_days) <= pd.Timestamp(cutoff)]

    other_core = set(evt.daily.loc[(evt.daily.role == "core") &
                                   (~evt.daily.definition_id.isin(cp.REGIME_EVENTS)), "date"])

    rows = []
    for _, r in occ.iterrows():
        core = [d for d in pd.date_range(r.start_date, r.end_date) if d in lp.index]
        lead = [d for d in pd.date_range(r.lead_start, r.start_date - pd.Timedelta(days=1)) if d in lp.index]
        rec = [d for d in pd.date_range(r.end_date + pd.Timedelta(days=1), r.rec_end) if d in lp.index]
        infl = sorted(set(core) | set(lead) | set(rec))
        pre = pd.date_range(r.influence_start - pd.Timedelta(days=match_days),
                            r.influence_start - pd.Timedelta(days=1))
        post = pd.date_range(r.influence_end + pd.Timedelta(days=1),
                             r.influence_end + pd.Timedelta(days=match_days))
        m = [d for d in list(pre) + list(post) if d not in other_core and d in lp.index]

        d_core, se_core, n_core, n_match = _delta(lp, core, m, boot, rng)
        d_infl, se_infl, n_infl, _ = _delta(lp, infl, m, boot, rng)
        d_lead, _, n_lead, _ = _delta(lp, lead, m, 0, rng) if lead else (np.nan, 0, 0, len(m))
        d_rec, _, n_rec, _ = _delta(lp, rec, m, 0, rng) if rec else (np.nan, 0, 0, len(m))

        others = occ[(occ.definition_id != r.definition_id) &
                     (occ.start_date <= r.end_date) & (occ.end_date >= r.start_date)]
        rows.append(dict(
            definition_id=r.definition_id, event=r["name"], category=r.category, year=int(r.year),
            start_date=r.start_date, end_date=r.end_date,
            core_observed_days=n_core, matched_days=n_match,
            observed_core_price_inr=float(np.exp(lp.loc[core].mean())) if n_core else np.nan,
            matched_baseline_price_inr=float(np.exp(lp.loc[m].mean())) if n_match else np.nan,
            delta_core=d_core, se_core=se_core, delta_influence=d_infl, se_influence=se_infl,
            effect_lead_pct=(np.exp(d_lead) - 1) * 100 if np.isfinite(d_lead) else np.nan,
            effect_recovery_pct=(np.exp(d_rec) - 1) * 100 if np.isfinite(d_rec) else np.nan,
            lead_observed_days=n_lead, recovery_observed_days=n_rec, influence_observed_days=n_infl,
            date_confidence=r.date_confidence,
            overlaps_with=", ".join(sorted(set(others.definition_id))),
        ))
    oc = pd.DataFrame(rows)
    if len(oc) == 0:
        return oc, pd.DataFrame()

    # ---- pool occurrences per event -------------------------------------
    pooled = []
    for eid, d in oc.groupby("definition_id"):
        rc = random_effects(d["delta_core"], d["se_core"])
        ri = random_effects(d["delta_influence"], d["se_influence"])
        pooled.append(dict(definition_id=eid, event=d["event"].iloc[0], category=d["category"].iloc[0],
                           n_occ=rc["n"], delta_core=rc["mu"], se_core=rc["se"],
                           n_occ_inf=ri["n"], delta_influence=ri["mu"], se_influence=ri["se"]))
    pl = pd.DataFrame(pooled)

    info = (evt.occurrences.groupby("definition_id")
            .agg(hypothesised_direction=("hypothesised_direction", "first"),
                 calendar_confidence=("calendar_confidence", "first"),
                 occurrences_total=("year", "size"))
            .reset_index())
    pl = pl.merge(info, on="definition_id", how="left")

    # ---- category pooling + shrinkage -----------------------------------
    cat = []
    for c, d in oc.groupby("category"):
        rc = random_effects(d["delta_core"], d["se_core"])
        cat.append(dict(category=c, mu=rc["mu"], se=rc["se"], n=rc["n"]))
    cat = pd.DataFrame(cat).set_index("category")

    dev = pl[np.isfinite(pl["delta_core"])].copy()
    dev["cat_mu"] = dev["category"].map(cat["mu"])
    dev = dev.dropna(subset=["cat_mu"])
    if len(dev) > 2:
        tau2 = max(0.0, float((((dev["delta_core"] - dev["cat_mu"]) ** 2 - dev["se_core"] ** 2).sum())
                              / max(len(dev) - dev["category"].nunique(), 1)))
    else:
        tau2 = np.nan
    if not np.isfinite(tau2) or tau2 < 0.02 ** 2:
        tau2 = 0.02 ** 2

    for c in cat.index:
        if np.isfinite(cat.loc[c, "mu"]) and np.isfinite(cat.loc[c, "se"]):
            w = 1 / max(cat.loc[c, "se"], 1e-6) ** 2
            wp = 1 / TAU_BETWEEN
            cat.loc[c, "mu_shrunk"] = (w * cat.loc[c, "mu"]) / (w + wp)
            cat.loc[c, "se_shrunk"] = float(np.sqrt(1 / (w + wp)))
        else:
            cat.loc[c, "mu_shrunk"] = 0.0
            cat.loc[c, "se_shrunk"] = float(np.sqrt(TAU_BETWEEN))

    post = []
    for _, r in pl.iterrows():
        c = r["category"]
        mu = float(cat.loc[c, "mu_shrunk"]) if c in cat.index else 0.0
        se_cat = float(cat.loc[c, "se_shrunk"]) if c in cat.index else float(np.sqrt(TAU_BETWEEN))
        prior_var = tau2 + se_cat ** 2
        if np.isfinite(r["delta_core"]) and np.isfinite(r["se_core"]):
            w_own = 1 / max(r["se_core"], 1e-6) ** 2
            w_prior = 1 / prior_var
            post.append(dict(delta_shrunk=(w_own * r["delta_core"] + w_prior * mu) / (w_own + w_prior),
                             se_shrunk=float(np.sqrt(1 / (w_own + w_prior))),
                             weight_own=w_own / (w_own + w_prior), prior=mu, prior_se=se_cat))
        else:
            post.append(dict(delta_shrunk=mu, se_shrunk=float(np.sqrt(prior_var)),
                             weight_own=0.0, prior=mu, prior_se=se_cat))
    pl = pd.concat([pl, pd.DataFrame(post, index=pl.index)], axis=1)
    pl["tau2"] = tau2

    # ---- occurrence-level descriptive columns ---------------------------
    pl["core_observed_days"] = pl["definition_id"].map(oc.groupby("definition_id")["core_observed_days"].sum())
    pl["influence_observed_days"] = pl["definition_id"].map(
        oc.groupby("definition_id")["influence_observed_days"].sum())
    pl["occ_min_pct"] = pl["definition_id"].map(
        (np.exp(oc["delta_core"]) - 1).groupby(oc["definition_id"]).min() * 100)
    pl["occ_max_pct"] = pl["definition_id"].map(
        (np.exp(oc["delta_core"]) - 1).groupby(oc["definition_id"]).max() * 100)
    pl["occ_sd_pct"] = pl["definition_id"].map(
        (np.exp(oc["delta_core"]) - 1).groupby(oc["definition_id"]).std(ddof=1) * 100)
    ev_px = oc.groupby("definition_id")["observed_core_price_inr"].mean()
    pl["observed_price_inr"] = pl["definition_id"].map(ev_px)
    pl["median_lead_pct"] = pl["definition_id"].map(
        oc.groupby("definition_id")["effect_lead_pct"].median())
    pl["median_recovery_pct"] = pl["definition_id"].map(
        oc.groupby("definition_id")["effect_recovery_pct"].median())
    pl["overlap_share_pct"] = pl["definition_id"].map(
        oc.groupby("definition_id")["overlaps_with"].apply(lambda s: float((s != "").mean() * 100)))
    pl["baseline_price_inr"] = pl["observed_price_inr"] / np.exp(pl["delta_core"])

    oc["effect_core_pct"] = (np.exp(oc["delta_core"]) - 1) * 100
    oc["effect_influence_pct"] = (np.exp(oc["delta_influence"]) - 1) * 100
    return oc, pl.sort_values("definition_id").reset_index(drop=True)


def reliability(n_occ, days, has_estimate=True):
    if not has_estimate:
        return "E - no usable historical evidence"
    if n_occ >= 8 and days >= 30:
        return "A - well evidenced"
    if n_occ >= 4 and days >= 15:
        return "B - moderate"
    if n_occ >= 2 and days >= 5:
        return "C - weak"
    return "D - very weak (1 occurrence or <5 days)"
