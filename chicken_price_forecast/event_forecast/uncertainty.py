"""Matured-error daily bands and whole-path weekly scenarios, never iid guarantees."""
import math

import numpy as np
import pandas as pd


def bucket(h):
    return next(upper for upper in (7, 14, 30, 60, math.inf) if h <= upper)


def calibrate(errors, cutoff, horizons):
    bands = {}
    if not errors.empty:
        eligible = errors[(errors.origin < cutoff) & (errors.date <= cutoff)].copy()
        eligible["bucket"] = eligible.horizon.map(bucket)
        for upper, d in eligible.groupby("bucket"):
            d = d.sort_values(["date", "origin"]).drop_duplicates("date", keep="last")
            if len(d) < 30 or d.origin.nunique() < 4 or upper > 60:
                continue
            values = np.sort(np.abs(np.log(d.prediction / d.actual)))
            ranks = [math.ceil((len(values) + 1) * p) for p in (.8, .95)]
            if max(ranks) <= len(values):
                bands[upper] = dict(q80=float(values[ranks[0] - 1]),
                                    q95=float(values[ranks[1] - 1]),
                                    dates=len(values), origins=int(d.origin.nunique()),
                                    status="empirical_dependent_calibration")
    return [bands.get(bucket(h), dict(q80=None, q95=None, dates=0, origins=0,
                                    status="uncalibrated_path_scenario")).copy()
            for h in horizons]


def simulate(model, dates):
    """Block-bootstrap innovations + approximate Gaussian ridge coefficient uncertainty.

    Conditions on fitted rho and calendar. Does not learn structural-break risk or
    claim calibrated weekly coverage. Resampling preserves chronological blocks.
    """
    point = model.predict(dates).prediction.to_numpy()
    rng = np.random.default_rng(model.config.seed)
    draws, block = model.config.draws, model.config.block_days
    beta = rng.multivariate_normal(model.beta, model.covariance, size=draws)
    x, _ = model.calendar.design(dates, annual=model.config.annual, halo=model.config.halo)
    logs = beta @ x.T
    state = model.last_y - beta @ model.last_x
    count = math.ceil(len(dates) / block)
    starts = rng.integers(0, len(model.innovations), size=(draws, count))
    indices = (starts[:, :, None] + np.arange(block)) % len(model.innovations)
    shocks = model.innovations[indices.reshape(draws, -1)[:, :len(dates)]]
    for j in range(len(dates)):
        state = model.rho * state + shocks[:, j]
        logs[:, j] += state
    # A symmetric +/- one-day tentative-calendar scenario, not observed dates.
    for sign in (-1, 1):
        rows = np.arange(draws) % 3 == sign + 1
        shifted_dates = pd.DatetimeIndex(dates) + pd.Timedelta(days=sign)
        shifted, _ = model.calendar.design(shifted_dates, annual=model.config.annual,
                                           halo=model.config.halo)
        without, _ = model.calendar.design(dates, annual=model.config.annual,
                                           halo=model.config.halo, tentative=False)
        shifted_without, _ = model.calendar.design(shifted_dates, annual=model.config.annual,
                                                   halo=model.config.halo, tentative=False)
        # Only uncertain event features move; weekday/annual terms cancel exactly.
        difference = (shifted - shifted_without) - (x - without)
        logs[rows] += beta[rows] @ difference.T
    paths = np.exp(logs)
    if not np.isfinite(paths).all() or (paths <= 0).any() or not np.isfinite(point).all():
        raise ValueError("Unstable uncertainty simulation")
    return paths


def period_summary(paths, central):
    means = paths.mean(axis=1)
    return {
        "prediction": float(np.mean(central)),
        "lo80": float(np.quantile(means, .1)), "hi80": float(np.quantile(means, .9)),
        "lo95": float(np.quantile(means, .025)), "hi95": float(np.quantile(means, .975)),
        "intervalStatus": "uncalibrated_path_scenario",
    }
