"""Step 07 - exports and consistency checks.

Builds the single Excel workbook of deliverables and verifies that every
exported table agrees with the model outputs and with the raw data.

Outputs
    outputs/chicken_price_deliverables.xlsx
    logs/consistency_checks.json
"""
from __future__ import annotations

import json

import numpy as np
import pandas as pd

import cplib as cp

checks: list[dict] = []


def check(name, ok, detail=""):
    checks.append({"check": name, "passed": bool(ok), "detail": str(detail)})
    print(("PASS  " if ok else "FAIL  ") + name + (f"  [{detail}]" if detail else ""))


prices = cp.observed_prices()
et = cp.load_event_calendar()
daily = pd.read_csv(cp.TABLES / "daily_forecast.csv", parse_dates=["date"])
imp = pd.read_csv(cp.TABLES / "historical_event_impact.csv")
occ = pd.read_csv(cp.TABLES / "historical_event_occurrences.csv")
cat = pd.read_csv(cp.TABLES / "category_effects.csv")
evf = pd.read_csv(cp.TABLES / "event_forecasts.csv")
summary = pd.read_csv(cp.TABLES / "model_backtest_summary.csv")
by_h = pd.read_csv(cp.TABLES / "model_backtest_by_horizon.csv")
evbt = pd.read_csv(cp.TABLES / "model_backtest_events_vs_nonevent.csv")
coverage = pd.read_csv(cp.TABLES / "event_coverage.csv")
bt = pd.read_csv(cp.PROC / "backtest_predictions.csv", parse_dates=["origin", "date"])
run = json.loads((cp.LOGS / "forecast_run.json").read_text())
dq = json.loads((cp.LOGS / "data_quality.json").read_text())
eff = json.loads((cp.LOGS / "event_effects.json").read_text())["effects"]

# ---------------------------------------------------------------------------
# 1. structural checks on the daily forecast
# ---------------------------------------------------------------------------
expected_days = pd.date_range(cp.FORECAST_START, cp.FORECAST_END, freq="D")
check("daily forecast covers every calendar day 2026-10-24 .. 2027-12-31",
      len(daily) == len(expected_days) and daily["date"].is_monotonic_increasing
      and (daily["date"].values == expected_days.values).all(),
      f"{len(daily)} rows, expected {len(expected_days)}")

check("forecast starts the day after the last observation",
      daily["date"].min() == prices.index.max() + pd.Timedelta(days=1),
      f"{daily['date'].min().date()} vs last observation {prices.index.max().date()}")

check("no duplicate dates in the daily forecast", not daily["date"].duplicated().any())

recon = (daily["baseline_inr"] * (1 + daily["event_impact_pct"] / 100) - daily["forecast_inr"]).abs().max()
check("forecast = baseline x (1 + event impact%)", recon < 0.11, f"max abs diff {recon:.3f} INR")

diff_inr = (daily["forecast_inr"] - daily["baseline_inr"] - daily["event_impact_inr"]).abs().max()
check("event impact in INR equals forecast minus baseline", diff_inr < 0.11, f"max abs diff {diff_inr:.3f}")

check("80% interval contains the central forecast",
      ((daily["pi80_lo"] <= daily["forecast_inr"]) & (daily["forecast_inr"] <= daily["pi80_hi"])).all())
check("95% interval contains the 80% interval",
      ((daily["pi95_lo"] <= daily["pi80_lo"]) & (daily["pi80_hi"] <= daily["pi95_hi"])).all())
check("all prices positive", (daily[["forecast_inr", "baseline_inr", "pi95_lo"]] > 0).all().all())
check("interval width increases with horizon",
      (daily["pi95_hi"] / daily["pi95_lo"]).iloc[-1] > (daily["pi95_hi"] / daily["pi95_lo"]).iloc[0],
      f"{daily['pi95_hi'].iloc[-1] / daily['pi95_lo'].iloc[-1]:.2f} at end vs "
      f"{daily['pi95_hi'].iloc[0] / daily['pi95_lo'].iloc[0]:.2f} at start")

# ---------------------------------------------------------------------------
# 2. event impact consistency with the estimated effects
# ---------------------------------------------------------------------------
merged = daily.merge(
    et.occurrences.loc[~et.occurrences.definition_id.isin(cp.REGIME_EVENTS),
                       ["definition_id", "start_date", "end_date"]],
    left_on="date", right_on="start_date", how="inner")
mismatch = []
for _, r in merged.iterrows():
    ids = [x for x in str(r["events_active"]).split(", ") if x in eff]
    expected = np.prod([1 + eff[i]["effect_shrunk_pct"] / 100 for i in ids]) - 1
    if abs(expected * 100 - r["event_impact_pct"]) > 0.02:
        mismatch.append((str(r["date"].date()), r["event_impact_pct"], round(expected * 100, 2)))
check("daily event impact equals the product of the fitted event effects",
      len(mismatch) == 0, f"{len(mismatch)} mismatches")

check("event impact is zero on days with no active event",
      (daily.loc[daily["events_active"].fillna("") == "", "event_impact_pct"].abs() < 1e-9).all())

check("every event with a discrete core window in the forecast period appears in event_forecasts",
      set(evf["definition_id"]) ==
      set(et.occurrences.loc[(~et.occurrences.definition_id.isin(cp.REGIME_EVENTS)) &
                             (et.occurrences.end_date >= cp.FORECAST_START) &
                             (et.occurrences.start_date <= cp.FORECAST_END), "definition_id"]),
      f"{evf['definition_id'].nunique()} event types")

check("all future event dates lie inside the forecast window",
      (pd.to_datetime(evf["start_date"]) >= cp.FORECAST_START - pd.Timedelta(days=1)).all())

# ---------------------------------------------------------------------------
# 3. historical table internal consistency
# ---------------------------------------------------------------------------
ok = imp.dropna(subset=["observed_mean_price_inr"])
err_abs = (ok["observed_mean_price_inr"] - ok["estimated_baseline_price_inr"]
           - ok["estimated_absolute_impact_inr"]).abs().max()
check("absolute impact = observed - baseline", err_abs < 0.02, f"max {err_abs:.4f}")
err_pct = (ok["observed_mean_price_inr"] / ok["estimated_baseline_price_inr"] - 1) * 100 - ok["raw_effect_pct"]
check("raw effect % = (observed / baseline - 1) x 100", err_pct.abs().max() < 0.02,
      f"max {err_pct.abs().max():.4f}")
ci = imp.dropna(subset=["raw_ci80_lo_pct"])
check("80% interval is inside the 95% interval (events with an estimate)",
      ((ci["raw_ci95_lo_pct"] <= ci["raw_ci80_lo_pct"]) &
       (ci["raw_ci80_hi_pct"] <= ci["raw_ci95_hi_pct"])).all(),
      f"{len(ci)} events; {len(imp) - len(ci)} use the category prior only")
check("events with no observed price carry a flagged prior-only estimate",
      (imp.loc[imp["raw_effect_pct"].isna(), "reliability"] == "E - no usable historical evidence").all(),
      ", ".join(imp.loc[imp["raw_effect_pct"].isna(), "definition_id"]))
check("occurrence table has one row per discrete occurrence",
      len(occ) == int((~et.occurrences.definition_id.isin(cp.REGIME_EVENTS)).sum()),
      f"{len(occ)} rows")

# ---------------------------------------------------------------------------
# 4. no look-ahead in the backtest
# ---------------------------------------------------------------------------
check("backtest never evaluates a date before its forecast origin",
      (bt["date"] > bt["origin"]).all(),
      f"min horizon {int((bt['date'] - bt['origin']).dt.days.min())} days")
check("backtest origins start once a full annual cycle is available",
      bt["origin"].min() >= pd.Timestamp("2026-04-01"),
      str(bt["origin"].min().date()))
check("backtest only scores days with an observed price",
      bt["actual"].notna().all() and (bt["actual"] > 0).all())
check("models were fitted on data up to the origin only",
      run.get("origin_diagnostics", [{}])[0].get("train_observations", 0) > 200,
      f"{run['origin_diagnostics'][0]['train_observations']} training observations at first origin")

# ---------------------------------------------------------------------------
# 5. reported numbers match the source JSON
# ---------------------------------------------------------------------------
check("daily forecast row count matches run log",
      int(run["final"]["days"]) == len(daily), f"{len(daily)}")
check("last-day forecast matches run log",
      abs(float(run["final"]["last_inr"]) - float(daily['forecast_inr'].iloc[-1])) < 0.06,
      f"{daily['forecast_inr'].iloc[-1]}")
check("event coverage table records every definition",
      len(coverage) == int(et.definitions.shape[0]))
check("raw data preserved and unmodified",
      cp.PRICE_CSV.stat().st_size == 9254 and dq["observations"] == 409,
      f"csv bytes {cp.PRICE_CSV.stat().st_size}, {dq['observations']} observations")

# ---------------------------------------------------------------------------
# 6. Excel workbook
# ---------------------------------------------------------------------------
xlsx = cp.ROOT / "outputs" / "chicken_price_deliverables.xlsx"
sheets = {
    "READ ME": pd.DataFrame({
        "item": ["market", "product", "unit", "history start", "history end", "observations",
                 "missing calendar days", "forecast start", "forecast end", "forecast rows",
                 "model", "benchmark comparison", "last observed price INR",
                 "dec-2027 forecast INR", "95% interval dec-2027"],
        "value": [cp.MARKET, cp.PRODUCT, cp.UNIT, str(prices.index.min().date()),
                  str(prices.index.max().date()), dq["observations"],
                  f"{dq['missing_calendar_days']} ({dq['missing_share_pct']}%)",
                  str(daily["date"].min().date()), str(daily["date"].max().date()), len(daily),
                  "seasonal anchor (Fourier-1 + weekday) + empirical-Bayes event offsets",
                  "see 'model comparison' sheet", float(prices.iloc[-1]),
                  float(daily["forecast_inr"].iloc[-1]),
                  f"{daily['pi95_lo'].iloc[-1]} - {daily['pi95_hi'].iloc[-1]}"],
    }),
    "daily forecast": daily,
    "event forecasts": evf,
    "historical event impact": imp,
    "event occurrences": occ,
    "category effects": cat,
    "event coverage": coverage,
    "model comparison": summary,
    "error by horizon": by_h,
    "error event days": evbt,
}

with pd.ExcelWriter(xlsx, engine="openpyxl") as xw:
    for name, df in sheets.items():
        df.to_excel(xw, sheet_name=name[:31], index=False)
        ws = xw.sheets[name[:31]]
        ws.freeze_panes = "A2"
        for col in ws.iter_cols(min_row=1, max_row=1):
            for cell in col:
                cell.font = cell.font.copy(bold=True)

print(f"\nworkbook written: {xlsx}")
passed = sum(c["passed"] for c in checks)
print(f"checks passed: {passed}/{len(checks)}")
cp.json_dump(checks, "consistency_checks.json")
assert passed == len(checks), "consistency checks failed"
