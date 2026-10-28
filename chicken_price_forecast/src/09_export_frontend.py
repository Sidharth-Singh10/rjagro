"""Step 09 - export the forecast for the web app.

Writes `rjagro_frontend/app/data/price_forecast.json`, the single artefact the
Analytics tab reads. Keeping the export in the pipeline (rather than hand
editing JSON) means the UI can only ever show numbers that the validated model
produced.

The observed history is deliberately *not* duplicated here: the app already
ships `chicken_rates.json` for that.

Outputs
    ../rjagro_frontend/app/data/price_forecast.json
    outputs/tables/event_impact_statistics.md   (audit trail, mirrored in docs/)
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd

import cplib as cp

FRONTEND = cp.ROOT.parent / "rjagro_frontend"
TARGET = FRONTEND / "app" / "data" / "price_forecast.json"
DOCS = FRONTEND / "docs" / "event-impact-statistics.md"

daily = pd.read_csv(cp.TABLES / "daily_forecast.csv", parse_dates=["date"])
imp = pd.read_csv(cp.TABLES / "historical_event_impact.csv")
evf = pd.read_csv(cp.TABLES / "event_forecasts.csv")
summary = pd.read_csv(cp.TABLES / "model_backtest_summary.csv")
by_h = pd.read_csv(cp.TABLES / "model_backtest_by_horizon.csv")
run = json.loads((cp.LOGS / "forecast_run.json").read_text())

history_last = str(cp.observed_prices().index.max().date())


def num(x, nd=1):
    """JSON-safe rounded float (None for NaN)."""
    if x is None or (isinstance(x, float) and not np.isfinite(x)):
        return None
    return round(float(x), nd)


def txt(x):
    return None if (x is None or (isinstance(x, float) and not np.isfinite(x))) else str(x)


# ---------------------------------------------------------------------------
# daily forecast
# ---------------------------------------------------------------------------
daily_out = []
for r in daily.itertuples():
    daily_out.append({
        "date": r.date.date().isoformat(),
        "forecast": num(r.forecast_inr),
        "baseline": num(r.baseline_inr),
        "impactPct": num(r.event_impact_pct, 2),
        "lo80": num(r.pi80_lo),
        "hi80": num(r.pi80_hi),
        "lo95": num(r.pi95_lo),
        "hi95": num(r.pi95_hi),
        "events": [e for e in str(r.events_active).split(", ") if e and e != "nan"],
        "grade": r.forecast_reliability.split(" - ")[0],
    })

# ---------------------------------------------------------------------------
# historical event estimates (one row per event definition)
# ---------------------------------------------------------------------------
occc = pd.read_csv(cp.TABLES / "historical_event_occurrences.csv", parse_dates=["start_date", "end_date"])
# only occurrences that are fully inside the price sample, so the table never
# shows a "last occurrence" that has not happened yet
occc = occc[occc["end_date"] <= pd.Timestamp(history_last)]
span = occc.groupby("definition_id").agg(first=("start_date", "min"), last=("end_date", "max"))

events_out = []
for r in imp.itertuples():
    events_out.append({
        "id": r.definition_id,
        "name": r.event,
        "category": r.category,
        "hypothesis": r.hypothesised_direction,
        "occurrences": int(r.n_occurrences_with_observed_prices),
        "days": int(r.n_observed_days_core),
        "observedPrice": num(r.observed_mean_price_inr),
        "baselinePrice": num(r.estimated_baseline_price_inr),
        "absoluteImpact": num(r.estimated_absolute_impact_inr),
        "rawPct": num(r.raw_effect_pct, 2),
        "rawLo95": num(r.raw_ci95_lo_pct, 2),
        "rawHi95": num(r.raw_ci95_hi_pct, 2),
        "pooledPct": num(r.shrunk_effect_pct, 2),
        "pooledLo80": num(r.shrunk_ci80_lo_pct, 2),
        "pooledHi80": num(r.shrunk_ci80_hi_pct, 2),
        "reliability": r.reliability.split(" - ")[0],
        "reliabilityLabel": r.reliability.split(" - ", 1)[1] if " - " in r.reliability else "",
        "note": txt(r.notes),
        "firstDate": span.loc[r.definition_id, "first"].date().isoformat() if r.definition_id in span.index else None,
        "lastDate": span.loc[r.definition_id, "last"].date().isoformat() if r.definition_id in span.index else None,
    })
events_out.sort(key=lambda e: e["pooledPct"] if e["pooledPct"] is not None else 0)

# ---------------------------------------------------------------------------
# future event occurrences
# ---------------------------------------------------------------------------
future_out = []
for r in evf.itertuples():
    future_out.append({
        "id": r.definition_id,
        "name": r.event,
        "category": r.category,
        "start": r.start_date,
        "end": r.end_date,
        "dateConfidence": r.date_confidence,
        "coreDays": int(r.forecast_core_days),
        "meanPrice": num(r.event_period_mean_inr),
        "baselinePrice": num(r.baseline_period_mean_inr),
        "impactPct": num(r.impact_pct, 2),
        "impactInr": num(r.impact_inr),
        "impactLo80": num(r.impact_pct_ci80_lo, 2),
        "impactHi80": num(r.impact_pct_ci80_hi, 2),
        "reliability": r.reliability.split(" - ")[0],
        "occurrences": int(r.n_historical_occurrences),
        "days": int(r.n_historical_observed_days),
        "overlaps": [x for x in str(r.overlaps_with).split(", ") if x and x != "nan"],
    })

# ---------------------------------------------------------------------------
# backtest headline
# ---------------------------------------------------------------------------
selected = "seasonal_anchor_events"
hh = by_h[by_h.model == selected].set_index("bucket")["smape"]
best = summary.sort_values("smape").iloc[0]
payload = {
    "meta": {
        "generatedAt": "2026-10-28",
        "source": "chicken_price_forecast pipeline (src/09_export_frontend.py)",
        "unit": "INR/kg",
        "market": "Uttar Pradesh (statewide wholesale)",
        "dataThrough": history_last,
        "forecastStart": daily["date"].min().date().isoformat(),
        "forecastEnd": daily["date"].max().date().isoformat(),
        "model": "seasonal anchor (one annual harmonic + weekday) + empirical-Bayes event offsets",
        "intervalMeaning": "80% and 95% prediction intervals for an individual daily price; "
                           "the 95% band widens to about 45% of the central value by December 2027",
        "backtest": {
            "models": int(summary["model"].nunique()),
            "scoredDays": int(summary["n"].max()),
            "origins": len(run["origins"]),
            "originRange": [run["origins"][0], run["origins"][-1]],
            "smape1to7": num(hh.get("1-7d"), 1),
            "smape8to28": num(hh.get("8-28d"), 1),
            "smape29to90": num(hh.get("29-90d"), 1),
            "smapeAll": num(float(summary.loc[summary.model == selected, "smape"].iloc[0]), 1),
            "bestModel": str(best["model"]),
            "bestSmape": num(float(best["smape"]), 1),
        },
    },
    "daily": daily_out,
    "events": events_out,
    "eventForecasts": future_out,
}

TARGET.parent.mkdir(parents=True, exist_ok=True)
TARGET.write_text(json.dumps(payload, separators=(",", ":"), allow_nan=False))
print(f"wrote {TARGET.relative_to(cp.ROOT.parent)} "
      f"({TARGET.stat().st_size / 1024:.0f} KB, {len(daily_out)} days, "
      f"{len(events_out)} events, {len(future_out)} future occurrences)")

# ---------------------------------------------------------------------------
# audit document (same numbers, human readable)
# ---------------------------------------------------------------------------
def pct(v):
    return "—" if v is None or not np.isfinite(v) else f"{v:+.1f}%"


def inr(v):
    return "—" if v is None or not np.isfinite(v) else f"{v:.1f}"


lines = [
    "# Event impact statistics",
    "",
    "Generated by `chicken_price_forecast/src/09_export_frontend.py` from the",
    "validated model outputs. Every figure on the Analytics tab comes from here.",
    "",
    f"- Data through **{history_last}**; forecast **{payload['meta']['forecastStart']} → "
    f"{payload['meta']['forecastEnd']}** ({len(daily_out)} days).",
    f"- Model: {payload['meta']['model']}.",
    f"- Rolling-origin backtest over {payload['meta']['backtest']['scoredDays']} scored days: "
    f"sMAPE {payload['meta']['backtest']['smape1to7']}% (1–7d), "
    f"{payload['meta']['backtest']['smape8to28']}% (8–28d), "
    f"{payload['meta']['backtest']['smape29to90']}% (29–90d).",
    "",
    "## Estimated event association",
    "",
    "Matched-window event study: each occurrence is compared with a symmetric",
    "14-day window either side, excluding the core days of other discrete events.",
    "Uncertainty is a 7-day block bootstrap (2,000 replications); occurrence",
    "effects are pooled with a random-effects model and shrunk toward a pooled",
    "category effect. `raw` is the unpooled estimate, `pooled` is the shrunk one",
    "used by the forecast. Grades: A well evidenced, B moderate, C weak,",
    "D very weak, E no usable evidence.",
    "",
    "| event | category | n occ | n days | observed | baseline | raw | 95% CI | pooled | 80% CI | grade |",
    "|---|---|---|---|---|---|---|---|---|---|---|",
]
for e in sorted(events_out, key=lambda x: (x["pooledPct"] is None, -(x["pooledPct"] or 0))):
    ci_raw = "—" if e["rawPct"] is None else f"{pct(e['rawLo95'])} to {pct(e['rawHi95'])}"
    ci_pool = "—" if e["pooledPct"] is None else f"{pct(e['pooledLo80'])} to {pct(e['pooledHi80'])}"
    lines.append(
        f"| {e['name']} | {e['category']} | {e['occurrences']} | {e['days']} | "
        f"{inr(e['observedPrice'])} | {inr(e['baselinePrice'])} | "
        f"{pct(e['rawPct'])} | {ci_raw} | {pct(e['pooledPct'])} | {ci_pool} | {e['reliability']} |")

lines += [
    "",
    "## Forecast under each event",
    "",
    "| event | dates | days | forecast mean | baseline | impact | 80% CI | grade |",
    "|---|---|---|---|---|---|---|---|",
]
for f in sorted(future_out, key=lambda x: x["start"]):
    lines.append(
        f"| {f['name']} | {f['start']} → {f['end']} | {f['coreDays']} | "
        f"{f['meanPrice']:.1f} | {f['baselinePrice']:.1f} | {pct(f['impactPct'])} | "
        f"{pct(f['impactLo80'])} to {pct(f['impactHi80'])} | {f['reliability']} |")

lines += [
    "",
    "## Reading the forecast",
    "",
    "The baseline is a model counterfactual with every discrete event effect",
    "switched off; it is not an observed price. Overlapping events compound",
    "multiplicatively, so an impact shown for one event on a shared date includes",
    "the other event's offset. Intervals cover an individual daily price, not the",
    "mean path.",
    "",
]
DOCS.parent.mkdir(parents=True, exist_ok=True)
DOCS.write_text("\n".join(lines))
print(f"wrote {DOCS.relative_to(cp.ROOT.parent)}")
