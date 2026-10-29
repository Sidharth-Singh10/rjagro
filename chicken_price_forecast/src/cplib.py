"""Shared utilities for the UP wholesale chicken price analysis.

All heavy lifting (IO, event calendars, design matrices, robust inference,
metrics) lives here so that the numbered pipeline scripts stay short and
auditable.
"""
from __future__ import annotations

import json
import math
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import pandas as pd

# --------------------------------------------------------------------------
# Paths and constants
# --------------------------------------------------------------------------
ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw"
PROC = ROOT / "data" / "processed"
TABLES = ROOT / "outputs" / "tables"
CHARTS = ROOT / "outputs" / "charts"
LOGS = ROOT / "logs"

for _p in (PROC, TABLES, CHARTS, LOGS):
    _p.mkdir(parents=True, exist_ok=True)

# The tracker is supplied as a full replacement each time it is updated. The
# previous extract is kept alongside it for the audit trail, but only the
# current one is read. To switch files, change this one line.
PRICE_CSV = RAW / "RATE TRACKER - Chicken Rate Updated 29⁄10.csv"
EVENT_JSON = RAW / "up_chicken_events.json"

MARKET = "Uttar Pradesh (statewide wholesale)"
UNIT = "INR per kg live weight"
PRODUCT = "Chicken, wholesale sold rate"

# Forecast window. FORECAST_START is derived from the data at the bottom of
# this module (first day after the last quoted day); the literal here is only a
# placeholder so the name exists while the rest of the module is defined.
FORECAST_START = pd.Timestamp("2026-10-24")
FORECAST_END = pd.Timestamp("2027-12-31")

# Annual cycle length used for Fourier terms
YEAR = 365.25

# Events treated as broad seasonal regimes rather than discrete shocks.
# They overlap the annual cycle almost completely and cannot be identified
# separately from generic seasonality with 1.5 years of data.
REGIME_EVENTS = {
    "summer-heat",
    "monsoon",
    "winter-fog",
    "sawan",
    "ramadan",
    "magh-mela",
    "heatwave-2025",
}

CATEGORY_ORDER = ["festival", "observance", "islamic", "wedding", "fair", "seasonal"]


# --------------------------------------------------------------------------
# Price data
# --------------------------------------------------------------------------
def load_prices() -> pd.DataFrame:
    """Read the raw tracker CSV exactly as supplied.

    Returns a frame with every *date row* in the file (including rows whose
    price cell is blank) so that missingness can be audited rather than
    silently dropped.
    """
    raw = pd.read_csv(
        PRICE_CSV,
        skiprows=3,          # two title rows + header row
        header=None,
        names=["date_raw", "rate_raw"],
        dtype=str,
        keep_default_na=False,
    )
    raw["date" ] = pd.to_datetime(raw["date_raw"].str.strip(), format="%d-%b-%Y", errors="coerce")
    raw["rate_raw"] = raw["rate_raw"].str.strip()
    raw["price"] = pd.to_numeric(raw["rate_raw"].replace("", np.nan), errors="coerce")
    raw = raw.dropna(subset=["date"]).sort_values("date").reset_index(drop=True)
    return raw


def observed_prices() -> pd.Series:
    """Series of observed prices indexed by date (NaN rows dropped)."""
    df = load_prices()
    s = df.dropna(subset=["price"]).set_index("date")["price"].astype(float)
    return s[~s.index.duplicated(keep="first")].sort_index()


# --------------------------------------------------------------------------
# Events
# --------------------------------------------------------------------------
@dataclass
class EventTables:
    definitions: pd.DataFrame        # one row per event definition
    occurrences: pd.DataFrame        # one row per occurrence (with windows)
    daily: pd.DataFrame              # long: date, definition_id, role


def load_event_calendar() -> EventTables:
    """Flatten the supplied event calendar and add lead-in / recovery windows."""
    blob = json.loads(EVENT_JSON.read_text())
    defs = pd.DataFrame(blob["definitions"])
    occ = pd.DataFrame(blob["occurrences"])

    occ["start_date"] = pd.to_datetime(occ["start_date"])
    occ["end_date"] = pd.to_datetime(occ["end_date"])
    occ["duration_days"] = (occ["end_date"] - occ["start_date"]).dt.days + 1

    # Window widths: short shocks get a 2 day halo, medium 1 day, long
    # regimes none (their halo is inside the window already).
    def halo(d: int) -> tuple[int, int]:
        if d <= 7:
            return 2, 2
        if d <= 31:
            return 1, 1
        return 0, 0

    h = occ["duration_days"].map(halo)
    occ["lead_days"] = [x[0] for x in h]
    occ["rec_days"] = [x[1] for x in h]
    occ["lead_start"] = occ["start_date"] - pd.to_timedelta(occ["lead_days"], unit="D")
    occ["rec_end"] = occ["end_date"] + pd.to_timedelta(occ["rec_days"], unit="D")
    occ["influence_start"] = occ["lead_start"]
    occ["influence_end"] = occ["rec_end"]
    occ["is_regime"] = occ["definition_id"].isin(REGIME_EVENTS)

    occ = occ.merge(
        defs[["id", "name", "category", "expected_price_impact", "impact_confidence",
              "recurrence", "impact_mechanism", "description", "location_scope"]],
        left_on="definition_id", right_on="id", how="left",
    ).rename(columns={"expected_price_impact": "hypothesised_direction",
                      "impact_confidence": "calendar_confidence"})
    occ = occ.sort_values(["start_date", "definition_id"]).reset_index(drop=True)

    rows = []
    for _, r in occ.iterrows():
        for d in pd.date_range(r.lead_start, r.rec_end):
            if d < r.start_date:
                role = "lead"
            elif d > r.end_date:
                role = "recovery"
            else:
                role = "core"
            rows.append((d, r.definition_id, role))
    daily = pd.DataFrame(rows, columns=["date", "definition_id", "role"]).drop_duplicates()
    return EventTables(defs, occ, daily)


def event_dummy(occ: pd.DataFrame, dates: pd.DatetimeIndex, role: str = "core",
                defs: set | None = None) -> pd.DataFrame:
    """0/1 design columns, one per event definition, over `dates`."""
    ids = sorted(set(occ["definition_id"])) if defs is None else sorted(defs)
    X = pd.DataFrame(0, index=dates, columns=ids, dtype=float)
    for _, r in occ.iterrows():
        if r.definition_id not in X.columns:
            continue
        if role == "core":
            a, b = r.start_date, r.end_date
        elif role == "influence":
            a, b = r.influence_start, r.influence_end
        elif role == "lead":
            a, b = r.lead_start, r.start_date - pd.Timedelta(days=1)
        elif role == "recovery":
            a, b = r.end_date + pd.Timedelta(days=1), r.rec_end
        else:
            raise ValueError(role)
        X.loc[a:b, r.definition_id] = 1.0
    return X.loc[dates]


# --------------------------------------------------------------------------
# Calendar features
# --------------------------------------------------------------------------
def fourier(dates: pd.DatetimeIndex, k: int = 2, year: float = YEAR) -> pd.DataFrame:
    origin = pd.Timestamp("2025-01-01")
    t = (dates - origin).days.values.astype(float)
    out = {}
    for i in range(1, k + 1):
        out[f"sin{i}"] = np.sin(2 * np.pi * i * t / year)
        out[f"cos{i}"] = np.cos(2 * np.pi * i * t / year)
    return pd.DataFrame(out, index=dates)


def dow_dummies(dates: pd.DatetimeIndex) -> pd.DataFrame:
    d = pd.DataFrame({"dow": dates.dayofweek}, index=dates)
    X = pd.get_dummies(d["dow"], prefix="dow", drop_first=True).astype(float)
    for j in range(1, 7):          # guarantee a stable column set
        c = f"dow_{j}"
        if c not in X:
            X[c] = 0.0
    return X[sorted(X.columns)]


def trend(dates: pd.DatetimeIndex, origin: str | pd.Timestamp = "2025-04-01") -> np.ndarray:
    o = pd.Timestamp(origin)
    return ((dates - o).days.values.astype(float)) / YEAR      # in years


# --------------------------------------------------------------------------
# Inference helpers
# --------------------------------------------------------------------------
def hac_ols(y, X, maxlags: int = 21):
    """OLS with Newey-West (Bartlett) standard errors."""
    import statsmodels.api as sm
    return sm.OLS(np.asarray(y, float), np.asarray(X, float)).fit(
        cov_type="HAC", cov_kwds={"maxlags": maxlags, "use_correction": True}
    )


def long_run_var(x: np.ndarray, maxlags: int) -> float:
    """Newey-West long-run variance of a zero-mean series."""
    x = np.asarray(x, float) - np.mean(x)
    n = len(x)
    v = (x @ x) / n
    for L in range(1, maxlags + 1):
        w = 1.0 - L / (maxlags + 1)
        v += 2.0 * w * (x[L:] @ x[:-L]) / n
    return max(v, 1e-12)


def mean_se(x: np.ndarray, maxlags: int = 7) -> tuple[float, float]:
    """Mean and HAC standard error of the mean (serial-correlation robust)."""
    x = np.asarray(x, float)
    if len(x) == 0:
        return np.nan, np.nan
    m = x.mean()
    if len(x) == 1:
        return m, np.nan
    v = long_run_var(x, min(maxlags, len(x) - 1))
    return m, math.sqrt(v / len(x))


def block_bootstrap_idx(n: int, block: int, rng: np.random.Generator) -> np.ndarray:
    """Indices for a circular block bootstrap of length n."""
    nb = int(np.ceil(n / block))
    starts = rng.integers(0, n, nb)
    idx = np.concatenate([(np.arange(s, s + block) % n) for s in starts])
    return idx[:n]


# --------------------------------------------------------------------------
# Metrics
# --------------------------------------------------------------------------
def smape(a, f) -> float:
    a, f = np.asarray(a, float), np.asarray(f, float)
    denom = (np.abs(a) + np.abs(f))
    ok = denom > 0
    return float(np.mean(200.0 * np.abs(f[ok] - a[ok]) / denom[ok]))


def metrics(actual, pred) -> dict:
    a, f = np.asarray(actual, float), np.asarray(pred, float)
    e = f - a
    return {
        "n": int(len(a)),
        "mae": float(np.mean(np.abs(e))),
        "rmse": float(np.sqrt(np.mean(e ** 2))),
        "smape": smape(a, f),
        "bias": float(np.mean(e)),
        "mape": float(np.mean(np.abs(e) / a) * 100),
    }


# --------------------------------------------------------------------------
# IO
# --------------------------------------------------------------------------
def write_table(df: pd.DataFrame, name: str, float_fmt: str = "%.4f") -> Path:
    p = TABLES / name
    df.to_csv(p, index=False, float_format=float_fmt)
    return p


def json_dump(obj, name: str) -> Path:
    p = LOGS / name
    p.write_text(json.dumps(obj, indent=2, default=str))
    return p


def fmt_inr(x: float, dec: int = 1) -> str:
    return f"{x:,.{dec}f}"


# --------------------------------------------------------------------------
# Design matrices
# --------------------------------------------------------------------------
def build_design(dates: pd.DatetimeIndex, k_fourier: int = 2,
                 include_trend: bool = True, include_dow: bool = True) -> pd.DataFrame:
    """Deterministic calendar design: Fourier annual terms, weekday, trend."""
    parts = [pd.DataFrame(index=dates)]
    if include_trend:
        parts.append(pd.DataFrame({"trend": trend(dates)}, index=dates))
    parts.append(fourier(dates, k=k_fourier))
    if include_dow:
        parts.append(dow_dummies(dates))
    X = pd.concat(parts, axis=1)
    return X


def add_const(X: pd.DataFrame) -> pd.DataFrame:
    import statsmodels.api as sm
    return sm.add_constant(X, has_constant="add")


class BaselineModel:
    """log(price) ~ trend + Fourier(k) + weekday, OLS with HAC errors.

    Also carries an AR(1) coefficient for the residuals, used for short-horizon
    forecast correction and for interval simulation.
    """

    def __init__(self, k_fourier: int = 2, include_trend: bool = True,
                 include_dow: bool = True, maxlags: int = 21):
        self.k_fourier = k_fourier
        self.include_trend = include_trend
        self.include_dow = include_dow
        self.maxlags = maxlags

    def _X(self, dates):
        return add_const(build_design(pd.DatetimeIndex(dates), self.k_fourier,
                                      self.include_trend, self.include_dow))

    def fit(self, s: pd.Series):
        self.dates_ = pd.DatetimeIndex(s.index)
        self.y_ = np.log(s.values.astype(float))
        self.X_ = self._X(self.dates_)
        self.res_ = hac_ols(self.y_, self.X_.values, self.maxlags)
        self.coef_ = pd.Series(self.res_.params, index=self.X_.columns)
        self.se_ = pd.Series(self.res_.bse, index=self.X_.columns)
        self.resid_ = pd.Series(self.y_ - self.res_.fittedvalues, index=self.dates_)
        self.sigma_ = float(self.resid_.std(ddof=self.X_.shape[1]))
        lag = min(len(self.resid_) - 2, 7)
        self.phi_ = float(np.corrcoef(self.resid_.values[lag:], self.resid_.values[:-lag])[0, 1])
        self.r2_ = float(self.res_.rsquared)
        return self

    def predict_log(self, dates):
        X = self._X(dates)
        X = X.reindex(columns=self.X_.columns, fill_value=0.0)
        return X.values @ self.res_.params

    def predict(self, dates):
        return np.exp(self.predict_log(dates))


def joint_wald(res, R: np.ndarray) -> dict:
    """Wald chi-square test of R @ beta = 0 using the fitted (HAC) covariance."""
    b = np.asarray(res.params, float)
    V = np.asarray(res.cov_params(), float)
    Rb = R @ b
    M = R @ V @ R.T
    stat = float(Rb @ np.linalg.pinv(M) @ Rb)
    from scipy import stats
    df = int(np.linalg.matrix_rank(M))
    return {"chi2": round(stat, 3), "df": df, "p": float(stats.chi2.sf(stat, df))}


# --------------------------------------------------------------------------
# Derived horizon (must be last: it depends on load_prices)
# --------------------------------------------------------------------------
_last_observed = observed_prices().index.max()
FORECAST_START = _last_observed + pd.Timedelta(days=1)
if FORECAST_START >= FORECAST_END:      # pragma: no cover - guard for future updates
    raise ValueError(
        f"last observation {_last_observed.date()} leaves no horizon before {FORECAST_END.date()}"
    )
