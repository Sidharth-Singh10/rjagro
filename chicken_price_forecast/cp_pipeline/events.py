"""Event effects: matched-window study, block bootstrap, pooling, shrinkage.

For every occurrence the mean log price inside the event is compared with a
symmetric 14-day window either side (excluding other events' core days). The
difference is what we report; the bootstrap says how sure we are; the pooling
says how much of a one-day reading to believe.
"""
from __future__ import annotations

import warnings

import numpy as np
import pandas as pd

from . import design
from .calendar import Calendar
from .config import Config

warnings.filterwarnings("ignore", message="Mean of empty slice")
warnings.filterwarnings("ignore", message="All-NaN slice encountered")
warnings.filterwarnings("ignore", message="Degrees of freedom <= 0")

Z80, Z95 = 1.281552, 1.959964


def random_effects(y, s) -> dict:
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


def _delta(lp: pd.Series, ev_days, match_days, boot: int, rng, block: int):
    if len(ev_days) == 0 or len(match_days) < 4:
        return np.nan, np.nan, len(ev_days), len(match_days)
    le = lp.loc[ev_days].values
    lm = lp.loc[match_days].values
    delta = float(le.mean() - lm.mean())

    if boot <= 0:
        # analytic fallback for the backtest: variance of the difference of two
        # means, inflated for first-order serial correlation and capped
        infl = 1.0
        if len(np.concatenate([le, lm])) > 3:
            local = np.concatenate([le, lm])
            rho = float(np.corrcoef(local[:-1], local[1:])[0, 1])
            rho = float(np.clip(rho if np.isfinite(rho) else 0.0, 0.0, 0.9))
            infl = min((1 + rho) / (1 - rho) if rho < 1 else 1.0, 4.0)
        pool_sd = float(np.std(np.concatenate([le, lm]), ddof=1))
        v = pool_sd ** 2 * (1.0 / len(le) + 1.0 / len(lm))
        return delta, float(np.sqrt(max(v, 1e-8) * infl)), len(le), len(lm)

    local = np.concatenate([le, lm])
    ne, n = len(le), len(local)
    draws = np.empty(boot)
    for b in range(boot):
        idx = design.block_bootstrap_idx(n, block, rng)
        draws[b] = local[idx[:ne]].mean() - local[idx[ne:]].mean()
    return delta, float(np.std(draws, ddof=1)), ne, len(lm)


def estimate(prices: pd.Series, cal: Calendar, cfg: Config,
             cutoff: pd.Timestamp | None = None, boot: int | None = None,
             seed: int = 20261028) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Return (occurrence table, pooled event table).

    `cutoff` restricts to occurrences whose comparison window closes on or
    before that date — this is what keeps the backtest honest.
    """
    boot = cfg.bootstrap_reps if boot is None else boot
    rng = np.random.default_rng(seed)
    lp = np.log(prices.astype(float))

    occ_all = cal.discrete.copy()
    if cutoff is not None:
        occ_all = occ_all[occ_all["influence_end"]
                          + pd.Timedelta(days=cfg.match_days) <= pd.Timestamp(cutoff)]

    other_core = set(cal.daily.loc[(cal.daily.role == "core")
                                   & (~cal.daily.definition_id.isin(
                                       set(cal.occurrences.loc[cal.occurrences.is_regime, "definition_id"]))),
                                   "date"])

    rows = []
    for r in occ_all.itertuples():
        core = [d for d in pd.date_range(r.start_date, r.end_date) if d in lp.index]
        lead = [d for d in pd.date_range(r.lead_start, r.start_date - pd.Timedelta(days=1)) if d in lp.index]
        rec = [d for d in pd.date_range(r.end_date + pd.Timedelta(days=1), r.rec_end) if d in lp.index]
        infl = sorted(set(core) | set(lead) | set(rec))

        pre = pd.date_range(r.influence_start - pd.Timedelta(days=cfg.match_days),
                            r.influence_start - pd.Timedelta(days=1))
        post = pd.date_range(r.influence_end + pd.Timedelta(days=1),
                             r.influence_end + pd.Timedelta(days=cfg.match_days))
        match = [d for d in list(pre) + list(post) if d not in other_core and d in lp.index]

        d_core, se_core, n_core, n_match = _delta(lp, core, match, boot, rng, cfg.bootstrap_block_days)
        d_infl, se_infl, n_infl, _ = _delta(lp, infl, match, boot, rng, cfg.bootstrap_block_days)
        d_lead, _, n_lead, _ = _delta(lp, lead, match, 0, rng, cfg.bootstrap_block_days) if lead else (np.nan, 0, 0, len(match))
        d_rec, _, n_rec, _ = _delta(lp, rec, match, 0, rng, cfg.bootstrap_block_days) if rec else (np.nan, 0, 0, len(match))

        others = occ_all[(occ_all.definition_id != r.definition_id)
                         & (occ_all.start_date <= r.end_date)
                         & (occ_all.end_date >= r.start_date)]
        rows.append(dict(
            definition_id=r.definition_id, event=r.name, category=r.category, year=int(r.year),
            start_date=r.start_date, end_date=r.end_date,
            core_observed_days=n_core, matched_days=n_match,
            observed_core_price_inr=float(np.exp(lp.loc[core].mean())) if n_core else np.nan,
            matched_baseline_price_inr=float(np.exp(lp.loc[match].mean())) if n_match else np.nan,
            delta_core=d_core, se_core=se_core, delta_influence=d_infl, se_influence=se_infl,
            effect_lead_pct=(np.exp(d_lead) - 1) * 100 if np.isfinite(d_lead) else np.nan,
            effect_recovery_pct=(np.exp(d_rec) - 1) * 100 if np.isfinite(d_rec) else np.nan,
            lead_observed_days=n_lead, recovery_observed_days=n_rec, influence_observed_days=n_infl,
            date_confidence=r.date_confidence,
            overlaps_with=", ".join(sorted(set(others.definition_id))),
        ))
    oc = pd.DataFrame(rows)
    if oc.empty:
        return oc, pd.DataFrame()

    # ---- pool occurrences per event ---------------------------------------
    pooled = []
    for eid, d in oc.groupby("definition_id"):
        rc = random_effects(d["delta_core"], d["se_core"])
        ri = random_effects(d["delta_influence"], d["se_influence"])
        pooled.append(dict(definition_id=eid, event=d["event"].iloc[0], category=d["category"].iloc[0],
                           n_occ=rc["n"], delta_core=rc["mu"], se_core=rc["se"],
                           delta_influence=ri["mu"], se_influence=ri["se"]))
    pl = pd.DataFrame(pooled)

    # ---- category pooling + empirical-Bayes shrinkage ----------------------
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

    tb = cfg.shrinkage_tau_between ** 2
    for c in cat.index:
        if np.isfinite(cat.loc[c, "mu"]) and np.isfinite(cat.loc[c, "se"]):
            w = 1 / max(cat.loc[c, "se"], 1e-6) ** 2
            cat.loc[c, "mu_shrunk"] = (w * cat.loc[c, "mu"]) / (w + 1 / tb)
            cat.loc[c, "se_shrunk"] = float(np.sqrt(1 / (w + 1 / tb)))

    post = []
    for _, r in pl.iterrows():
        c = r["category"]
        mu = float(cat.loc[c, "mu_shrunk"]) if c in cat.index else 0.0
        se_cat = float(cat.loc[c, "se_shrunk"]) if c in cat.index else float(np.sqrt(tb))
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

    # ---- descriptive columns ---------------------------------------------
    pl["core_observed_days"] = pl["definition_id"].map(oc.groupby("definition_id")["core_observed_days"].sum())
    pl["influence_observed_days"] = pl["definition_id"].map(
        oc.groupby("definition_id")["influence_observed_days"].sum())
    pl["occ_min_pct"] = pl["definition_id"].map(
        (np.exp(oc["delta_core"]) - 1).groupby(oc["definition_id"]).min() * 100)
    pl["occ_max_pct"] = pl["definition_id"].map(
        (np.exp(oc["delta_core"]) - 1).groupby(oc["definition_id"]).max() * 100)
    pl["observed_price_inr"] = pl["definition_id"].map(
        oc.groupby("definition_id")["observed_core_price_inr"].mean())
    pl["baseline_price_inr"] = pl["observed_price_inr"] / np.exp(pl["delta_core"])
    pl["median_lead_pct"] = pl["definition_id"].map(oc.groupby("definition_id")["effect_lead_pct"].median())
    pl["median_recovery_pct"] = pl["definition_id"].map(
        oc.groupby("definition_id")["effect_recovery_pct"].median())
    pl["overlap_share_pct"] = pl["definition_id"].map(
        oc.groupby("definition_id")["overlaps_with"].apply(lambda s: float((s != "").mean() * 100)))

    oc["effect_core_pct"] = (np.exp(oc["delta_core"]) - 1) * 100
    oc["effect_influence_pct"] = (np.exp(oc["delta_influence"]) - 1) * 100
    return oc, pl.sort_values("definition_id").reset_index(drop=True)


def reliability(n_occ: int, days: int, has_estimate: bool) -> str:
    if not has_estimate:
        return "E"
    if n_occ >= 8 and days >= 30:
        return "A"
    if n_occ >= 4 and days >= 15:
        return "B"
    if n_occ >= 2 and days >= 5:
        return "C"
    return "D"


def effects_dict(pl: pd.DataFrame) -> dict[str, float]:
    return dict(zip(pl["definition_id"], pl["delta_shrunk"]))


def standard_errors(pl: pd.DataFrame) -> dict[str, float]:
    return dict(zip(pl["definition_id"], pl["se_shrunk"]))
