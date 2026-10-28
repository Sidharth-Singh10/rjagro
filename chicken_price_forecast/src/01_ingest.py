"""Step 01 - ingest and audit the raw price tracker.

Reads the supplied CSV byte-for-byte, validates every cell, and writes

    data/processed/prices_daily.csv      full daily grid with observation flags
    data/processed/data_quality_gaps.csv gap runs (why days are missing)
    outputs/tables/data_quality_monthly.csv
    logs/data_quality.json

Nothing is interpolated, dropped or winsorised here.
"""
from __future__ import annotations

import numpy as np
import pandas as pd

import cplib as cp

raw = cp.load_prices()

# ---- basic integrity checks ------------------------------------------------
checks = {}
checks["rows_in_file"] = int(len(raw))
checks["duplicate_dates"] = int(raw["date"].duplicated().sum())
checks["unparsable_dates"] = int(raw["date"].isna().sum())
checks["blank_price_cells"] = int(raw["price"].isna().sum())
checks["non_numeric_nonblank"] = int(
    ((raw["rate_raw"] != "") & raw["price"].isna() & raw["date"].notna()).sum()
)
checks["price_min"] = float(raw["price"].min())
checks["price_max"] = float(raw["price"].max())
checks["price_mean"] = round(float(raw["price"].mean()), 3)
checks["price_median"] = float(raw["price"].median())
checks["non_integer_prices"] = int((raw["price"].dropna() % 1 != 0).sum())
checks["non_positive_prices"] = int((raw["price"].dropna() <= 0).sum())

obs = raw.dropna(subset=["price"]).set_index("date")["price"]
checks["first_observation"] = str(obs.index.min().date())
checks["last_observation"] = str(obs.index.max().date())
checks["first_date_row_in_file"] = str(raw["date"].min().date())
checks["last_date_row_in_file"] = str(raw["date"].max().date())
checks["observations"] = int(len(obs))

# Consecutive day-to-day jumps (data-entry error screen)
d1 = obs.diff().dropna()
checks["max_abs_daily_change_inr"] = float(d1.abs().max())
checks["max_abs_daily_change_pct"] = round(float(obs.pct_change().abs().max() * 100), 2)
checks["share_days_unchanged_pct"] = round(float((d1 == 0).mean() * 100), 2)

# ---- daily grid and missingness -------------------------------------------
grid = pd.date_range(raw["date"].min(), raw["date"].max(), freq="D")
daily = pd.DataFrame({"date": grid})
daily["price"] = obs.reindex(grid).to_numpy()
daily["observed"] = daily["price"].notna()
daily["dow"] = daily["date"].dt.day_name()

# gaps between two observations
gap_runs = []
missing = daily.loc[~daily["observed"], "date"]
if len(missing):
    run_start = prev = missing.iloc[0]
    for d in missing.iloc[1:]:
        if (d - prev).days == 1:
            prev = d
        else:
            gap_runs.append((run_start, prev))
            run_start = prev = d
    gap_runs.append((run_start, prev))
gaps = pd.DataFrame(
    [(a.date().isoformat(), b.date().isoformat(), (b - a).days + 1) for a, b in gap_runs],
    columns=["gap_start", "gap_end", "gap_days"],
)

checks["calendar_days_in_span"] = int(len(grid))
checks["missing_calendar_days"] = int((~daily["observed"]).sum())
checks["missing_share_pct"] = round(float((~daily["observed"]).mean() * 100), 2)
checks["gap_runs"] = int(len(gaps))
checks["longest_gap_days"] = int(gaps["gap_days"].max()) if len(gaps) else 0
checks["gaps_ge_7_days"] = int((gaps["gap_days"] >= 7).sum())

# weekday coverage: are weekends genuinely covered?
wd = daily.groupby(daily["date"].dt.day_of_week)["observed"].mean().round(4)
checks["weekday_observed_share"] = {int(k): float(v) for k, v in wd.items()}

# monthly coverage table
monthly = (
    daily.assign(month=daily["date"].dt.to_period("M").astype(str))
    .groupby("month")
    .agg(calendar_days=("date", "size"), observed_days=("observed", "sum"),
         mean_price=("price", "mean"), min_price=("price", "min"), max_price=("price", "max"))
    .reset_index()
)
monthly["coverage_pct"] = (monthly["observed_days"] / monthly["calendar_days"] * 100).round(1)
monthly["mean_price"] = monthly["mean_price"].round(1)

# ---- write -----------------------------------------------------------------
daily.to_csv(cp.PROC / "prices_daily.csv", index=False)
gaps.to_csv(cp.PROC / "data_quality_gaps.csv", index=False)
cp.write_table(monthly, "data_quality_monthly.csv", float_fmt="%.1f")
cp.json_dump(checks, "data_quality.json")

print(f"Observations: {checks['observations']}  "
      f"{checks['first_observation']} .. {checks['last_observation']}")
print(f"Missing calendar days: {checks['missing_calendar_days']} "
      f"({checks['missing_share_pct']}%) in {checks['gap_runs']} runs, "
      f"longest {checks['longest_gap_days']} days")
print(f"Price range: {checks['price_min']:.0f}-{checks['price_max']:.0f} "
      f"(mean {checks['price_mean']:.1f})")
print(f"Duplicates: {checks['duplicate_dates']}, non-numeric cells: "
      f"{checks['non_numeric_nonblank']}, non-integer prices: {checks['non_integer_prices']}")
