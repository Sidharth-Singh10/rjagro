"""Facts: every number the narrative and the app may use, and nothing else.

This module is the contract. If a number is not in here, no sentence in the
report and no label in the UI is allowed to state it. Facts are JSON-safe: NaN
becomes null, dates become ISO strings, money is rounded once.
"""
from __future__ import annotations

import math

import numpy as np
import pandas as pd

from . import events as ev
from .calendar import Calendar
from .config import Config
from .prices import PriceAudit

SCHEMA = 2


def num(x, nd: int = 1):
    if x is None:
        return None
    try:
        v = float(x)
    except (TypeError, ValueError):
        return None
    if not math.isfinite(v):
        return None
    return round(v, nd)


def _iso(d) -> str:
    return pd.Timestamp(d).date().isoformat()


def build(*, prices: pd.Series, audit: PriceAudit, cal: Calendar, pl: pd.DataFrame,
          bt_overall: pd.DataFrame, by_h: pd.DataFrame, by_ev: pd.DataFrame,
          selected: str, daily: pd.DataFrame, sigma: dict, sigma_yoy: float,
          cfg: Config) -> dict:
    widths = cal.definitions.set_index("id")["name"].to_dict()

    # ---- events ------------------------------------------------------------
    items = []
    for _, r in pl.iterrows():
        has = np.isfinite(r["delta_core"])
        items.append({
            "id": r["definition_id"],
            "name": r["event"],
            "category": r["category"],
            "hypothesis": cal.discrete.loc[
                cal.discrete.definition_id == r["definition_id"], "hypothesised_direction"
            ].iloc[0],
            "occurrences": int(r["n_occ"]),
            "observedDays": int(r["core_observed_days"]),
            "observedPrice": num(r["observed_price_inr"]),
            "baselinePrice": num(r["baseline_price_inr"]),
            "rawPct": num((np.exp(r["delta_core"]) - 1) * 100, 2) if has else None,
            "rawLo95": num((np.exp(r["delta_core"] - ev.Z95 * r["se_core"]) - 1) * 100, 2) if has else None,
            "rawHi95": num((np.exp(r["delta_core"] + ev.Z95 * r["se_core"]) - 1) * 100, 2) if has else None,
            "pooledPct": num((np.exp(r["delta_shrunk"]) - 1) * 100, 2),
            "pooledLo80": num((np.exp(r["delta_shrunk"] - ev.Z80 * r["se_shrunk"]) - 1) * 100, 2),
            "pooledHi80": num((np.exp(r["delta_shrunk"] + ev.Z80 * r["se_shrunk"]) - 1) * 100, 2),
            "reliability": ev.reliability(int(r["n_occ"]), int(r["core_observed_days"]), has),
            "note": None if has else "no usable quote in the window; category prior only",
        })
    items.sort(key=lambda e: e["pooledPct"] if e["pooledPct"] is not None else 0, reverse=True)

    categories = []
    for c, g in pl.groupby("category"):
        cats = ev.random_effects(g["delta_core"], g["se_core"])
        if not np.isfinite(cats["mu"]):
            continue
        w = 1 / max(cats["se"], 1e-6) ** 2
        tb = cfg.shrinkage_tau_between ** 2
        mu = (w * cats["mu"]) / (w + 1 / tb)
        se = float(np.sqrt(1 / (w + 1 / tb)))
        categories.append({
            "category": c,
            "occurrences": int(cats["n"]),
            "rawPct": num((np.exp(cats["mu"]) - 1) * 100, 2),
            "pooledPct": num((np.exp(mu) - 1) * 100, 2),
            "lo95": num((np.exp(mu - ev.Z95 * se) - 1) * 100, 2),
            "hi95": num((np.exp(mu + ev.Z95 * se) - 1) * 100, 2),
        })
    categories.sort(key=lambda c: c["pooledPct"], reverse=True)

    # ---- forecast ----------------------------------------------------------
    d = daily.copy()
    daily_rows = [{
        "date": _iso(r.date),
        "forecast": num(r.forecast),
        "baseline": num(r.baseline),
        "impactPct": num(r.impact_pct, 2),
        "lo80": num(r.lo80),
        "hi80": num(r.hi80),
        "lo95": num(r.lo95),
        "hi95": num(r.hi95),
        "events": [e for e in str(r.events).split(", ") if e],
        "grade": r.grade,
    } for r in d.itertuples()]

    # ---- future occurrences of discrete events ----------------------------
    windows = cal.core_windows()
    fx = ev.effects_dict(pl)
    se = ev.standard_errors(pl)
    occurrences = []

    hist = pl.set_index("definition_id") if len(pl) else None

    def _event_grade(eid: str) -> str:
        if hist is None or eid not in hist.index:
            return "E"
        r = hist.loc[eid]
        return ev.reliability(int(r["n_occ"]), int(r["core_observed_days"]),
                              bool(np.isfinite(r["delta_core"])))
    horizon = pd.DatetimeIndex(d.date)
    for r in cal.discrete.itertuples():
        core = [x for x in pd.date_range(r.start_date, r.end_date) if x in set(horizon)]
        if not core:
            continue
        sub = d[d.date.isin(core)]
        offsets = [sum(fx.get(k, 0.0) for k in windows.get(x, [])) for x in core]
        ses = [float(np.sqrt(sum(se.get(k, 0) ** 2 for k in windows.get(x, [])))) for x in core]
        mean_off = float(np.mean(offsets))
        mean_se = float(np.mean(ses))
        occurrences.append({
            "id": r.definition_id,
            "name": r.name,
            "category": r.category,
            "start": _iso(r.start_date),
            "end": _iso(r.end_date),
            "days": int(len(core)),
            "mean": num(sub.forecast.mean()),
            "baseline": num(sub.baseline.mean()),
            "impactPct": num((np.exp(mean_off) - 1) * 100, 2),
            "impactLo80": num((np.exp(mean_off - ev.Z80 * mean_se) - 1) * 100, 2),
            "impactHi80": num((np.exp(mean_off + ev.Z80 * mean_se) - 1) * 100, 2),
            "reliability": _event_grade(r.definition_id),
            "occurrences": int(pl.loc[pl.definition_id == r.definition_id, "n_occ"].iloc[0])
                           if (pl.definition_id == r.definition_id).any() else 0,
            "overlaps": sorted({k for x in core for k in windows.get(x, []) if k != r.definition_id}),
        })
    occurrences.sort(key=lambda o: o["start"])

    base_peak = d.loc[d.baseline.idxmax()]
    base_trough = d.loc[d.baseline.idxmin()]
    worst = d.loc[d.forecast.idxmin()]
    last = d.iloc[-1]
    first = d.iloc[0]

    # ---- validation --------------------------------------------------------
    models_rows = [{
        "model": r.model, "n": int(r.n), "mae": num(r.mae, 2), "rmse": num(r.rmse, 2),
        "smape": num(r.smape, 2), "bias": num(r.bias, 2), "biasPct": num(r.bias_pct, 2),
    } for r in bt_overall.sort_values("smape").itertuples()]

    horizon_rows = [{
        "model": r.model, "bucket": str(r.bucket), "smape": num(r.smape, 2),
    } for r in by_h.itertuples()]

    event_rows = [{
        "model": r.model, "eventWindow": bool(r.event_active), "smape": num(r.smape, 2),
        "n": int(r.n),
    } for r in by_ev.itertuples()]

    def _smape(bucket: str) -> float | None:
        v = by_h[(by_h.model == selected) & (by_h.bucket == bucket)]["smape"]
        return float(v.iloc[0]) if len(v) else None

    return {
        "schema": SCHEMA,
        "data": {
            "observations": audit.observations,
            "first": audit.first,
            "last": audit.last,
            "spanDays": audit.span_days,
            "missingDays": audit.missing_days,
            "missingPct": audit.missing_pct,
            "gapRuns": audit.gap_runs,
            "longestGap": audit.longest_gap,
            "gaps": audit.gaps[:20],
            "mean": audit.mean,
            "median": audit.median,
            "min": audit.minimum,
            "max": audit.maximum,
            "unchangedPct": audit.unchanged_pct,
            "dailyChangeSdPct": audit.daily_change_sd_pct,
            "source": audit.source,
        },
        "events": {"items": items, "categories": categories},
        "forecast": {
            "start": _iso(first.date),
            "end": _iso(last.date),
            "days": int(len(d)),
            "first": num(first.forecast),
            "lastCentral": num(last.forecast),
            "lastBaseline": num(last.baseline),
            "lastLo95": num(last.lo95),
            "lastHi95": num(last.hi95),
            "peak": {"date": _iso(base_peak.date), "value": num(base_peak.baseline)},
            "trough": {"date": _iso(base_trough.date), "value": num(base_trough.baseline)},
            "deepestEventDay": {
                "date": _iso(worst.date), "value": num(worst.forecast),
                "impactPct": num(worst.impact_pct, 2),
                "events": [e for e in str(worst.events).split(", ") if e],
            },
            "eventDays": int((d.impact_pct != 0).sum()),
            "eventOccurrences": occurrences,
            "daily": daily_rows,
            "monthly": [{"month": r.month, "forecast": num(r.forecast), "baseline": num(r.baseline)}
                        for r in d.assign(month=d.date.dt.strftime("%Y-%m"))
                        .groupby("month").agg(forecast=("forecast", "mean"), baseline=("baseline", "mean"))
                        .reset_index().itertuples()],
        },
        "validation": {
            "models": models_rows,
            "byHorizon": horizon_rows,
            "eventWindow": event_rows,
            "selected": selected,
            "smape1to7": num(_smape("1-7d"), 2),
            "smape8to28": num(_smape("8-28d"), 2),
            "smape29to90": num(_smape("29-90d"), 2),
            "sigma": {"sigma0": num(sigma["sigma0"], 4), "power": num(sigma["power"], 3),
                      "anchors": sigma["anchors"]},
            "yoySd": num(sigma_yoy, 4),
        },
        "model": {"key": selected, "configHash": cfg.fingerprint()},
        "names": {k: widths.get(k, k) for k in widths},
    }
