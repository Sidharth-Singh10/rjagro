"""Step 03 - characterise the normal price series.

Descriptive statistics, volatility, autocorrelation, weekly and annual
seasonality tests, structural-break screens and the baseline (no-event)
regression. Nothing here uses event information; this is the "normal price"
counterfactual that event effects are measured against.

Outputs
    outputs/tables/baseline_summary.csv
    outputs/tables/baseline_monthly_profile.csv
    outputs/tables/baseline_weekday.csv
    outputs/tables/baseline_model_selection.csv
    outputs/tables/baseline_coefficients.csv
    logs/baseline.json
"""
from __future__ import annotations

import numpy as np
import pandas as pd
import statsmodels.api as sm
from statsmodels.tsa.stattools import adfuller, kpss

import cplib as cp

prices = cp.observed_prices()
lp = np.log(prices)

# ---- level statistics ------------------------------------------------------
summary = {
    "observations": int(len(prices)),
    "first": str(prices.index.min().date()),
    "last": str(prices.index.max().date()),
    "mean_inr": round(float(prices.mean()), 2),
    "median_inr": float(prices.median()),
    "sd_inr": round(float(prices.std()), 2),
    "cv_pct": round(float(prices.std() / prices.mean() * 100), 1),
    "min_inr": float(prices.min()), "min_date": str(prices.idxmin().date()),
    "max_inr": float(prices.max()), "max_date": str(prices.idxmax().date()),
    "p10_inr": float(prices.quantile(.10)), "p90_inr": float(prices.quantile(.90)),
    "mean_log_sd": round(float(lp.std()), 4),
    "mean_abs_daily_change_inr": round(float(prices.diff().abs().mean()), 2),
    "daily_change_sd_pct": round(float(prices.pct_change().std() * 100), 2),
}
summary["range_inr"] = summary["max_inr"] - summary["min_inr"]
summary["range_pct_of_mean"] = round(summary["range_inr"] / summary["mean_inr"] * 100, 1)

# ---- stationarity / persistence -------------------------------------------
adf_lvl = adfuller(prices.values, autolag="AIC", result_object=False)
adf_dif = adfuller(prices.diff().dropna().values, autolag="AIC", result_object=False)
summary["adf_level_stat"] = round(float(adf_lvl[0]), 3)
summary["adf_level_p"] = round(float(adf_lvl[1]), 4)
summary["adf_diff_p"] = float(adf_dif[1])
summary["ar1_daily_change"] = round(float(np.corrcoef(prices.diff().dropna()[:-1],
                                                      prices.diff().dropna()[1:])[0, 1]), 3)
summary["acf_price_lag7"] = round(float(prices.autocorr(7)), 3)
summary["acf_price_lag30"] = round(float(prices.autocorr(30)), 3)

# ---- monthly profile (pooled over years) ----------------------------------
m = prices.groupby(prices.index.month).agg(["mean", "median", "std", "count", "min", "max"])
m.index.name = "month"
m = m.round(1).reset_index()
m["index_vs_mean_pct"] = ((m["mean"] / prices.mean() - 1) * 100).round(1)
cp.write_table(m, "baseline_monthly_profile.csv", float_fmt="%.1f")

# ---- weekday profile -------------------------------------------------------
dow = prices.groupby(prices.index.day_of_week).agg(["mean", "median", "std", "count", "min", "max"])
dow.index.name = "weekday"
dow = dow.round(2).reset_index()
dow["weekday_name"] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
dow["index_vs_sunday_pct"] = ((dow["mean"] / dow.loc[dow.weekday == 6, "mean"].iloc[0] - 1) * 100).round(2)
dow = dow[["weekday", "weekday_name", "mean", "median", "std", "count", "index_vs_sunday_pct"]]
cp.write_table(dow, "baseline_weekday.csv", float_fmt="%.2f")

# ---- structural break screen ----------------------------------------------
# Sup-F test for a single break in the mean of log price (15% trimming),
# on the regularised grid (missing days linearly bridged *for this test only*).
grid = pd.date_range(prices.index.min(), prices.index.max(), freq="D")
yg = np.log(prices.reindex(grid).interpolate(limit_area="inside")).values
n = len(yg)
lo, hi = int(0.15 * n), int(0.85 * n)
fstats = []
for bp in range(lo, hi):
    a, b = yg[:bp], yg[bp:]
    if len(a) < 2 or len(b) < 2:
        continue
    ssr = ((a - a.mean()) ** 2).sum() + ((b - b.mean()) ** 2).sum()
    sst = ((yg - yg.mean()) ** 2).sum()
    k = 1
    fstats.append(((sst - ssr) / k) / (ssr / (n - 2 * k)))
fstats = np.array(fstats)
bpos = int(np.argmax(fstats)) + lo
summary["supF_stat"] = round(float(fstats.max()), 2)
summary["supF_break_date"] = str(grid[bpos].date())
summary["supF_critical_5pct_approx"] = 8.85   # Andrews (1993) sup-F, 15% trim, ~1 regressor
summary["supF_significant"] = bool(fstats.max() > 8.85)

# ---- baseline model selection ---------------------------------------------
rows = []
for k in (1, 2, 3, 4):
    for tr in (True, False):
        mdl = cp.BaselineModel(k_fourier=k, include_trend=tr).fit(prices)
        rows.append({
            "fourier_harmonics": k, "trend": tr,
            "params": int(len(mdl.coef_)), "r2": round(mdl.r2_, 4),
            "adj_r2": round(float(1 - (1 - mdl.r2_) * (len(prices) - 1) / (len(prices) - len(mdl.coef_))), 4),
            "aic": round(float(mdl.res_.aic), 1), "bic": round(float(mdl.res_.bic), 1),
            "resid_sd_log": round(mdl.sigma_, 4), "ar1": round(mdl.phi_, 3),
        })
sel = pd.DataFrame(rows).sort_values("bic")
cp.write_table(sel, "baseline_model_selection.csv", float_fmt="%.4f")
best = sel.iloc[0]

# ---- chosen baseline model -------------------------------------------------
K = 2
mdl = cp.BaselineModel(k_fourier=K, include_trend=True).fit(prices)
coef = pd.DataFrame({"term": mdl.coef_.index, "coef_log": mdl.coef_.values.round(5),
                     "std_err": mdl.se_.values.round(5)})
coef["t"] = (coef["coef_log"] / coef["std_err"]).round(2)
coef["pct_effect"] = ((np.exp(coef["coef_log"]) - 1) * 100).round(2)
cp.write_table(coef, "baseline_coefficients.csv")

# trend expressed in % per year
trend_coef = float(mdl.coef_.get("trend", np.nan))
summary["baseline_trend_pct_per_year"] = round((np.exp(trend_coef) - 1) * 100, 2)
summary["baseline_fourier_k"] = K
summary["baseline_r2"] = round(mdl.r2_, 4)
summary["baseline_resid_sd_log"] = round(mdl.sigma_, 4)
summary["baseline_ar1"] = round(mdl.phi_, 3)

# weekday joint test (Wald on the six weekday dummies)
names = list(mdl.X_.columns)
idx = [names.index(c) for c in names if c.startswith("dow_")]
R = np.zeros((len(idx), len(names)))
for i, j in enumerate(idx):
    R[i, j] = 1
wt = cp.joint_wald(mdl.res_, R)
summary["weekday_joint_chi2"] = wt["chi2"]
summary["weekday_joint_p"] = round(wt["p"], 5)

# annual seasonality joint test (2 harmonics = 4 coefficients)
idx = [names.index(c) for c in names if c.startswith(("sin", "cos"))]
R = np.zeros((len(idx), len(names)))
for i, j in enumerate(idx):
    R[i, j] = 1
wt = cp.joint_wald(mdl.res_, R)
summary["annual_joint_chi2"] = wt["chi2"]
summary["annual_joint_p"] = round(wt["p"], 6)

# event vs non-event raw comparison (descriptive only)
et = cp.load_event_calendar()
core = set(et.daily.loc[(et.daily.role == "core") & (~et.daily.definition_id.isin(cp.REGIME_EVENTS)), "date"])
disc_ev = prices[[d in core for d in prices.index]]
nonev = prices[[d not in core for d in prices.index]]
summary["discrete_event_days"] = int(len(disc_ev))
summary["non_event_days"] = int(len(nonev))
summary["event_day_mean_inr"] = round(float(disc_ev.mean()), 2)
summary["non_event_day_mean_inr"] = round(float(nonev.mean()), 2)
summary["event_vs_non_event_raw_pct"] = round(float((disc_ev.mean() / nonev.mean() - 1) * 100), 2)

# model-implied annual shape (2 harmonics only, no trend, no dow)
shape = cp.fourier(pd.date_range("2025-01-01", "2025-12-31"), k=K).values @ mdl.coef_[[f"sin{i}" for i in range(1, K + 1)] + [f"cos{i}" for i in range(1, K + 1)]].values
shape = shape - shape.mean()
summary["annual_amplitude_pct"] = round(float((np.exp(shape.max()) - 1) * 100), 1)
summary["annual_trough_pct"] = round(float((np.exp(shape.min()) - 1) * 100), 1)
summary["annual_peak_dayofyear"] = int(np.argmax(shape) + 1)
summary["annual_trough_dayofyear"] = int(np.argmin(shape) + 1)

cp.write_table(pd.DataFrame([summary]).T.reset_index().rename(columns={"index": "statistic", 0: "value"}),
               "baseline_summary.csv")
cp.json_dump(summary, "baseline.json")

print(pd.Series(summary).to_string())
print("\nModel selection (top 4 by BIC):")
print(sel.head(4).to_string(index=False))
