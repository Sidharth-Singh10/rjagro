"""Step 04 - historical event impact estimation (reporting layer).

The estimator itself lives in ``effects.py`` so that the backtest in step 05
re-runs exactly the same logic with a data cut-off. This script only formats
and exports the results.

Method in one paragraph: for every event occurrence, the mean log price inside
the official event dates is compared with the mean log price in a symmetric
14-day window immediately before and after, excluding core days of other
discrete events. Uncertainty is a circular block bootstrap of the local price
path. Occurrence effects are pooled per event with a random-effects model, then
shrunk toward a pooled category effect (three-level empirical Bayes). Regime
events (monsoon, summer heat, winter fog, Sawan, Ramadan, Magh Mela, the 2025
heat wave) are not estimated here because they cover most of the sample and are
not separately identifiable from annual seasonality.

Outputs
    outputs/tables/historical_event_occurrences.csv
    outputs/tables/historical_event_impact.csv
    outputs/tables/category_effects.csv
    outputs/tables/halo_pooling.csv
    data/processed/event_effects.json
    logs/event_impacts.json
"""
from __future__ import annotations

import warnings

import numpy as np
import pandas as pd

import cplib as cp
import effects as fx

warnings.filterwarnings("ignore", message="Mean of empty slice")
warnings.filterwarnings("ignore", message="All-NaN slice encountered")

Z80, Z95 = 1.281552, 1.959964
BOOT = 2000

prices = cp.observed_prices()
et = cp.load_event_calendar()

oc, pl = fx.estimate(prices, et, cutoff=None, boot=BOOT)

pl["reliability"] = [
    fx.reliability(int(n), int(d), np.isfinite(delta))
    for n, d, delta in zip(pl["n_occ"], pl["core_observed_days"], pl["delta_core"])
]
pl["notes"] = np.where(
    pl["n_occ"] == 0,
    "no usable observed price inside the event window; estimate is the category prior only",
    np.where(pl["n_occ"] == 1, "single historical occurrence", ""))


def pct(x):
    return (np.exp(x) - 1) * 100


imp = pd.DataFrame({
    "definition_id": pl["definition_id"],
    "event": pl["event"],
    "category": pl["category"],
    "hypothesised_direction": pl["hypothesised_direction"],
    "calendar_date_confidence": pl["calendar_confidence"],
    "n_occurrences_total": pl["occurrences_total"],
    "n_occurrences_with_observed_prices": pl["n_occ"].astype(int),
    "n_observed_days_core": pl["core_observed_days"].astype(int),
    "n_observed_days_influence": pl["influence_observed_days"].astype(int),
    "observed_mean_price_inr": pl["observed_price_inr"].round(2),
    "estimated_baseline_price_inr": pl["baseline_price_inr"].round(2),
    "estimated_absolute_impact_inr": (pl["observed_price_inr"] - pl["baseline_price_inr"]).round(2),
    "raw_effect_pct": pct(pl["delta_core"]).round(2),
    "raw_se_pct": (pl["se_core"] * 100).round(2),
    "raw_ci80_lo_pct": pct(pl["delta_core"] - Z80 * pl["se_core"]).round(2),
    "raw_ci80_hi_pct": pct(pl["delta_core"] + Z80 * pl["se_core"]).round(2),
    "raw_ci95_lo_pct": pct(pl["delta_core"] - Z95 * pl["se_core"]).round(2),
    "raw_ci95_hi_pct": pct(pl["delta_core"] + Z95 * pl["se_core"]).round(2),
    "shrunk_effect_pct": pct(pl["delta_shrunk"]).round(2),
    "shrunk_se_pct": (pl["se_shrunk"] * 100).round(2),
    "shrunk_ci80_lo_pct": pct(pl["delta_shrunk"] - Z80 * pl["se_shrunk"]).round(2),
    "shrunk_ci80_hi_pct": pct(pl["delta_shrunk"] + Z80 * pl["se_shrunk"]).round(2),
    "shrunk_ci95_lo_pct": pct(pl["delta_shrunk"] - Z95 * pl["se_shrunk"]).round(2),
    "shrunk_ci95_hi_pct": pct(pl["delta_shrunk"] + Z95 * pl["se_shrunk"]).round(2),
    "influence_window_effect_pct": pct(pl["delta_influence"]).round(2),
    "influence_window_se_pct": (pl["se_influence"] * 100).round(2),
    "weight_on_own_evidence": pl["weight_own"].round(3),
    "category_prior_effect_pct": pct(pl["prior"]).round(2),
    "between_event_tau_pct": (np.sqrt(pl["tau2"]) * 100).round(2),
    "occurrence_min_pct": pl["occ_min_pct"].round(2),
    "occurrence_max_pct": pl["occ_max_pct"].round(2),
    "occurrence_sd_pct": pl["occ_sd_pct"].round(2),
    "median_lead_in_pct": pl["median_lead_pct"].round(2),
    "median_recovery_pct": pl["median_recovery_pct"].round(2),
    "share_occurrences_overlapping_other_events_pct": pl["overlap_share_pct"].round(1),
    "reliability": pl["reliability"],
    "notes": pl["notes"],
}).sort_values("raw_effect_pct", ascending=False).reset_index(drop=True)

cats = []
for c, d in oc.groupby("category"):
    re = fx.random_effects(d["delta_core"], d["se_core"])
    w = 1 / max(re["se"], 1e-6) ** 2
    wp = 1 / fx.TAU_BETWEEN
    mu_s = (w * re["mu"]) / (w + wp)
    se_s = float(np.sqrt(1 / (w + wp)))
    cats.append({"category": c, "n_occurrences": re["n"],
                 "n_events": int(pl.loc[pl["category"] == c, "definition_id"].nunique()),
                 "raw_pooled_pct": pct(re["mu"]), "raw_pooled_se_pct": re["se"] * 100,
                 "pooled_effect_pct": pct(mu_s), "pooled_se_pct": se_s * 100,
                 "pooled_ci80_lo_pct": pct(mu_s - Z80 * se_s),
                 "pooled_ci80_hi_pct": pct(mu_s + Z80 * se_s),
                 "pooled_ci95_lo_pct": pct(mu_s - Z95 * se_s),
                 "pooled_ci95_hi_pct": pct(mu_s + Z95 * se_s)})
cat = pd.DataFrame(cats).sort_values("pooled_effect_pct", ascending=False)
for c in cat.columns:
    if cat[c].dtype.kind == "f":
        cat[c] = cat[c].round(2)

halo_rows = []
for col, lab in [("effect_lead_pct", "lead_in"), ("effect_recovery_pct", "recovery")]:
    d = oc[np.isfinite(oc[col]) & np.isfinite(oc["effect_core_pct"])]
    if len(d) >= 5:
        ratio = d[col] / d["effect_core_pct"].replace(0, np.nan)
        halo_rows.append({
            "window": lab, "n_occurrences": int(len(d)),
            "mean_window_pct": round(float(d[col].mean()), 2),
            "median_window_pct": round(float(d[col].median()), 2),
            "median_ratio_to_core": round(float(ratio.replace([np.inf, -np.inf], np.nan).median()), 3),
            "corr_with_core": round(float(np.corrcoef(d[col], d["effect_core_pct"])[0, 1]), 3)})
halo = pd.DataFrame(halo_rows)

oc_out = oc.copy()
for c in ["start_date", "end_date"]:
    oc_out[c] = pd.to_datetime(oc_out[c]).dt.strftime("%Y-%m-%d")
oc_out.drop(columns=["delta_core", "se_core", "delta_influence", "se_influence"]).to_csv(
    cp.TABLES / "historical_event_occurrences.csv", index=False, float_format="%.2f")
cp.write_table(imp, "historical_event_impact.csv", float_fmt="%.2f")
cp.write_table(cat, "category_effects.csv", float_fmt="%.2f")
cp.write_table(halo, "halo_pooling.csv", float_fmt="%.3f")

effects_json = {}
for _, r in pl.iterrows():
    effects_json[r["definition_id"]] = {
        "category": r["category"], "reliability": r["reliability"],
        "n_occ": int(r["n_occ"]), "n_days_core": int(r["core_observed_days"]),
        "delta_core": None if not np.isfinite(r["delta_core"]) else float(r["delta_core"]),
        "se_core": None if not np.isfinite(r["se_core"]) else float(r["se_core"]),
        "delta_shrunk": float(r["delta_shrunk"]), "se_shrunk": float(r["se_shrunk"]),
        "effect_shrunk_pct": float(pct(r["delta_shrunk"])),
        "delta_influence": None if not np.isfinite(r["delta_influence"]) else float(r["delta_influence"]),
        "se_influence": None if not np.isfinite(r["se_influence"]) else float(r["se_influence"]),
    }
cp.json_dump({"effects": effects_json, "tau2_core": float(pl["tau2"].iloc[0]),
              "bootstrap": {"reps": BOOT, "block_days": fx.BOOT_BLOCK, "match_days": fx.MATCH_DAYS}},
             "event_effects.json")

print(imp[["definition_id", "category", "n_occurrences_with_observed_prices", "n_observed_days_core",
           "raw_effect_pct", "raw_ci95_lo_pct", "raw_ci95_hi_pct", "shrunk_effect_pct",
           "shrunk_ci80_lo_pct", "shrunk_ci80_hi_pct", "reliability"]].to_string(index=False))
print("\nCategory effects:")
print(cat.to_string(index=False))
print("\nHalo pooling:")
print(halo.to_string(index=False))
