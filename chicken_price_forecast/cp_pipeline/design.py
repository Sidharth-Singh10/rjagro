"""Calendar features, regression helpers and the baseline model.

Pure functions over dates: no IO, no config beyond what is passed in. This is
the module a modeller replaces first if the seasonal specification changes.
"""
from __future__ import annotations

import math

import numpy as np
import pandas as pd

YEAR = 365.25


def trend(dates: pd.DatetimeIndex, origin: str = "2025-04-01") -> np.ndarray:
    return (pd.DatetimeIndex(dates) - pd.Timestamp(origin)).days.values / YEAR


def fourier(dates: pd.DatetimeIndex, k: int = 1, year: float = YEAR) -> pd.DataFrame:
    t = (pd.DatetimeIndex(dates) - pd.Timestamp("2025-01-01")).days.values.astype(float)
    out = {}
    for i in range(1, k + 1):
        out[f"sin{i}"] = np.sin(2 * np.pi * i * t / year)
        out[f"cos{i}"] = np.cos(2 * np.pi * i * t / year)
    return pd.DataFrame(out, index=dates)


def dow_dummies(dates: pd.DatetimeIndex) -> pd.DataFrame:
    d = pd.DataFrame({"dow": pd.DatetimeIndex(dates).dayofweek}, index=dates)
    X = pd.get_dummies(d["dow"], prefix="dow", drop_first=True).astype(float)
    for j in range(1, 7):
        col = f"dow_{j}"
        if col not in X.columns:
            X[col] = 0.0
    return X[sorted(X.columns)]


def design(dates, k: int, include_trend: bool, include_weekday: bool) -> pd.DataFrame:
    import statsmodels.api as sm
    parts = [pd.DataFrame(index=pd.DatetimeIndex(dates))]
    if include_trend:
        parts.append(pd.DataFrame({"trend": trend(dates)}, index=dates))
    parts.append(fourier(dates, k))
    if include_weekday:
        parts.append(dow_dummies(pd.DatetimeIndex(dates)))
    X = pd.concat(parts, axis=1)
    return sm.add_constant(X, has_constant="add")


def hac_ols(y, X, maxlags: int = 21):
    import statsmodels.api as sm
    return sm.OLS(np.asarray(y, float), np.asarray(X, float)).fit(
        cov_type="HAC", cov_kwds={"maxlags": maxlags, "use_correction": True})


def joint_wald(res, R: np.ndarray) -> dict:
    from scipy import stats
    b = np.asarray(res.params, float)
    V = np.asarray(res.cov_params(), float)
    Rb = R @ b
    M = R @ V @ R.T
    stat = float(Rb @ np.linalg.pinv(M) @ Rb)
    df = int(np.linalg.matrix_rank(M))
    return {"chi2": round(stat, 3), "df": df, "p": float(stats.chi2.sf(stat, df))}


def long_run_var(x: np.ndarray, maxlags: int) -> float:
    x = np.asarray(x, float) - np.mean(x)
    n = len(x)
    v = (x @ x) / n
    for lag in range(1, maxlags + 1):
        w = 1.0 - lag / (maxlags + 1)
        v += 2.0 * w * (x[lag:] @ x[:-lag]) / n
    return max(v, 1e-12)


def block_bootstrap_idx(n: int, block: int, rng: np.random.Generator) -> np.ndarray:
    nb = int(np.ceil(n / block))
    starts = rng.integers(0, n, nb)
    idx = np.concatenate([(np.arange(s, s + block) % n) for s in starts])
    return idx[:n]


# ---------------------------------------------------------------------------
# baseline model (descriptive statistics, not the forecast)
# ---------------------------------------------------------------------------
class BaselineModel:
    """log(price) ~ trend? + Fourier(k) + weekday, OLS with HAC errors."""

    def __init__(self, k: int = 1, include_trend: bool = False, include_weekday: bool = True,
                 maxlags: int = 21):
        self.k = k
        self.include_trend = include_trend
        self.include_weekday = include_weekday
        self.maxlags = maxlags

    def fit(self, series: pd.Series) -> "BaselineModel":
        self.dates_ = pd.DatetimeIndex(series.index)
        self.y_ = np.log(series.values.astype(float))
        self.X_ = design(self.dates_, self.k, self.include_trend, self.include_weekday)
        self.res_ = hac_ols(self.y_, self.X_.values, self.maxlags)
        self.coef_ = pd.Series(self.res_.params, index=self.X_.columns)
        self.se_ = pd.Series(self.res_.bse, index=self.X_.columns)
        self.resid_ = pd.Series(self.y_ - self.res_.fittedvalues, index=self.dates_)
        self.sigma_ = float(self.resid_.std(ddof=self.X_.shape[1]))
        lag = min(len(self.resid_) - 2, 7)
        self.phi_ = float(np.corrcoef(self.resid_.values[lag:], self.resid_.values[:-lag])[0, 1])
        self.r2_ = float(self.res_.rsquared)
        return self

    def describe(self) -> dict:
        p = float(self.coef_.get("trend", float("nan")))
        return {
            "r2": round(self.r2_, 4),
            "resid_sd_log": round(self.sigma_, 4),
            "ar1_residual": round(self.phi_, 3),
            "trend_pct_per_year": round((math.exp(p) - 1) * 100, 2) if np.isfinite(p) else None,
            "weekly_joint_p": self._joint(lambda c: c.startswith("dow_")),
            "annual_joint_p": self._joint(lambda c: c.startswith(("sin", "cos"))),
        }

    def _joint(self, pred) -> float | None:
        names = list(self.X_.columns)
        idx = [i for i, c in enumerate(names) if pred(c)]
        if not idx:
            return None
        R = np.zeros((len(idx), len(names)))
        for i, j in enumerate(idx):
            R[i, j] = 1
        return round(joint_wald(self.res_, R)["p"], 6)
