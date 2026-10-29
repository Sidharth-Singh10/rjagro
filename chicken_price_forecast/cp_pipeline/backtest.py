"""Chronological validation: rolling origins, metrics, interval calibration.

The only rule here is that a forecast may never see a price from after its
origin. Event effects are re-estimated at every origin for the same reason.
"""
from __future__ import annotations

import numpy as np
import pandas as pd

from . import events as ev
from . import models
from .calendar import Calendar
from .config import Config


def offsets(dates, effects: dict[str, float], windows: dict) -> np.ndarray:
    """Sum of shrunk log effects of every discrete event active on each date."""
    out = np.zeros(len(pd.DatetimeIndex(dates)))
    for i, d in enumerate(pd.DatetimeIndex(dates)):
        ids = windows.get(d)
        if ids:
            out[i] = sum(effects.get(k, 0.0) for k in ids)
    return out


def origins(prices: pd.Series, cfg: Config) -> list[pd.Timestamp]:
    """Month starts and mid-months between the configured bounds.

    Two origins a month keeps adjacent forecasts from sharing almost all of
    their test window, and both are inside the range where a full annual cycle
    of training data exists.
    """
    start = pd.Timestamp(cfg.origin_start)
    end = pd.Timestamp(cfg.origin_end)
    months = pd.date_range(start.replace(day=1), end.replace(day=1), freq="MS")
    candidates = sorted(set(months.to_list() + [m + pd.Timedelta(days=14) for m in months]))
    return [t for t in candidates
            if start <= t <= end and len(prices[prices.index <= t]) >= 200]


def run(prices: pd.Series, cal: Calendar, cfg: Config,
        boot: int = 300, verbose: bool = False) -> pd.DataFrame:
    """Score every registered candidate. Returns one row per origin/model/date."""
    windows = cal.core_windows()
    records = []
    for origin in origins(prices, cfg):
        train = prices[prices.index <= origin]
        future = pd.date_range(origin + pd.Timedelta(days=1),
                               origin + pd.Timedelta(days=cfg.max_horizon_days))
        future = future[future <= prices.index.max()]
        if len(future) == 0:
            continue

        _, pl = ev.estimate(train, cal, cfg, cutoff=origin, boot=boot)
        if pl.empty:
            fx, se = {}, {}
        else:
            fx, se = ev.effects_dict(pl), ev.standard_errors(pl)

        train_off = offsets(train.index, fx, windows)
        future_off = offsets(future, fx, windows)

        for key in cfg.candidates:
            model = models.get(key)
            pred = model.predict(train, future, train_offsets=train_off,
                                 future_offsets=future_off, cfg=cfg)
            actual = prices.reindex(future).values
            for d, p, a, o in zip(future, pred, actual, future_off):
                if not np.isfinite(a):
                    continue
                records.append({
                    "origin": origin, "date": d, "h": (d - origin).days, "model": key,
                    "actual": float(a), "pred": float(np.exp(p)),
                    "event_active": bool(o != 0),
                })
        if verbose:
            print(f"  origin {origin.date()}  train={len(train)}  forecast_days={len(future)}")

    return pd.DataFrame(records)


def summarise(bt: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    bt = bt.copy()
    bt["err"] = bt["pred"] - bt["actual"]
    bt["ae"] = bt["err"].abs()
    bt["ape"] = bt["ae"] / bt["actual"] * 100
    bt["sape"] = 200 * bt["ae"] / (bt["pred"].abs() + bt["actual"].abs())

    def _stats(d):
        return pd.Series({
            "n": len(d), "mae": d["ae"].mean(), "rmse": np.sqrt((d["err"] ** 2).mean()),
            "smape": d["sape"].mean(), "mape": d["ape"].mean(),
            "bias": d["err"].mean(), "bias_pct": d["err"].mean() / d["actual"].mean() * 100,
        })

    overall = bt.groupby("model").apply(_stats, include_groups=False).reset_index()
    bt["bucket"] = pd.cut(bt["h"], [0, 7, 28, 90], labels=["1-7d", "8-28d", "29-90d"])
    by_h = bt.groupby(["model", "bucket"], observed=True).apply(_stats, include_groups=False).reset_index()
    by_ev = bt.groupby(["model", "event_active"]).apply(_stats, include_groups=False).reset_index()
    return overall, by_h, by_ev


def select(cfg: Config, by_h: pd.DataFrame) -> str:
    """Winner by weighted sMAPE over the operational 1-28 day window."""
    operational = by_h[by_h.bucket.isin(["1-7d", "8-28d"])]
    score = operational.groupby("model").apply(
        lambda d: np.average(d["smape"], weights=d["n"]), include_groups=False)
    if cfg.primary_model != "best":
        if cfg.primary_model not in score.index:
            raise ValueError(f"pinned model {cfg.primary_model!r} was not backtested")
        return cfg.primary_model
    return str(score.sort_values().index[0])


def interval_curve(model_key: str, bt: pd.DataFrame, cfg: Config) -> dict:
    """sigma(h) = sigma0 * h**power, fitted to this model's own log errors."""
    sel = bt[bt.model == model_key].copy()
    sel["log_err"] = np.log(sel["pred"]) - np.log(sel["actual"])
    anchors = {}
    for h in (1, 7, 14, 28, 56, 90):
        d = sel[(sel["h"] - h).abs() <= 2]["log_err"]
        if len(d) >= 8:
            anchors[h] = float(d.std())
    hs = np.array(sorted(anchors))
    vs = np.array([anchors[k] for k in hs])
    fit = hs >= 7
    if fit.sum() >= 3:
        coef = np.polyfit(np.log(hs[fit]), np.log(vs[fit]), 1)
        power = float(np.clip(coef[0], cfg.interval_power_floor, cfg.interval_power_ceiling))
        sigma0 = float(np.exp(coef[1]))
    else:  # pragma: no cover - only with a very short backtest
        power, sigma0 = 0.35, float(sel["log_err"].std())

    return {"sigma0": sigma0, "power": power, "anchors": {int(k): round(v, 4) for k, v in anchors.items()}}


def sigma_of_h(h, sigma0: float, power: float, sigma_yoy: float) -> np.ndarray:
    h = np.asarray(h, float)
    return np.maximum(sigma0 * np.maximum(h, 1.0) ** power, sigma_yoy * np.sqrt(h / 365.0))


def year_over_year_dispersion(prices: pd.Series) -> tuple[float, int]:
    """Empirical sd of 12-month log changes; floors the long-horizon interval."""
    vals = []
    for t in prices.index:
        prev = prices[prices.index == t - pd.Timedelta(days=365)]
        if len(prev):
            vals.append(np.log(prices[t] / prev.iloc[0]))
    return (float(np.std(vals, ddof=1)) if len(vals) > 5 else 0.15), len(vals)
