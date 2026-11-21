"""January 2027 case study: published models vs the event-aware challenger.

Production and AR(1) figures are read from the live ledger for the same
training cutoff so the comparison uses what was actually published.
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
from event_forecast.uncertainty import period_summary, simulate

PERIODS = [
    ("December 2026", "2026-12-01", "2026-12-31"),
    ("Christmas–New Year", "2026-12-24", "2027-01-01"),
    ("January 1–7", "2027-01-01", "2027-01-07"),
    ("January 8–14", "2027-01-08", "2027-01-14"),
    ("January 15–21", "2027-01-15", "2027-01-21"),
    ("January 22–31", "2027-01-22", "2027-01-31"),
    ("February 1–14", "2027-02-01", "2027-02-14"),
    ("February 15–28", "2027-02-15", "2027-02-28"),
]


def load_prices(path):
    blob = json.loads(Path(path).read_text())
    return pd.Series(np.asarray(blob["prices"], float), index=pd.DatetimeIndex(blob["dates"]))


def path_table(model, dates, label):
    point = model.predict(dates)
    paths = simulate(model, dates)
    rows = []
    for name, a, b in PERIODS:
        mask = (dates >= pd.Timestamp(a)) & (dates <= pd.Timestamp(b))
        if not mask.any():
            continue
        idx = np.flatnonzero(mask)
        summary = period_summary(paths[:, idx], point.prediction.to_numpy()[idx])
        rows.append({
            "period": name, "model": label,
            "prediction": round(float(np.mean(point.prediction.to_numpy()[idx])), 2),
            "lo80": round(summary["lo80"], 2), "hi80": round(summary["hi80"], 2),
            "lo95": round(summary["lo95"], 2), "hi95": round(summary["hi95"], 2),
            "intervalStatus": summary["intervalStatus"],
            "meanEventLog": round(float(point.event_log.to_numpy()[idx].mean()), 5),
            "meanSeasonalLog": round(float(point.seasonal_log.to_numpy()[idx].mean()), 5),
            "meanRecentLog": round(float(point.recent_log.to_numpy()[idx].mean()), 5),
        })
    return rows


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--prices", required=True)
    parser.add_argument("--published", required=True, help="ledger values for existing/ar1")
    parser.add_argument("--out", default="outputs/january_2027.json")
    args = parser.parse_args()
    prices = load_prices(args.prices)
    calendar = EventCalendar.load()
    dates = pd.date_range(prices.index[-1] + pd.Timedelta(days=1), "2027-02-28")

    base = Config()
    rows = []
    for label, cfg, cal in (
        ("event_ar", base, calendar),
        ("event_ar_no_tentative", base, calendar),
        ("event_ar_annual", dataclasses.replace(base, annual=True), calendar),
    ):
        model = fit(prices, cal, cfg)
        table = path_table(model, dates, label)
        if label == "event_ar_no_tentative":
            # Recompute with tentative Islamic dates withheld.
            point = model.predict(dates, tentative=False)
            for row, (name, a, b) in zip(table, PERIODS):
                mask = (dates >= pd.Timestamp(a)) & (dates <= pd.Timestamp(b))
                row["prediction"] = round(float(point.prediction.to_numpy()[mask].mean()), 2)
        rows.extend(table)

    published = json.loads(Path(args.published).read_text())
    for name, a, b in PERIODS:
        for model in ("existing", "ar1"):
            value = published.get(model, {}).get(name)
            if value is not None:
                rows.append({"period": name, "model": model, "prediction": value,
                             "lo80": None, "hi80": None, "lo95": None, "hi95": None,
                             "intervalStatus": "published_native_or_empirical",
                             "meanEventLog": None, "meanSeasonalLog": None, "meanRecentLog": None})

    frame = pd.DataFrame(rows)
    Path(args.out).parent.mkdir(parents=True, exist_ok=True)
    Path(args.out).write_text(json.dumps({
        "trainingCutoff": str(prices.index[-1].date()),
        "calendarFingerprint": calendar.fingerprint,
        "periods": frame.to_dict("records"),
        "caveat": "Point forecasts averaged over each period. Weekly bands come from whole "
                  "simulated paths and are uncalibrated scenarios. Event contributions are "
                  "regularized conditional associations, not causal demand effects. "
                  "Pausha Purnima and Sakat Chauth carry no invented January premium.",
    }, indent=2))
    print(frame.pivot(index="period", columns="model", values="prediction").round(2).to_string())
    print("\ncomponents (event_ar)")
    print(frame[frame.model == "event_ar"][["period", "meanEventLog", "meanSeasonalLog",
                                            "meanRecentLog", "lo80", "hi80", "lo95", "hi95"]]
          .round(5).to_string(index=False))


if __name__ == "__main__":
    main()
