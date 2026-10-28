"""Step 02 - build and audit the event calendar.

Flattens data/raw/up_chicken_events.json, adds lead-in / recovery windows and
writes an evidence table: how many independent occurrences, how many observed
price days inside each window, and which events overlap each other.

Outputs
    data/processed/event_occurrences.csv
    data/processed/event_days.csv
    outputs/tables/event_coverage.csv
    outputs/tables/event_overlap_pairs.csv
    logs/event_calendar_audit.json
"""
from __future__ import annotations

import itertools

import numpy as np
import pandas as pd

import cplib as cp

et = cp.load_event_calendar()
occ, defs, daily = et.occurrences, et.definitions, et.daily

prices = cp.observed_prices()
obs_days = set(prices.index)

# ---- evidence per occurrence ----------------------------------------------
def obs_in(a, b):
    return sum(1 for d in pd.date_range(a, b) if d in obs_days)

occ["core_days"] = occ["duration_days"]
occ["core_observed_days"] = [obs_in(r.start_date, r.end_date) for r in occ.itertuples()]
occ["influence_days"] = [(r.influence_end - r.influence_start).days + 1 for r in occ.itertuples()]
occ["influence_observed_days"] = [obs_in(r.influence_start, r.influence_end) for r in occ.itertuples()]
occ["has_evidence"] = occ["core_observed_days"] > 0
occ["in_price_sample"] = (occ["start_date"] <= prices.index.max()) & (occ["end_date"] >= prices.index.min())

# ---- evidence per definition ----------------------------------------------
cov = (
    occ.groupby("definition_id")
    .agg(
        name=("name", "first"), category=("category", "first"),
        hypothesised_direction=("hypothesised_direction", "first"),
        calendar_confidence=("calendar_confidence", "first"),
        recurrence=("recurrence", "first"),
        is_regime=("is_regime", "first"),
        occurrences=("year", "size"),
        occurrences_with_price_data=("has_evidence", "sum"),
        core_observed_days=("core_observed_days", "sum"),
        core_days=("core_days", "sum"),
        influence_observed_days=("influence_observed_days", "sum"),
        first_start=("start_date", "min"), last_end=("end_date", "max"),
    )
    .reset_index()
)
cov["core_coverage_pct"] = (cov["core_observed_days"] / cov["core_days"] * 100).round(1)
cov["evidence_class"] = np.select(
    [cov["core_observed_days"] == 0,
     cov["occurrences_with_price_data"] <= 1,
     cov["occurrences_with_price_data"] == 2,
     cov["core_observed_days"] < 10],
    ["none", "single occurrence", "two occurrences", "thin"],
    default="moderate",
)
cov = cov.sort_values(["is_regime", "category", "definition_id"])

# ---- overlaps --------------------------------------------------------------
# share of influence days of A that fall inside an occurrence of B
rows = []
for a, b in itertools.permutations(cov["definition_id"], 2):
    oa = occ[occ.definition_id == a]
    ob = occ[occ.definition_id == b]
    days_a = set()
    for r in oa.itertuples():
        days_a |= set(pd.date_range(r.influence_start, r.influence_end))
    days_b = set()
    for r in ob.itertuples():
        days_b |= set(pd.date_range(r.influence_start, r.influence_end))
    inter = len(days_a & days_b)
    if inter:
        rows.append((a, b, inter, round(inter / len(days_a) * 100, 1)))
ov = pd.DataFrame(rows, columns=["event_a", "event_b", "shared_influence_days", "pct_of_a_days"])
ov = ov.sort_values("shared_influence_days", ascending=False)

# ---- save ------------------------------------------------------------------
occ_out = occ[
    ["definition_id", "name", "category", "year", "start_date", "end_date", "duration_days",
     "lead_start", "lead_days", "rec_days", "rec_end", "influence_start", "influence_end",
     "date_confidence", "hypothesised_direction", "calendar_confidence", "is_regime",
     "core_observed_days", "influence_observed_days", "has_evidence"]
].copy()
for c in ["start_date", "end_date", "lead_start", "rec_end", "influence_start", "influence_end"]:
    occ_out[c] = occ_out[c].dt.strftime("%Y-%m-%d")
occ_out.to_csv(cp.PROC / "event_occurrences.csv", index=False)
daily.assign(date=daily["date"].dt.strftime("%Y-%m-%d")).to_csv(cp.PROC / "event_days.csv", index=False)
cp.write_table(cov, "event_coverage.csv", float_fmt="%.1f")
cp.write_table(ov, "event_overlap_pairs.csv")

audit = {
    "definitions": int(len(defs)),
    "occurrences": int(len(occ)),
    "occurrence_years": sorted(occ["year"].unique().tolist()),
    "window_rules": "<=7d: lead 2 / recovery 2; 8-31d: 1 / 1; >31d: 0 / 0",
    "definitions_with_no_observed_core_days": cov.loc[cov["core_observed_days"] == 0, "definition_id"].tolist(),
    "definitions_with_single_occurrence_evidence":
        cov.loc[cov["evidence_class"] == "single occurrence", "definition_id"].tolist(),
    "total_core_observed_days": int(occ["core_observed_days"].sum()),
    "observed_days": int(len(prices)),
    "date_confidence_counts": occ["date_confidence"].value_counts().to_dict(),
}
# share of observed days covered by at least one core event
core_days = set(daily.loc[daily.role == "core", "date"])
audit["share_observed_days_in_any_core"] = round(len(obs_days & core_days) / len(obs_days), 4)
influ_days = set(daily.date)
audit["share_observed_days_in_any_influence_window"] = round(len(obs_days & influ_days) / len(obs_days), 4)
cp.json_dump(audit, "event_calendar_audit.json")

print(cov[["definition_id", "category", "occurrences", "occurrences_with_price_data",
           "core_observed_days", "evidence_class"]].to_string(index=False))
print("\nObserved days covered by any core event:",
      f"{audit['share_observed_days_in_any_core']*100:.1f}%")
print("Top overlap pairs:")
print(ov.head(8).to_string(index=False))
