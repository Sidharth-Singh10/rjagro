"""Step 05 - forecast model comparison, backtesting, final forecast.

All models work on log price and are fitted only on data available at the
origin. Candidate families:

  naive             last observed value carried forward
  ma7               mean of the last 7 observations
  snaive7           value observed 7 days earlier
  ets_damped        ETS(A,Ad,N) on the daily grid (gaps linearly bridged)
  ets_weekly        ETS(A,Ad,A7) on the daily grid
  seasonal_anchor   log p ~ Fourier(1) + weekday, level re-anchored to the last
                    three observations (no free trend)
  seasonal_flat     same but without re-anchoring (long-run seasonal mean)
  seasonal_anchor_events   seasonal_anchor + additive discrete-event offsets
  seasonal_flat_events     seasonal_flat + additive discrete-event offsets

A trend + annual-harmonic specification is deliberately *not* used as a
candidate: with 1.5 annual cycles the two are not separately identified and the
extrapolations are absurd. ``trend_instability.csv`` documents that finding.

Validation: rolling origins every 2 weeks from 2026-04-01 (each origin has at
least one full annual cycle of training data), horizons 1-90 days, scored only
on days that were actually observed.

Outputs
    outputs/tables/model_backtest_summary.csv
    outputs/tables/model_backtest_by_horizon.csv
    outputs/tables/model_backtest_events_vs_nonevent.csv
    outputs/tables/trend_instability.csv
    outputs/tables/drift_sensitivity.csv
    outputs/tables/daily_forecast.csv
    outputs/tables/event_forecasts.csv
    data/processed/forecast_daily.csv
    data/processed/forecast_events.csv
    logs/forecast_run.json
"""
from __future__ import annotations

import warnings

import numpy as np
import pandas as pd

import cplib as cp
import effects as fx

warnings.filterwarnings("ignore")

K_FOURIER = 1        # one annual harmonic: two are not identified on 1.5 cycles
ANCHOR_L = 3         # re-anchor the level to the last three observations
MAX_H = 90
ORIGIN_START = pd.Timestamp("2026-04-01")   # first origin with a full annual cycle of training data
ORIGIN_END = pd.Timestamp("2026-09-01")


# ---------------------------------------------------------------------------
# Data
# ---------------------------------------------------------------------------
prices = cp.observed_prices()
et = cp.load_event_calendar()
last_obs = prices.index.max()

# same estimator and same bootstrap replication count as step 04, so the
# forecast applies exactly the effects that are reported in the tables
_, pl_full = fx.estimate(prices, et, cutoff=None, boot=2000)
pl_idx = pl_full.set_index("definition_id")
delta_shrunk = pl_idx["delta_shrunk"].to_dict()
event_se = pl_idx["se_shrunk"].to_dict()

core_windows: dict = {}
for _, r in et.occurrences.iterrows():
    if r.definition_id in cp.REGIME_EVENTS:
        continue
    for d in pd.date_range(r.start_date, r.end_date):
        core_windows.setdefault(d, []).append(r.definition_id)


def event_offset(dates, effects):
    out = np.zeros(len(pd.DatetimeIndex(dates)))
    for i, d in enumerate(pd.DatetimeIndex(dates)):
        ids = core_windows.get(d)
        if ids:
            out[i] = sum(effects.get(k, 0.0) for k in ids)
    return out


def active_events(dates):
    return [", ".join(sorted(core_windows.get(d, []))) for d in pd.DatetimeIndex(dates)]


# ---------------------------------------------------------------------------
# Model machinery
# ---------------------------------------------------------------------------
def design(dates, use_trend=False):
    X = cp.build_design(pd.DatetimeIndex(dates), k_fourier=K_FOURIER,
                        include_trend=use_trend, include_dow=True)
    import statsmodels.api as sm
    return sm.add_constant(X, has_constant="add")


def seasonal_model(y, dates, future, use_trend=False, anchor=True, lam=1.0):
    X = design(dates, use_trend)
    beta = np.linalg.lstsq(X.values, y, rcond=None)[0]
    fitted = X.values @ beta
    Xf = design(future, use_trend).reindex(columns=X.columns, fill_value=0.0).copy()
    if use_trend:
        o = pd.Timestamp("2025-04-01")
        tT = (dates.max() - o).days / 365.25
        tf = (pd.DatetimeIndex(future) - o).days / 365.25
        Xf["trend"] = tT + lam * (tf - tT)
    pred = Xf.values @ beta
    if anchor:
        pred = pred + float((y - fitted)[-ANCHOR_L:].mean())
    return pred


def ets_forecast(prices_train, future, weekly=False):
    from statsmodels.tsa.holtwinters import ExponentialSmoothing
    s = prices_train.reindex(pd.date_range(prices_train.index.min(), prices_train.index.max(), freq="D"))
    s = s.interpolate(limit_area="inside").ffill()
    m = ExponentialSmoothing(np.log(s.values), trend="add", damped_trend=True,
                             seasonal="add" if weekly else None,
                             seasonal_periods=7 if weekly else None,
                             initialization_method="estimated").fit()
    return np.asarray(m.forecast(len(future)))


def snaive(prices_train, future):
    out = []
    for d in pd.DatetimeIndex(future):
        past = prices_train[prices_train.index <= d - pd.Timedelta(days=7)]
        out.append(np.log(past.iloc[-1]) if len(past) else np.log(prices_train.iloc[-1]))
    return np.array(out)


CANDIDATES = ["naive", "ma7", "snaive7", "ets_damped", "ets_weekly",
              "seasonal_anchor", "seasonal_flat",
              "seasonal_anchor_events", "seasonal_flat_events"]


def forecast_from(model, prices_train, future, effects):
    y = np.log(prices_train.values)
    dates = prices_train.index
    off_train = event_offset(dates, effects)
    off_future = event_offset(future, effects)

    if model == "naive":
        return np.full(len(future), y[-1])
    if model == "ma7":
        return np.full(len(future), y[-7:].mean())
    if model == "snaive7":
        return snaive(prices_train, future)
    if model == "ets_damped":
        return ets_forecast(prices_train, future, weekly=False)
    if model == "ets_weekly":
        return ets_forecast(prices_train, future, weekly=True)
    if model == "seasonal_anchor":
        return seasonal_model(y - off_train, dates, future, False, True)
    if model == "seasonal_flat":
        return seasonal_model(y - off_train, dates, future, False, False)
    if model == "seasonal_anchor_events":
        return seasonal_model(y - off_train, dates, future, False, True) + off_future
    if model == "seasonal_flat_events":
        return seasonal_model(y - off_train, dates, future, False, False) + off_future
    raise ValueError(model)


# ---------------------------------------------------------------------------
# Trend-identification diagnostic (not a candidate model)
# ---------------------------------------------------------------------------
diag = []
for T in pd.to_datetime(["2025-10-01", "2026-01-01", "2026-04-01", "2026-07-01", "2026-10-01"]):
    train = prices[prices.index <= T]
    if len(train) < 100:
        continue
    fut = pd.date_range(T + pd.Timedelta(days=1), T + pd.Timedelta(days=90))
    fitted_log = np.log(train.values)
    X = design(train.index, use_trend=True)
    beta = np.linalg.lstsq(X.values, fitted_log, rcond=None)[0]
    tcoef = float(beta[list(X.columns).index("trend")])
    pred = np.exp(seasonal_model(fitted_log, train.index, fut, True, True, 1.0))
    diag.append({"origin": T.date().isoformat(), "train_days": int(len(train)),
                 "trend_coef_log_per_year": round(tcoef, 3),
                 "implied_trend_pct_per_year": round((np.exp(tcoef) - 1) * 100, 1),
                 "day_30_forecast_inr": round(float(pred[29]), 1),
                 "day_90_forecast_inr": round(float(pred[-1]), 1),
                 "last_observed_inr": float(train.iloc[-1])})
cp.write_table(pd.DataFrame(diag), "trend_instability.csv", float_fmt="%.1f")

# ---------------------------------------------------------------------------
# Rolling-origin backtest
# ---------------------------------------------------------------------------
origins = pd.date_range(ORIGIN_START, ORIGIN_END, freq="SMS")
origins = origins.union(pd.date_range(ORIGIN_START, ORIGIN_END, freq="MS") + pd.Timedelta(days=14))
origins = sorted([o for o in origins if ORIGIN_START <= o <= ORIGIN_END])

records, origin_diag = [], []
for T in origins:
    train = prices[prices.index <= T]
    fut_dates = pd.date_range(T + pd.Timedelta(days=1), T + pd.Timedelta(days=MAX_H))
    fut_dates = fut_dates[fut_dates <= last_obs]
    if len(train) < 200 or len(fut_dates) == 0:
        continue

    _, pl_b = fx.estimate(train, et, cutoff=T, boot=300)
    eff_b = dict(zip(pl_b["definition_id"], pl_b["delta_shrunk"]))
    origin_diag.append({"origin": T.date().isoformat(), "train_observations": len(train),
                        "events_estimable": int((pl_b["n_occ"] > 0).sum()),
                        "events_total": int(len(pl_b))})

    for model in CANDIDATES:
        try:
            pred = forecast_from(model, train, fut_dates, eff_b)
        except Exception as e:                       # pragma: no cover
            print(f"  {model} failed at {T.date()}: {e}")
            continue
        actual = prices.reindex(fut_dates).values
        for d, p, a in zip(fut_dates, pred, actual):
            if not np.isfinite(a):
                continue
            records.append({"origin": T, "date": d, "h": (d - T).days, "model": model,
                            "actual": float(a), "pred_inr": float(np.exp(p)),
                            "event_active": bool(core_windows.get(d))})

bt = pd.DataFrame(records)
bt["err"] = bt["pred_inr"] - bt["actual"]
bt["ae"] = bt["err"].abs()
bt["ape"] = bt["ae"] / bt["actual"] * 100
bt["sape"] = 200 * bt["ae"] / (bt["pred_inr"].abs() + bt["actual"].abs())


def summarise(d):
    return pd.Series({"n": len(d), "mae": d["ae"].mean(), "rmse": np.sqrt((d["err"] ** 2).mean()),
                      "smape": d["sape"].mean(), "mape": d["ape"].mean(),
                      "bias": d["err"].mean(), "bias_pct": d["err"].mean() / d["actual"].mean() * 100})


overall = bt.groupby("model").apply(summarise, include_groups=False).reset_index().sort_values("smape")
cp.write_table(overall, "model_backtest_summary.csv", float_fmt="%.3f")

bt["bucket"] = pd.cut(bt["h"], [0, 7, 28, 90], labels=["1-7d", "8-28d", "29-90d"])
by_h = (bt.groupby(["model", "bucket"], observed=True).apply(summarise, include_groups=False).reset_index())
cp.write_table(by_h, "model_backtest_by_horizon.csv", float_fmt="%.3f")

ev = (bt.groupby(["model", "event_active"]).apply(summarise, include_groups=False)
      .reset_index().rename(columns={"event_active": "event_window"}))
cp.write_table(ev, "model_backtest_events_vs_nonevent.csv", float_fmt="%.3f")

bt[["origin", "date", "h", "model", "actual", "pred_inr", "event_active"]].to_csv(
    cp.PROC / "backtest_predictions.csv", index=False)

# ---------------------------------------------------------------------------
# Selection
# ---------------------------------------------------------------------------
h28 = (by_h[by_h.bucket.isin(["1-7d", "8-28d"])]
       .groupby("model").apply(lambda d: np.average(d["smape"], weights=d["n"]), include_groups=False)
       .sort_values())
h90 = by_h[by_h.bucket == "29-90d"].set_index("model")["smape"]

# The event-aware variant of the structural model is used for the final
# decomposition even if a benchmark wins on pure point accuracy: the brief
# requires a baseline / event-adjusted split from a single fitted model.
event_model = "seasonal_anchor_events"
benchmark_best = h28.index[0]

# ---------------------------------------------------------------------------
# Interval calibration
# ---------------------------------------------------------------------------
sel = bt[bt.model == event_model].copy()
sel["log_err"] = np.log(sel["pred_inr"]) - np.log(sel["actual"])
# empirical sigma at a handful of horizons, log-log interpolated, then
# extrapolated beyond the tested horizon with the observed growth rate
ANCHOR_HS = [1, 7, 14, 28, 56, 90]
anchor_sigma = {}
for hh in ANCHOR_HS:
    d = sel[(sel["h"] - hh).abs() <= 2]["log_err"]
    if len(d) >= 8:
        anchor_sigma[hh] = float(d.std())
anchor_sigma = {k: v for k, v in anchor_sigma.items() if np.isfinite(v) and v > 0}
hs = np.array(sorted(anchor_sigma))
vs = np.array([anchor_sigma[k] for k in hs])
h_top = float(hs[-1])
# fit a single power law to the horizons with enough observations; this keeps
# the error curve monotone instead of chasing sampling noise between anchors
fit_mask = hs >= 7
if fit_mask.sum() >= 3:
    coef = np.polyfit(np.log(hs[fit_mask]), np.log(vs[fit_mask]), 1)
    power = float(np.clip(coef[0], 0.10, 0.70))
    sigma0 = float(np.exp(coef[1]))
elif len(hs) >= 2:                                   # pragma: no cover
    coef = np.polyfit(np.log(hs), np.log(vs), 1)
    power, sigma0 = float(np.clip(coef[0], 0.10, 0.70)), float(np.exp(coef[1]))
else:                                                # pragma: no cover
    power, sigma0 = 0.35, float(vs[0])

# empirical year-on-year variability, used to widen intervals beyond the tested horizon
yoy = []
s = prices
for t in s.index:
    prev = s[s.index == t - pd.Timedelta(days=365)]
    if len(prev):
        yoy.append(np.log(s[t] / prev.iloc[0]))
sigma_yoy = float(np.std(yoy, ddof=1)) if len(yoy) > 5 else 0.15


def sigma_of_h(h):
    """Forecast sd of the log error at horizon h (days).

    Power law calibrated on the rolling-origin errors, floored by the empirical
    dispersion of 12-month log price changes so that level shifts beyond the
    tested horizon are not understated.
    """
    h = np.asarray(h, float)
    backtest_part = sigma0 * np.maximum(h, 1.0) ** power
    long_part = sigma_yoy * np.sqrt(h / 365.0)
    return np.maximum(backtest_part, long_part)


# ---------------------------------------------------------------------------
# Final forecast
# ---------------------------------------------------------------------------
future = pd.date_range(cp.FORECAST_START, cp.FORECAST_END, freq="D")
y_all = np.log(prices.values)
off_train = event_offset(prices.index, delta_shrunk)
off_future = event_offset(future, delta_shrunk)

pred_log = seasonal_model(y_all - off_train, prices.index, future, use_trend=False, anchor=True)
fc_base_log = pred_log
fc_event_log = pred_log + off_future

sig = sigma_of_h(np.arange(1, len(future) + 1))
ev_se_vec = np.array([max((event_se.get(k, np.nan) for k in core_windows.get(d, [])), default=0.0)
                      for d in future])
ev_se_vec = np.nan_to_num(ev_se_vec, nan=0.0)
sig_event = np.sqrt(sig ** 2 + ev_se_vec ** 2)

daily = pd.DataFrame({
    "date": future,
    "market": cp.MARKET,
    "unit": "INR/kg",
    "forecast_inr": np.round(np.exp(fc_event_log), 1),
    "baseline_inr": np.round(np.exp(fc_base_log), 1),
    "event_impact_inr": np.round(np.exp(fc_event_log) - np.exp(fc_base_log), 1),
    "event_impact_pct": np.round((np.exp(off_future) - 1) * 100, 2),
    "events_active": active_events(future),
    "pi80_lo": np.round(np.exp(fc_event_log - 1.2816 * sig_event), 1),
    "pi80_hi": np.round(np.exp(fc_event_log + 1.2816 * sig_event), 1),
    "pi95_lo": np.round(np.exp(fc_event_log - 1.959964 * sig_event), 1),
    "pi95_hi": np.round(np.exp(fc_event_log + 1.959964 * sig_event), 1),
    "baseline_pi95_lo": np.round(np.exp(fc_base_log - 1.959964 * sig), 1),
    "baseline_pi95_hi": np.round(np.exp(fc_base_log + 1.959964 * sig), 1),
    "horizon_days": np.arange(1, len(future) + 1),
    "sigma_log": np.round(sig_event, 4),
})
daily["forecast_reliability"] = np.select(
    [daily["horizon_days"] <= 90, daily["horizon_days"] <= 210],
    ["A - errors measured in backtest", "B - error growth extrapolated"],
    default="C - beyond tested horizon; interval from 12-month historical variability")
daily["note"] = np.where(daily["events_active"] != "",
                         "event-adjusted; baseline excludes all discrete event effects",
                         "no discrete event active; forecast equals baseline")
daily.to_csv(cp.PROC / "forecast_daily.csv", index=False)
daily.to_csv(cp.TABLES / "daily_forecast.csv", index=False)

# ---------------------------------------------------------------------------
# Event-specific forecasts
# ---------------------------------------------------------------------------
rows = []
for _, r in et.occurrences.iterrows():
    if r.definition_id in cp.REGIME_EVENTS:
        continue
    if r.end_date < cp.FORECAST_START or r.start_date > cp.FORECAST_END:
        continue
    core = pd.date_range(max(r.start_date, cp.FORECAST_START), min(r.end_date, cp.FORECAST_END))
    if len(core) == 0:
        continue
    infl = pd.date_range(max(r.influence_start, cp.FORECAST_START), min(r.influence_end, cp.FORECAST_END))
    sub = daily[daily.date.isin(core)]
    sub_infl = daily[daily.date.isin(infl)]
    before = daily[daily.date == core[0] - pd.Timedelta(days=1)]
    after = daily[daily.date == core[-1] + pd.Timedelta(days=1)]
    # effect on these dates sums every discrete event that is active, so an
    # overlapping row reports the combined shift and its combined interval
    day_offsets, day_ses = [], []
    for d in core:
        ids = core_windows.get(d, [])
        day_offsets.append(sum(delta_shrunk.get(k, 0.0) for k in ids))
        day_ses.append(float(np.sqrt(sum(event_se.get(k, 0.0) ** 2 for k in ids))))
    d_eff = float(np.mean(day_offsets)) if day_offsets else 0.0
    se_eff = float(np.mean(day_ses)) if day_ses else np.nan
    peak_idx, trough_idx = sub["forecast_inr"].idxmax(), sub["forecast_inr"].idxmin()

    rows.append({
        "definition_id": r.definition_id, "event": r["name"], "category": r.category,
        "start_date": r.start_date.date().isoformat(), "end_date": r.end_date.date().isoformat(),
        "date_confidence": r.date_confidence,
        "hypothesised_direction": r.hypothesised_direction,
        "forecast_core_days": len(sub),
        "price_before_event_inr": float(before["forecast_inr"].iloc[0]) if len(before) else np.nan,
        "event_period_mean_inr": round(float(sub["forecast_inr"].mean()), 1),
        "event_period_peak_inr": round(float(sub["forecast_inr"].max()), 1),
        "event_period_peak_date": sub.loc[peak_idx, "date"].date().isoformat(),
        "event_period_trough_inr": round(float(sub["forecast_inr"].min()), 1),
        "event_period_trough_date": sub.loc[trough_idx, "date"].date().isoformat(),
        "baseline_period_mean_inr": round(float(sub["baseline_inr"].mean()), 1),
        "impact_inr": round(float(sub["forecast_inr"].mean() - sub["baseline_inr"].mean()), 1),
        "impact_pct": round(float((sub["forecast_inr"].mean() / sub["baseline_inr"].mean() - 1) * 100), 2),
        "impact_pct_ci80_lo": round(float((np.exp(d_eff - 1.2816 * se_eff) - 1) * 100), 2) if np.isfinite(se_eff) else np.nan,
        "impact_pct_ci80_hi": round(float((np.exp(d_eff + 1.2816 * se_eff) - 1) * 100), 2) if np.isfinite(se_eff) else np.nan,
        "event_pi95_lo_inr": round(float(sub["pi95_lo"].min()), 1),
        "event_pi95_hi_inr": round(float(sub["pi95_hi"].max()), 1),
        "influence_window_mean_inr": round(float(sub_infl["forecast_inr"].mean()), 1) if len(sub_infl) else np.nan,
        "day_after_event_inr": round(float(after["forecast_inr"].iloc[0]), 1) if len(after) else np.nan,
        "n_historical_occurrences": int(pl_idx.loc[r.definition_id, "n_occ"]),
        "n_historical_observed_days": int(pl_idx.loc[r.definition_id, "core_observed_days"]),
        "historical_raw_effect_pct": round(float((np.exp(pl_idx.loc[r.definition_id, "delta_core"]) - 1) * 100), 2)
        if np.isfinite(pl_idx.loc[r.definition_id, "delta_core"]) else np.nan,
        "reliability": fx.reliability(int(pl_idx.loc[r.definition_id, "n_occ"]),
                                      int(pl_idx.loc[r.definition_id, "core_observed_days"]),
                                      np.isfinite(pl_idx.loc[r.definition_id, "delta_core"])),
        "overlaps_with": ", ".join(sorted({x for d in core for x in core_windows.get(d, [])
                                           if x != r.definition_id})),
    })

evf = pd.DataFrame(rows).sort_values(["start_date", "definition_id"]).reset_index(drop=True)

# historical validation evidence: the event-window error of this model in the
# rolling-origin backtest. It is pooled across all events because no single
# event has enough out-of-sample occurrences for its own accuracy estimate.
_eb = ev[(ev.model == event_model) & (ev.event_window)]
backtest_event_smape = float(_eb["smape"].iloc[0]) if len(_eb) else np.nan
backtest_nonevent_smape = float(
    ev[(ev.model == event_model) & (~ev.event_window)]["smape"].iloc[0])
evf["historical_validation"] = (
    f"pooled event-window sMAPE {backtest_event_smape:.1f}% vs "
    f"{backtest_nonevent_smape:.1f}% on non-event days (rolling-origin backtest); "
    "no event-specific out-of-sample test is possible")
evf["limitations"] = np.where(
    evf["n_historical_occurrences"] == 0,
    "no usable observed price in any historical occurrence; effect is the category prior",
    np.where(evf["n_historical_occurrences"] == 1,
             "single historical occurrence; effect shrunk heavily toward category mean",
             "effect estimated from several occurrences; still uncertain"))
evf.to_csv(cp.TABLES / "event_forecasts.csv", index=False, float_format="%.1f")
evf.to_csv(cp.PROC / "forecast_events.csv", index=False, float_format="%.1f")

# ---------------------------------------------------------------------------
# Drift sensitivity
# ---------------------------------------------------------------------------
sens = []
for drift_pct in (0.0, 6.0, 12.0, 20.0):
    g = np.log(1 + drift_pct / 100) * np.arange(1, len(future) + 1) / 365.0
    logp = pred_log + g
    for target in ("2027-06-30", "2027-12-31"):
        i = list(future).index(pd.Timestamp(target))
        sens.append({"annual_drift_pct": drift_pct, "target_date": target,
                     "baseline_inr": round(float(np.exp(logp[i])), 1),
                     "event_adjusted_inr": round(float(np.exp(logp[i] + off_future[i])), 1)})
sens_df = pd.DataFrame(sens)
cp.write_table(sens_df, "drift_sensitivity.csv", float_fmt="%.1f")

run_log = {
    "origins": [o.date().isoformat() for o in origins],
    "origin_diagnostics": origin_diag,
    "candidates": CANDIDATES,
    "selection_metric": "weighted sMAPE over 1-28 day horizons",
    "ranking_smape_1_28": {k: round(float(v), 3) for k, v in h28.items()},
    "ranking_smape_29_90": {k: round(float(v), 3) for k, v in h90.items()},
    "best_benchmark": benchmark_best,
    "event_model_used": event_model,
    "backtest_rows": int(len(bt)),
    "error_scaling": {"anchor_sigma": {int(k): round(float(v), 4) for k, v in anchor_sigma.items()},
                      "sigma0": sigma0, "power": power,
                      "sigma_at_h30": float(sigma_of_h(30)), "sigma_at_h90": float(sigma_of_h(90)),
                      "sigma_at_h434": float(sigma_of_h(434)),
                      "sigma_yoy_365d": sigma_yoy, "n_yoy_pairs": len(yoy)},
    "final": {"start": future[0].date().isoformat(), "end": future[-1].date().isoformat(),
              "days": int(len(future)),
              "mean_inr": round(float(daily.forecast_inr.mean()), 1),
              "last_inr": float(daily.forecast_inr.iloc[-1]),
              "last_pi95": [float(daily.pi95_lo.iloc[-1]), float(daily.pi95_hi.iloc[-1])]},
    "drift_sensitivity": sens,
}
cp.json_dump(run_log, "forecast_run.json")

print(overall.to_string(index=False))
print("\nsMAPE by horizon bucket:")
print(by_h.pivot(index="model", columns="bucket", values="smape").round(2).to_string())
print("\nEvent vs non-event sMAPE:")
print(ev.pivot(index="model", columns="event_window", values="smape").round(2).to_string())
print(f"\nBest benchmark (1-28d): {benchmark_best} | event model: {event_model}")
print("Interval sigma:", {k: round(v, 3) for k, v in anchor_sigma.items()})
print(f"Interval scaling: sigma0={sigma0:.4f} power={power:.3f} | sigma(h=30)={sigma_of_h(30):.3f} "
      f"h=90 {sigma_of_h(90):.3f} h=434 {sigma_of_h(434):.3f} | yoy sd {sigma_yoy:.3f}")
print("\nFinal forecast head:")
print(daily[["date", "forecast_inr", "baseline_inr", "event_impact_pct", "pi95_lo", "pi95_hi",
             "events_active"]].head(8).to_string(index=False))
print("\nFinal forecast tail:")
print(daily[["date", "forecast_inr", "baseline_inr", "pi95_lo", "pi95_hi"]].tail(3).to_string(index=False))
