"""Versioned calendar inputs. Name avoids shadowing Python's calendar module."""
from dataclasses import dataclass, replace
import hashlib
import json
from pathlib import Path

import numpy as np
import pandas as pd

from cp_pipeline.config import DEFAULT_EVENTS

OVERLAY = Path(__file__).with_name("calendar-v1.json")
GROUPS = ("festival", "observance", "islamic", "fair", "sawan", "ramadan")
EXCLUDED = {"lagan-weddings", "deepotsav", "summer-heat", "monsoon",
            "winter-fog", "magh-mela", "heatwave-2025"}


@dataclass(frozen=True)
class EventCalendar:
    base: dict
    overlay: dict
    occurrences: tuple
    weddings: frozenset
    start: str
    end: str
    shift_days: int = 0

    @classmethod
    def load(cls, base_path=DEFAULT_EVENTS, overlay_path=OVERLAY):
        return cls.from_documents(
            json.loads(Path(base_path).read_text()),
            json.loads(Path(overlay_path).read_text()),
        )

    @classmethod
    def from_documents(cls, base, overlay):
        # Roundtrip severs aliases to callers; frozen documents travel with issuance.
        base, overlay = json.loads(json.dumps([base, overlay], allow_nan=False))
        definitions = {d["id"]: d for d in base["definitions"]}
        if len(definitions) != len(base["definitions"]):
            raise ValueError("Duplicate calendar definitions")
        start, end = overlay["coverageStart"], overlay["coverageEnd"]
        if pd.Timestamp(start) > pd.Timestamp(end):
            raise ValueError("Invalid calendar coverage")
        corrections = {(c["id"], c["year"]): c for c in overlay["corrections"]}
        occurrences = []
        for row in base["occurrences"]:
            definition = definitions.get(row["definition_id"])
            if definition is None:
                raise ValueError("Unknown event definition")
            correction = corrections.get((row["definition_id"], row["year"]), {})
            a = pd.Timestamp(correction.get("start", row["start_date"]))
            b = pd.Timestamp(correction.get("end", row["end_date"]))
            if pd.isna(a) or pd.isna(b) or a > b:
                raise ValueError("Invalid event dates")
            group = row["definition_id"] if row["definition_id"] in ("sawan", "ramadan") else definition["category"]
            occurrences.append((row["definition_id"], group, a, b,
                                row["date_confidence"] == "tentative"))
        weddings = []
        for year, months in overlay["weddings"].items():
            for month, days in months.items():
                weddings.extend(pd.Timestamp(int(year), int(month), day) for day in days)
        if len(set(weddings)) != len(weddings):
            raise ValueError("Duplicate muhurat dates")
        return cls(base, overlay, tuple(occurrences), frozenset(weddings), start, end)

    @property
    def fingerprint(self):
        return hashlib.sha256(json.dumps(self.documents(), sort_keys=True).encode()).hexdigest()

    def documents(self):
        return {"base": self.base, "overlay": self.overlay, "shiftDays": self.shift_days}

    def shifted(self, days):
        """Falsification only: shifts all event features, never annual terms."""
        return replace(self, shift_days=self.shift_days + days)

    def design(self, dates, *, annual=False, halo=7, tentative=True):
        dates = pd.DatetimeIndex(dates)
        phase = (dates - pd.Timestamp("2025-01-01")).days.to_numpy() * 2 * np.pi / 365.25
        columns, names = [np.ones(len(dates))], ["constant"]
        if annual:
            columns += [np.sin(phase), np.cos(phase)]
            names += ["annual_sin", "annual_cos"]
        columns += [(dates.day_of_week == k).astype(float) for k in range(1, 7)]
        names += [f"weekday{k}" for k in range(1, 7)]
        event_dates = dates - pd.Timedelta(days=self.shift_days)
        for group in GROUPS:
            for role in ("lead", "core", "recovery"):
                v = np.zeros(len(dates))
                for eid, category, a, b, uncertain in self.occurrences:
                    if category != group or eid in EXCLUDED or (uncertain and not tentative):
                        continue
                    lo, hi = ((a - pd.Timedelta(days=halo), a - pd.Timedelta(days=1))
                              if role == "lead" else (a, b) if role == "core" else
                              (b + pd.Timedelta(days=1), b + pd.Timedelta(days=halo)))
                    # Union, not sum: duplicate/overlapping same-group exposure is capped.
                    v = np.maximum(v, ((event_dates >= lo) & (event_dates <= hi)).astype(float))
                columns.append(v)
                names.append(f"{group}:{role}")
        for role, offsets in (("lead", range(1, halo + 1)), ("core", (0,)),
                              ("recovery", range(-halo, 0))):
            columns.append(np.array([
                sum(d + pd.Timedelta(days=k) in self.weddings for k in offsets) / len(offsets)
                for d in event_dates
            ]))
            names.append(f"wedding:{role}")
        return np.column_stack(columns), names
