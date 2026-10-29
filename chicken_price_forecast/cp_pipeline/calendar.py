"""The event calendar: definitions, occurrences, windows and evidence.

The supplied JSON is the source of truth. Nothing here estimates anything; it
only decides which dates an event touches and which events are long seasonal
phases rather than discrete shocks.
"""
from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import pandas as pd

# Events that cover most of the calendar and are therefore indistinguishable
# from annual seasonality with 1.5 cycles of history.
REGIME_EVENTS = {
    "summer-heat", "monsoon", "winter-fog", "sawan", "ramadan", "magh-mela", "heatwave-2025",
}


@dataclass
class Calendar:
    definitions: pd.DataFrame
    occurrences: pd.DataFrame
    daily: pd.DataFrame          # date, definition_id, role

    # ---- conveniences ------------------------------------------------------
    @property
    def discrete(self) -> pd.DataFrame:
        return self.occurrences[~self.occurrences["is_regime"]]

    def core_windows(self) -> dict[pd.Timestamp, list[str]]:
        """date -> discrete event ids whose official dates cover it."""
        out: dict[pd.Timestamp, list[str]] = {}
        for _, r in self.discrete.iterrows():
            for d in pd.date_range(r.start_date, r.end_date):
                out.setdefault(d, []).append(r.definition_id)
        return out

    def coverage(self, observed: pd.DatetimeIndex) -> pd.DataFrame:
        obs = set(observed)
        rows = []
        for eid, g in self.occurrences.groupby("definition_id"):
            total = int((g.end_date - g.start_date).dt.days.add(1).sum())
            with_quotes = int(sum(
                1 for r in g.itertuples()
                for d in pd.date_range(r.start_date, r.end_date) if d in obs
            ))
            rows.append({
                "definition_id": eid,
                "name": g["name"].iloc[0],
                "category": g["category"].iloc[0],
                "occurrences": int(len(g)),
                "occurrences_with_quotes": int(g.apply(
                    lambda r: any(d in obs for d in pd.date_range(r.start_date, r.end_date)),
                    axis=1).sum()),
                "core_days": total,
                "observed_days": with_quotes,
                "coverage_pct": round(100 * with_quotes / total, 1) if total else 0.0,
            })
        return pd.DataFrame(rows).sort_values(["observed_days", "definition_id"])


def _halo(duration: int) -> tuple[int, int]:
    if duration <= 7:
        return 2, 2
    if duration <= 31:
        return 1, 1
    return 0, 0


def load(path: str | Path) -> Calendar:
    blob = json.loads(Path(path).read_text())
    defs = pd.DataFrame(blob["definitions"])
    occ = pd.DataFrame(blob["occurrences"])

    occ["start_date"] = pd.to_datetime(occ["start_date"])
    occ["end_date"] = pd.to_datetime(occ["end_date"])
    occ["duration_days"] = (occ["end_date"] - occ["start_date"]).dt.days + 1

    halos = occ["duration_days"].map(_halo)
    occ["lead_days"] = [h[0] for h in halos]
    occ["rec_days"] = [h[1] for h in halos]
    occ["lead_start"] = occ["start_date"] - pd.to_timedelta(occ["lead_days"], unit="D")
    occ["rec_end"] = occ["end_date"] + pd.to_timedelta(occ["rec_days"], unit="D")
    occ["influence_start"] = occ["lead_start"]
    occ["influence_end"] = occ["rec_end"]
    occ["is_regime"] = occ["definition_id"].isin(REGIME_EVENTS)

    occ = occ.merge(
        defs[["id", "name", "category", "expected_price_impact", "impact_confidence",
              "recurrence", "impact_mechanism", "description"]],
        left_on="definition_id", right_on="id", how="left",
    ).rename(columns={"expected_price_impact": "hypothesised_direction",
                      "impact_confidence": "calendar_confidence"})
    occ = occ.sort_values(["start_date", "definition_id"]).reset_index(drop=True)

    rows = []
    for r in occ.itertuples():
        for d in pd.date_range(r.lead_start, r.rec_end):
            role = "lead" if d < r.start_date else ("recovery" if d > r.end_date else "core")
            rows.append((d, r.definition_id, role))
    daily = pd.DataFrame(rows, columns=["date", "definition_id", "role"]).drop_duplicates()

    return Calendar(defs, occ, daily)


def active_events(dates, windows: dict[pd.Timestamp, list[str]]) -> list[str]:
    """Comma-joined event ids per date, for the daily forecast table."""
    return [", ".join(sorted(windows.get(d, []))) for d in pd.DatetimeIndex(dates)]
