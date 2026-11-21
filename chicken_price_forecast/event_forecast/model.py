"""Regularized calendar regression + AR(1) deviations; no annual term by default."""
from dataclasses import asdict, dataclass

import numpy as np
import pandas as pd

from event_forecast.calendar_data import EventCalendar


@dataclass(frozen=True)
class Config:
    version: str = "event-ar-v1"
    annual: bool = False
    event_penalty: float = 12.
    annual_penalty: float = .5
    weekday_penalty: float = 2.
    halo: int = 7
    iterations: int = 3
    rho_max: float = .995
    minimum_training: int = 183
    draws: int = 1000
    block_days: int = 7
    seed: int = 20261121

    def __post_init__(self):
        if (not 0 < self.rho_max < 1 or
            any(not np.isfinite(v) or v <= 0 for v in
                (self.event_penalty, self.annual_penalty, self.weekday_penalty)) or
            self.halo not in (7, 14) or self.iterations < 1 or self.draws < 1 or
            self.block_days < 1 or self.minimum_training < 30):
            raise ValueError("Invalid or unstable event model configuration")


def validate_prices(prices):
    if not isinstance(prices, pd.Series):
        raise ValueError("Expected a dated price Series")
    dates = pd.DatetimeIndex(prices.index)
    values = prices.to_numpy(dtype=float)
    if (not len(values) or dates.tz is not None or dates.has_duplicates or
        dates.hasnans or not dates.is_monotonic_increasing or
        not (dates == dates.normalize()).all() or
        not np.isfinite(values).all() or (values <= 0).any() or
        len(pd.date_range(dates[0], dates[-1])) != len(dates)):
        raise ValueError("Prices must be positive, finite and on a complete unique daily grid")
    return pd.Series(values, index=dates)


@dataclass
class Fitted:
    config: Config
    calendar: EventCalendar
    names: list
    beta: np.ndarray
    covariance: np.ndarray
    rho: float
    innovations: np.ndarray
    last_y: float
    last_x: np.ndarray
    cutoff: pd.Timestamp
    observations: int

    def predict(self, dates, *, tentative=True):
        dates = pd.DatetimeIndex(dates)
        if (not len(dates) or dates.tz is not None or dates.has_duplicates or
            dates[0] != self.cutoff + pd.Timedelta(days=1) or
            not dates.equals(pd.date_range(dates[0], dates[-1])) or
            dates[-1] > pd.Timestamp(self.calendar.end)):
            raise ValueError("Forecast must be the contiguous future grid inside calendar coverage")
        x, names = self.calendar.design(dates, annual=self.config.annual,
                                        halo=self.config.halo, tentative=tentative)
        if names != self.names:
            raise ValueError("Fitted design schema changed")
        seasonal = np.array([n.startswith("annual_") for n in names])
        events = np.array([":" in n for n in names])
        level = ~(seasonal | events)
        recent = (self.last_y - self.last_x @ self.beta) * self.rho ** np.arange(1, len(dates) + 1)
        result = pd.DataFrame({
            "date": dates, "horizon": np.arange(1, len(dates) + 1),
            "level_log": x[:, level] @ self.beta[level],
            "seasonal_log": x[:, seasonal] @ self.beta[seasonal],
            "event_log": x[:, events] @ self.beta[events], "recent_log": recent,
        })
        result["prediction"] = np.exp(result[["level_log", "seasonal_log", "event_log", "recent_log"]].sum(axis=1))
        if not np.isfinite(result.prediction).all() or (result.prediction <= 0).any():
            raise ValueError("Nonfinite forecast; challenger not issued")
        return result

    def diagnostics(self):
        return {
            "config": asdict(self.config), "rho": self.rho,
            "coefficients": dict(zip(self.names, self.beta.tolist())),
            "trainingCutoff": str(self.cutoff.date()), "trainingObservations": self.observations,
            "innovationSd": float(self.innovations.std()),
            "effectInterpretation": "Regularized conditional associations, not causal demand effects",
        }


def fit(prices, calendar=None, config=None):
    calendar, config = calendar or EventCalendar.load(), config or Config()
    prices = validate_prices(prices)
    if len(prices) < config.minimum_training:
        raise ValueError("Insufficient training observations")
    if prices.index[0] < pd.Timestamp(calendar.start) or prices.index[-1] > pd.Timestamp(calendar.end):
        raise ValueError("Training dates outside versioned calendar coverage")
    y = np.log(prices.to_numpy())
    x, names = calendar.design(prices.index, annual=config.annual, halo=config.halo)
    penalties = np.array([
        0 if n == "constant" else config.annual_penalty if n.startswith("annual_")
        else config.event_penalty if ":" in n else config.weekday_penalty for n in names
    ])
    rho = 0.
    for _ in range(config.iterations):
        xx, yy = x[1:] - rho * x[:-1], y[1:] - rho * y[:-1]
        precision = xx.T @ xx + np.diag(penalties)
        beta = np.linalg.solve(precision, xx.T @ yy)
        residual = y - x @ beta
        rho = float(np.clip(residual[:-1] @ residual[1:] /
                           max(residual[:-1] @ residual[:-1], 1e-10), 0, config.rho_max))
    innovations = residual[1:] - rho * residual[:-1]
    # Conditional Gaussian ridge approximation, not an exact Bayesian posterior.
    covariance = np.linalg.inv(precision) * max(float(innovations.var()), 1e-12)
    if not np.isfinite(beta).all() or not np.isfinite(covariance).all():
        raise ValueError("Unstable fit; challenger not issued")
    return Fitted(config, calendar, names, beta, covariance, rho,
                  innovations - innovations.mean(), float(y[-1]), x[-1],
                  prices.index[-1], len(prices))
