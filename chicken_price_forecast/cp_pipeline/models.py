"""Forecast models behind one protocol.

A model sees a training series, the dates to predict, and the event offsets for
training and future dates. It returns log prices. Nothing else about the
pipeline is visible to it, which is the whole point: swapping the equation means
adding a class and a registry line.

The baseline ("what prices would be without events") is not a separate code
path — it is the same fitted model asked to predict with zero offsets.
"""
from __future__ import annotations

from typing import Protocol

import numpy as np
import pandas as pd

from . import design
from .config import Config


class ForecastModel(Protocol):
    key: str
    def predict(self, train: pd.Series, future: pd.DatetimeIndex, *,
                train_offsets: np.ndarray, future_offsets: np.ndarray,
                cfg: Config) -> np.ndarray:
        """Log-price prediction for every date in `future`."""


# ---------------------------------------------------------------------------
# seasonal anchor: level + annual shape + weekday
# ---------------------------------------------------------------------------
def _anchor_predict(y_log: pd.Series, future: pd.DatetimeIndex, cfg: Config) -> np.ndarray:
    """Fit the calendar model on a log-price series and re-anchor its level."""
    dates = pd.DatetimeIndex(y_log.index)
    X = design.design(dates, cfg.fourier_harmonics, cfg.include_trend, cfg.include_weekday)
    beta = np.linalg.lstsq(X.values, y_log.values, rcond=None)[0]
    resid = y_log.values - X.values @ beta

    Xf = design.design(future, cfg.fourier_harmonics, cfg.include_trend, cfg.include_weekday)
    Xf = Xf.reindex(columns=X.columns, fill_value=0.0)
    if cfg.include_trend:
        # damped: extrapolating a fitted trend is what breaks at 1.5 cycles
        o = pd.Timestamp("2025-04-01")
        t_last = (dates.max() - o).days / design.YEAR
        t_f = (pd.DatetimeIndex(future) - o).days / design.YEAR
        Xf["trend"] = t_last
    pred = Xf.values @ beta
    return pred + float(resid[-cfg.anchor_observations:].mean())


class AnchorModel:
    key = "anchor"
    def predict(self, train, future, *, train_offsets, future_offsets, cfg):
        y = pd.Series(np.log(train.values), index=train.index)
        return _anchor_predict(y, future, cfg)


class AnchorEventsModel(AnchorModel):
    key = "anchor_events"
    def predict(self, train, future, *, train_offsets, future_offsets, cfg):
        adjusted = pd.Series(np.log(train.values) - train_offsets, index=train.index)
        return _anchor_predict(adjusted, future, cfg) + future_offsets


# ---------------------------------------------------------------------------
# moving average
# ---------------------------------------------------------------------------
class Ma7Model:
    key = "ma7"
    def predict(self, train, future, *, train_offsets, future_offsets, cfg):
        return np.full(len(future), np.log(train.values[-7:]).mean())


class Ma7EventsModel(Ma7Model):
    key = "ma7_events"
    def predict(self, train, future, *, train_offsets, future_offsets, cfg):
        return np.full(len(future), np.log(train.values[-7:]).mean()) + future_offsets


# ---------------------------------------------------------------------------
# ETS benchmark (needs an evenly spaced series, so gaps are bridged)
# ---------------------------------------------------------------------------
class EtsWeeklyModel:
    key = "ets_weekly"
    def predict(self, train, future, *, train_offsets, future_offsets, cfg):
        from statsmodels.tsa.holtwinters import ExponentialSmoothing
        s = train.reindex(pd.date_range(train.index.min(), train.index.max(), freq="D"))
        s = s.interpolate(limit_area="inside").ffill()
        m = ExponentialSmoothing(
            np.log(s.values), trend="add", damped_trend=True, seasonal="add",
            seasonal_periods=7, initialization_method="estimated",
        ).fit()
        return np.asarray(m.forecast(len(future)))


REGISTRY: dict[str, ForecastModel] = {
    m.key: m() for m in (
        AnchorModel, AnchorEventsModel, Ma7Model, Ma7EventsModel, EtsWeeklyModel,
    )
}


def get(key: str) -> ForecastModel:
    if key not in REGISTRY:
        raise KeyError(f"unknown model {key!r}; known: {sorted(REGISTRY)}")
    return REGISTRY[key]


def register(model: ForecastModel) -> None:
    """Used by tests and by future models; no other module needs changing."""
    REGISTRY[model.key] = model
