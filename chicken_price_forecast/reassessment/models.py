"""Small predeclared model set; one fit per origin, no model search."""
from __future__ import annotations

import warnings
from dataclasses import dataclass

import numpy as np
import pandas as pd

from cp_pipeline import backtest as old_bt, events as old_ev, models as old_models
from cp_pipeline.config import Config
from reassessment.core import SEED, calendar_design, lag_features

KEYS = ("naive", "ma7", "snaive7", "ets_damped", "ets_weekly", "arima110", "ar1",
        "dynamic", "dynamic_events", "hgb", "ensemble", "old_anchor", "old_anchor_events")


def event_design(dates, cal):
    """Shared category effects in lead/core/recovery; overlapping events explicit.

    Seven-day halos are a prespecified alternative, not data-selected boundaries.
    Long regimes/weather shocks are excluded: annual shape is tested separately.
    Multiple simultaneous occurrences of one category/phase count once.
    """
    dates = pd.DatetimeIndex(dates)
    categories = sorted(cal.discrete.category.unique())
    cols = [(c, role) for c in categories for role in ("lead", "core", "recovery")]
    x = np.zeros((len(dates), len(cols)))
    for r in cal.discrete.itertuples():
        for role, start, end in [
            ("lead", r.start_date-pd.Timedelta(days=7), r.start_date-pd.Timedelta(days=1)),
            ("core", r.start_date, r.end_date),
            ("recovery", r.end_date+pd.Timedelta(days=1), r.end_date+pd.Timedelta(days=7))]:
            x[(dates >= start) & (dates <= end), cols.index((r.category, role))] = 1
    return x, cols


def dynamic_fit(s, future, cal, with_events):
    """Penalized feasible GLS with AR(1) residuals, three fixed iterations.

    Conditional associations, not causal effects. Future residual decays from
    the last training residual; event-off predictions keep the same fitted state.
    """
    y = np.log(s.to_numpy())
    x, xf = calendar_design(s.index), calendar_design(future)
    penalty = [0, .5, .5] + [2]*6
    if with_events:
        z, names = event_design(s.index, cal)
        zf, _ = event_design(future, cal)
        x, xf = np.column_stack([x,z]), np.column_stack([xf,zf])
        penalty += [12]*z.shape[1]
    else:
        zf, names = np.empty((len(future),0)), []
    rho = 0.0
    for _ in range(3):
        xx, yy = x[1:]-rho*x[:-1], y[1:]-rho*y[:-1]
        beta = np.linalg.solve(xx.T@xx + np.diag(penalty), xx.T@yy)
        residual = y-x@beta
        rho = float(np.clip(residual[:-1]@residual[1:] / max(residual[:-1]@residual[:-1],1e-10),0,.995))
    h = np.arange(1,len(future)+1)
    pred = xf@beta + residual[-1]*rho**h
    effect = zf@beta[-zf.shape[1]:] if with_events else np.zeros(len(future))
    return pred, pred-effect, dict(zip((f"{c}:{r}" for c,r in names), beta[9:])), rho


@dataclass
class FitBundle:
    predictions: dict
    baselines: dict
    model_sd: dict
    metadata: dict
    failures: list


def predict_all(train, future, cal, keys=KEYS):
    """Only `train` is accepted: caller cannot pass future observations here."""
    future = pd.DatetimeIndex(future)
    if not len(future) or len(train)<30 or future[0] != train.index[-1]+pd.Timedelta(days=1):
        raise ValueError("Forecast must start one day after last training observation")
    if len(pd.date_range(train.index[0],train.index[-1])) != len(train):
        raise ValueError("This experimental model comparison requires a complete daily grid; do not interpolate")
    n = len(future)
    y = np.log(train.to_numpy())
    pred, base, sd, meta, failures = {}, {}, {}, {}, []
    old_fx = None
    for key in keys:
        try:
            with warnings.catch_warnings(record=True) as recorded:
                warnings.simplefilter("always")
                if key == "naive":
                    p = np.full(n,y[-1])
                elif key == "ma7":
                    p = np.full(n,y[-7:].mean())
                elif key == "snaive7":
                    p = np.resize(y[-7:], n)
                elif key in ("ets_damped", "ets_weekly"):
                    from statsmodels.tsa.holtwinters import ExponentialSmoothing
                    weekly = key == "ets_weekly"
                    fit = ExponentialSmoothing(y, trend="add", damped_trend=True,
                        seasonal="add" if weekly else None,
                        seasonal_periods=7 if weekly else None,
                        initialization_method="estimated").fit()
                    p = np.asarray(fit.forecast(n))
                elif key == "arima110":
                    from statsmodels.tsa.arima.model import ARIMA
                    fit = ARIMA(y, order=(1,1,0), trend="n").fit()
                    p = np.asarray(fit.forecast(n))
                    sd[key] = np.asarray(fit.get_forecast(n).se_mean)
                elif key == "ar1":
                    from statsmodels.tsa.ar_model import AutoReg
                    fit = AutoReg(y, lags=1, trend="c").fit()
                    intercept, phi = fit.params
                    clipped = float(np.clip(phi, 0, .995))
                    # Re-estimate intercept conditional on constrained phi.
                    intercept = float(np.mean(y[1:]-clipped*y[:-1]))
                    equilibrium = intercept/(1-clipped)
                    h = np.arange(1,n+1)
                    p = equilibrium + clipped**h*(y[-1]-equilibrium)
                    innovation = float(np.std(y[1:]-intercept-clipped*y[:-1],ddof=2))
                    sd[key] = innovation*np.sqrt((1-clipped**(2*h))/(1-clipped**2))
                    meta[key] = dict(phi=clipped,equilibrium=float(np.exp(equilibrium)),innovation_sd=innovation)
                elif key in ("dynamic", "dynamic_events"):
                    p,b,coeff,rho = dynamic_fit(train,future,cal,key.endswith("events"))
                    base[key] = b
                    meta[key] = dict(category_phase_coefficients=coeff, residual_phi=rho)
                elif key == "hgb":
                    from sklearn.ensemble import HistGradientBoostingRegressor
                    x = lag_features(train).dropna()
                    fit = HistGradientBoostingRegressor(max_iter=80,max_leaf_nodes=7,
                        min_samples_leaf=25,learning_rate=.05,l2_regularization=10,
                        early_stopping=False,random_state=SEED).fit(x,np.log(train.loc[x.index]))
                    # Recursion uses predictions, never actual future lags.
                    history = train.copy()
                    values = []
                    for d in future:
                        history.loc[d] = np.nan
                        row = lag_features(history.iloc[-40:]).iloc[[-1]]
                        v = float(fit.predict(row)[0])
                        history.loc[d] = np.exp(v)
                        values.append(v)
                    p = np.array(values)
                elif key == "ensemble":
                    p = np.log((np.exp(pred["naive"])+np.exp(pred["ar1"]))/2)
                elif key.startswith("old_"):
                    if old_fx is None:
                        _, pl = old_ev.estimate(train,cal,Config(),cutoff=train.index[-1],boot=300)
                        old_fx = old_ev.effects_dict(pl) if len(pl) else {}
                    windows = cal.core_windows()
                    off = old_bt.offsets(train.index,old_fx,windows)
                    fut_off = old_bt.offsets(future,old_fx,windows)
                    model = old_models.get(key.removeprefix("old_"))
                    p = model.predict(train,future,train_offsets=off,future_offsets=fut_off,cfg=Config())
                    base[key] = model.predict(train,future,train_offsets=off,future_offsets=np.zeros(n),cfg=Config())
                else:
                    raise ValueError(key)
            noteworthy = sorted({str(w.message) for w in recorded if "deprecated" not in str(w.message)})
            if noteworthy:
                meta.setdefault(key,{})["warnings"] = noteworthy
            if len(p)!=n or not np.isfinite(p).all() or not np.isfinite(np.exp(p)).all():
                raise ValueError("Invalid predictions")
            pred[key] = np.asarray(p)
            base.setdefault(key,np.asarray(p))
        except Exception as exc:
            # Failure recorded, not replaced with a better-performing model.
            failures.append(dict(model=key,error=f"{type(exc).__name__}: {exc}"))
    return FitBundle(pred,base,sd,meta,failures)
