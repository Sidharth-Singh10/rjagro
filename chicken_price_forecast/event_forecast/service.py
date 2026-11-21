"""One candidate issuance, reusable by the existing ledger and offline evaluation."""
from dataclasses import asdict
import hashlib
import importlib.metadata
import json
import logging
from pathlib import Path
import platform

import numpy as np
import pandas as pd

from event_forecast.calendar_data import EventCalendar
from event_forecast.model import Config, fit, validate_prices
from event_forecast.uncertainty import calibrate, period_summary, simulate

log = logging.getLogger("event-forecast")


def definition(config=None, calendar=None):
    config, calendar = config or Config(), calendar or EventCalendar.load()
    files = {p.name: hashlib.sha256(p.read_bytes()).hexdigest()
             for p in sorted(Path(__file__).parent.glob("*.py"))
             if not p.name.startswith("test_")}
    document = {
        "model": "event_ar_v1", "role": "challenger", "config": asdict(config),
        "calendarHash": calendar.fingerprint, "sourceHashes": files,
        "python": platform.python_version(),
        "packages": {k: importlib.metadata.version(k) for k in ("numpy", "pandas")},
        "dailyCalibration": "matured absolute log errors; unique dates; >=4 origins/30 dates; buckets 7/14/30/60",
        "weeklyIntervals": "whole-path innovation block bootstrap and conditional ridge parameter scenarios; uncalibrated",
        "promotion": "never automatic; incumbent remains published",
    }
    key = hashlib.sha256(json.dumps(document, sort_keys=True).encode()).hexdigest()
    return key, document


def calibration_errors(prices, calendar, config):
    months = pd.date_range(prices.index[0] + pd.Timedelta(days=365),
                           prices.index[-1], freq="MS")
    origins = sorted(set(months.tolist() + [m + pd.Timedelta(days=14) for m in months]))
    rows = []
    for origin in [o for o in origins if o < prices.index[-1]][-12:]:
        future = pd.date_range(origin + pd.Timedelta(days=1),
                               min(origin + pd.Timedelta(days=60), prices.index[-1]))
        pred = fit(prices.loc[:origin], calendar, config).predict(future)
        for row in pred.itertuples():
            rows.append(dict(origin=origin, date=row.date, horizon=row.horizon,
                             prediction=row.prediction, actual=float(prices[row.date])))
    return pd.DataFrame(rows)


def _compact(records, weekly, archive):
    """Round floats and drop repeated band metadata; keep the full forensic path only on disk."""
    bands = {}
    for r in records:
        bands.setdefault(r["intervalStatus"], dict(calibrationDates=r["calibrationDates"],
                                                   calibrationOrigins=r["calibrationOrigins"]))
    daily = []
    for r in records:
        # Round components first, then derive the stored central value from them, so the
        # expose explanation reconciles exactly with the archived prediction.
        parts = {k: round(r[k], 5) for k in
                 ("levelLog", "seasonalLog", "eventLog", "recentLog")}
        daily.append({
            "date": r["date"],
            "prediction": round(float(np.exp(sum(parts.values()))), 2),
            **parts,
            "lo80": round(r["lo80"], 2), "hi80": round(r["hi80"], 2),
            "lo95": round(r["lo95"], 2), "hi95": round(r["hi95"], 2),
            "intervalStatus": r["intervalStatus"],
        })
    weeks = [{k: (round(v, 2) if isinstance(v, float) else v) for k, v in w.items()}
             for w in weekly]
    return daily, weeks, bands


def build(prices, *, end="2027-12-31", calendar=None, config=None, archive=False):
    prices = validate_prices(prices)
    calendar, config = calendar or EventCalendar.load(), config or Config()
    model = fit(prices, calendar, config)
    dates = pd.date_range(model.cutoff + pd.Timedelta(days=1), end)
    point = model.predict(dates)
    paths = simulate(model, dates)
    errors = calibration_errors(prices, calendar, config)
    calibration = calibrate(errors, model.cutoff, point.horizon)
    records = []
    for j, r in enumerate(point.itertuples()):
        band = calibration[j]
        sampled = np.quantile(np.abs(np.log(paths[:, j] / r.prediction)), [.8, .95])
        q80, q95 = ((band["q80"], band["q95"]) if band["q80"] is not None else sampled)
        # Beyond measured 60-day support, retain explicit growing scenario widths.
        if r.horizon > 60:
            q80, q95 = np.maximum(sampled, np.array([.1, .15]) * np.sqrt(r.horizon / 60))
        records.append(dict(
            date=str(r.date.date()), horizon=r.horizon, prediction=r.prediction,
            levelLog=r.level_log, seasonalLog=r.seasonal_log,
            eventLog=r.event_log, recentLog=r.recent_log,
            lo80=float(r.prediction * np.exp(-q80)), hi80=float(r.prediction * np.exp(q80)),
            lo95=float(r.prediction * np.exp(-q95)), hi95=float(r.prediction * np.exp(q95)),
            intervalStatus=band["status"], calibrationDates=band["dates"],
            calibrationOrigins=band["origins"],
        ))
    weekly = []
    for start in range(0, len(dates) - 6, 7):
        stop = start + 7
        weekly.append(dict(start=str(dates[start].date()), end=str(dates[stop - 1].date()),
                           **period_summary(paths[:, start:stop], point.prediction[start:stop])))
    key, protocol = definition(config, calendar)
    no_tentative = model.predict(dates, tentative=False)
    daily, weeks, bands = _compact(records, weekly, archive)
    result = {
        "status": "ready", "model": "event_ar_v1", "name": "Event-aligned AR-error challenger",
        "role": "challenger", "version": config.version, "fingerprint": key,
        "trainingCutoff": str(model.cutoff.date()),
        "datasetHash": hashlib.sha256(prices.to_csv().encode()).hexdigest(),
        "calendarHash": calendar.fingerprint,
        # Batch metadata keeps the assumption record, not a 68 KB duplicate calendar.
        "calendar": (calendar.documents() if not archive else dict(
            version=calendar.overlay["version"], verifiedAt=calendar.overlay["verifiedAt"],
            hash=calendar.fingerprint, corrections=calendar.overlay["corrections"],
            unmodelled=calendar.overlay["unmodelled"],
            limitations=calendar.overlay["limitations"])),
        "intervalBands": bands,
        "protocol": protocol, "metadata": {**model.diagnostics(), "promotion": "not_promoted"},
        "daily": daily, "weekly": weeks,
        "tentativeDateSensitivityMaxInr": round(float(np.max(np.abs(
            point.prediction - no_tentative.prediction))), 2),
        "caveat": "Median-like log-model central path. Components add in logs, not INR. "
                  "Historical calendar availability is reconstructed. Daily empirical bands have "
                  "dependent calibration; unsupported daily and all weekly intervals are scenarios. "
                  "New-year observances with no replicated response have no invented premium.",
    }
    # Refuse non-JSON numbers before anything can be archived.
    json.dumps(result, allow_nan=False)
    return result


def safe_build(prices, **kwargs):
    """Never raises: a candidate failure must not affect the published cohort."""
    try:
        return build(prices, **kwargs)
    except Exception as exc:  # noqa: BLE001 - explicit fallback contract for a sidecar
        log.exception("Event challenger unavailable; incumbent output is unchanged")
        return {"status": "unavailable", "model": "event_ar_v1",
                "error": f"{type(exc).__name__}: candidate fit, calendar or uncertainty failed",
                "incumbentUnchanged": True}
