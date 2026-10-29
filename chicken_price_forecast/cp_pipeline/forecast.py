"""Assemble the published path: baseline, event-adjusted, intervals.

One model, evaluated twice — once with the event offsets and once without — so
the baseline is a counterfactual from the same fit rather than a second model.
"""
from __future__ import annotations

import numpy as np
import pandas as pd

from . import backtest, events as ev, models
from .calendar import Calendar
from .config import Config

Z80, Z95 = 1.281552, 1.959964


def horizon_dates(last_observed: pd.Timestamp, cfg: Config) -> pd.DatetimeIndex:
    end = pd.Timestamp(cfg.horizon_end)
    start = last_observed + pd.Timedelta(days=1)
    if start >= end:
        raise ValueError(f"last observation {last_observed.date()} leaves no horizon before {end.date()}")
    return pd.date_range(start, end, freq="D")


def build(prices: pd.Series, cal: Calendar, cfg: Config, pl: pd.DataFrame,
          model_key: str, sigma: dict, sigma_yoy: float) -> pd.DataFrame:
    windows = cal.core_windows()
    fx = ev.effects_dict(pl)
    se = ev.standard_errors(pl)

    future = horizon_dates(prices.index.max(), cfg)
    train_off = backtest.offsets(prices.index, fx, windows)
    fut_off = backtest.offsets(future, fx, windows)
    zero = np.zeros(len(future))

    model = models.get(model_key)
    adj_log = model.predict(prices, future, train_offsets=train_off,
                            future_offsets=fut_off, cfg=cfg)
    base_log = model.predict(prices, future, train_offsets=train_off,
                             future_offsets=zero, cfg=cfg)

    h = np.arange(1, len(future) + 1)
    sig = backtest.sigma_of_h(h, sigma["sigma0"], sigma["power"], sigma_yoy)
    event_se = np.array([
        float(np.sqrt(sum(se.get(k, 0.0) ** 2 for k in windows.get(d, []))))
        for d in future
    ])
    sig_event = np.sqrt(sig ** 2 + event_se ** 2)

    df = pd.DataFrame({
        "date": future,
        "baseline": np.exp(base_log),
        "forecast": np.exp(adj_log),
        "impact_pct": (np.exp(fut_off) - 1) * 100,
        "lo80": np.exp(adj_log - Z80 * sig_event),
        "hi80": np.exp(adj_log + Z80 * sig_event),
        "lo95": np.exp(adj_log - Z95 * sig_event),
        "hi95": np.exp(adj_log + Z95 * sig_event),
        "sigma": sig_event,
        "events": [", ".join(sorted(windows.get(d, []))) for d in future],
        "horizon_days": h,
    })
    df["event_impact_inr"] = df["forecast"] - df["baseline"]
    df["grade"] = np.select(
        [df.horizon_days <= 90, df.horizon_days <= 210],
        ["A", "B"], default="C")
    return df


def monthly(df: pd.DataFrame) -> pd.DataFrame:
    m = df.copy()
    m["month"] = m["date"].dt.strftime("%Y-%m")
    return (m.groupby("month")
            .agg(forecast=("forecast", "mean"), baseline=("baseline", "mean"))
            .reset_index())
