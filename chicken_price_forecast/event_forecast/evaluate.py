"""Fixed-protocol comparison of the finalists.

Run:  PYTHONPATH=. .venv/bin/python -m event_forecast.evaluate --prices <series.json>

Prices are read from an MCP-verified snapshot so the run is reproducible offline.
Nothing here writes to the database or the production payload.
"""
from __future__ import annotations

import argparse
import dataclasses
import json
from pathlib import Path

import numpy as np
import pandas as pd

from event_forecast.calendar_data import EventCalendar
from event_forecast.model import Config, fit
from event_forecast.uncertainty import calibrate

PROTOCOL = {
    "version": "finalists-2026-11-21",
    "origins": "1st and 15th monthly, 2026-04-01 .. 2026-10-15",
    "maxHorizon": 60,
    "minimumTraining": 183,
    "availability": "reconstructed: revised history and predictable calendars; not original publication vintages",
    "selection": "no retuning after scores; simplest defensible model that is not materially worse",
}
VARIANTS = {
    "ar1": "reassessment AR(1) on log price",
    "production_anchor_events": "production equation via reassessment backtest path",
    "event_ar": "this challenger, no annual term",
    "event_ar_annual": "this challenger with weak annual harmonic",
    "annual_only": "calendar + weekdays only, no event features (isolation control)",
}


def load_prices(path):
    blob = json.loads(Path(path).read_text())
    dates = pd.DatetimeIndex(blob["dates"])
    return pd.Series(np.asarray(blob["prices"], float), index=dates)


def reassessment_predictions(train, future):
    from reassessment.models import predict_all
    bundle = predict_all(train, future, _base_calendar(), keys=("ar1", "old_anchor_events"))
    if bundle.failures:
        raise RuntimeError(bundle.failures)
    return {k: np.exp(v) for k, v in bundle.predictions.items()}


def _base_calendar():
    from cp_pipeline.calendar import load
    from cp_pipeline.config import DEFAULT_EVENTS
    return load(DEFAULT_EVENTS)


def origin_dates(prices, config):
    months = pd.date_range("2026-04-01", "2026-10-15", freq="MS")
    dates = sorted(set(months.tolist() + [m + pd.Timedelta(days=14) for m in months]))
    return [d for d in dates if len(prices.loc[:d]) >= config.minimum_training
            and d < prices.index[-1]]


def run(prices, calendar=None, config=None):
    calendar, config = calendar or EventCalendar.load(), config or Config()
    records = []
    for origin in origin_dates(prices, config):
        train = prices.loc[:origin]
        future = pd.date_range(origin + pd.Timedelta(days=1),
                               min(origin + pd.Timedelta(days=PROTOCOL["maxHorizon"]),
                                   prices.index[-1]))
        base = reassessment_predictions(train, future)
        fitted = {
            "event_ar": (calendar, config),
            "event_ar_annual": (calendar, dataclasses.replace(config, annual=True)),
            "annual_only": (calendar.shifted(0), dataclasses.replace(
                config, annual=True, event_penalty=1e9)),
        }
        paths = {"ar1": base["ar1"], "production_anchor_events": base["old_anchor_events"]}
        for name, (cal, cfg) in fitted.items():
            model = fit(train, cal, cfg)
            paths[name] = model.predict(future).prediction
            if name == "event_ar":
                paths["event_ar_shift28"] = fit(
                    train, cal.shifted(28), cfg).predict(future).prediction
        for name, values in paths.items():
            for h, (d, p) in enumerate(zip(future, values), 1):
                records.append(dict(origin=origin, date=d, horizon=h, model=name,
                                    prediction=float(p), actual=float(prices[d])))
    return pd.DataFrame(records)


def _stats(d):
    e = d.prediction - d.actual
    return {
        "n": int(len(d)), "origins": int(d.origin.nunique()),
        "dates": int(d.date.nunique()),
        "mae": float(e.abs().mean()), "rmse": float(np.sqrt((e ** 2).mean())),
        "bias": float(e.mean()),
    }


def summarise(raw, calendar):
    windows = [7, 14, 30, 60]
    rows = []
    for h in windows:
        d = raw[raw.horizon <= h]
        for model, g in d.groupby("model"):
            rows.append({"window": f"1-{h}", **{"model": model}, **_stats(g)})
    for model in raw.model.unique():
        d = raw[(raw.model == model) & (raw.origin >= pd.Timestamp("2026-09-01"))]
        rows.append({"window": "late-1-30", "model": model, **_stats(d[d.horizon <= 30])})
    return pd.DataFrame(rows)


def additional_checks(raw, calendar):
    out = {}
    peaks = raw[raw.actual >= 110]
    out["peakUnderprediction"] = {
        m: {"bias": float((g.prediction - g.actual).mean()), "mae": float((g.prediction - g.actual).abs().mean())}
        for m, g in peaks.groupby("model")}
    core = calendar.design(pd.DatetimeIndex(raw.date.unique()))[1]
    event_days = set()
    for group in ("festival", "observance", "islamic", "fair", "sawan", "ramadan"):
        idx = core.index(f"{group}:core")
        x = calendar.design(pd.DatetimeIndex(raw.date.unique()))[0][:, idx]
        event_days.update(d for d, v in zip(raw.date.unique(), x) if v > 0)
    ev = raw[raw.date.isin(event_days) & (raw.horizon <= 30)]
    out["eventWindow1to30"] = {m: _stats(g) for m, g in ev.groupby("model")}
    stability = []
    for model, g in raw[raw.horizon <= 30].groupby("model"):
        wide = g.merge(g, on=["model", "date"], suffixes=("_a", "_b"))
        wide = wide[wide.origin_b > wide.origin_a]
        stability.append({"model": model,
                          "meanAbsRevision": float((wide.prediction_a - wide.prediction_b).abs().mean()),
                          "worstOriginMae": float(g.groupby("origin").apply(
                              lambda x: (x.prediction - x.actual).abs().mean(), include_groups=False).max())})
    out["stability"] = stability
    coverage = []
    for model in ("event_ar", "ar1"):
        g = raw[raw.model == model]
        scored = []
        for origin in sorted(g.origin.unique())[-3:]:
            mature = g[(g.origin < origin)]
            for horizon, band in zip(range(1, 61), calibrate(mature, origin, range(1, 61))):
                if band["q80"] is None:
                    continue
                rows = g[(g.origin == origin) & (g.horizon == horizon)]
                if rows.empty:
                    continue
                lo, hi = rows.prediction * np.exp(-band["q80"]), rows.prediction * np.exp(band["q80"])
                scored.append(float(((rows.actual >= lo) & (rows.actual <= hi)).mean()))
        coverage.append({"model": model, "coverage80": float(np.mean(scored)) if scored else None,
                         "scoredDays": len(scored),
                         "status": "empirical_dependent_calibration; small sample"})
    out["interval80"] = coverage
    return out


def _clean(value):
    """JSON-safe: non-finite floats become null rather than invalid JSON."""
    if isinstance(value, dict):
        return {k: _clean(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [_clean(v) for v in value]
    if isinstance(value, (float, np.floating)):
        return None if not np.isfinite(value) else float(value)
    if isinstance(value, (np.integer,)):
        return int(value)
    return value


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--prices", required=True)
    parser.add_argument("--out", default="outputs/event_forecast_comparison.json")
    args = parser.parse_args()
    prices = load_prices(args.prices)
    calendar = EventCalendar.load()
    raw = run(prices, calendar)
    summary = summarise(raw, calendar)
    payload = {
        "protocol": PROTOCOL,
        "variants": VARIANTS,
        "dataset": {"observations": len(prices),
                    "first": str(prices.index[0].date()), "last": str(prices.index[-1].date()),
                    "calendarFingerprint": calendar.fingerprint},
        "summary": summary.to_dict("records"),
        "checks": additional_checks(raw, calendar),
    }
    Path(args.out).parent.mkdir(parents=True, exist_ok=True)
    Path(args.out).write_text(json.dumps(_clean(payload), indent=2, allow_nan=False))
    print(summary.pivot(index="model", columns="window", values="mae").round(3).to_string())
    print("\npeak bias:", json.dumps(payload["checks"]["peakUnderprediction"], indent=1))
    mae = {(r["model"], r["window"]): r["mae"] for r in payload["summary"]}
    for window in ("1-30", "1-60"):
        print(f"falsification {window}: real {mae[('event_ar', window)]:.3f} "
              f"vs shifted+28d {mae[('event_ar_shift28', window)]:.3f}")
    print("wrote", args.out)


if __name__ == "__main__":
    main()
