"""Price sources and the data audit.

A source's only job is to yield an observed series: date -> price, no gaps, no
zeros. Where it comes from (a spreadsheet, Postgres, a test fixture) is not the
pipeline's concern.
"""
from __future__ import annotations

import csv
import datetime as dt
import os
from dataclasses import dataclass
from typing import Protocol

import numpy as np
import pandas as pd

MONTHS = {m: i + 1 for i, m in enumerate(
    ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"])}


class PriceSource(Protocol):
    def load(self) -> pd.Series:
        """Observed prices indexed by date, ascending, unique."""
    def describe(self) -> dict:
        """Provenance recorded in the run (path, table, hash, ...)."""


# ---------------------------------------------------------------------------
# sources
# ---------------------------------------------------------------------------
class CsvSource:
    """The hand-maintained tracker sheet: two title rows, a header, then
    `d-Mon-yyyy,price` with blank cells meaning 'no quote'."""

    def __init__(self, path: str | os.PathLike):
        self.path = str(path)

    def load(self) -> pd.Series:
        rows = list(csv.reader(open(self.path, newline="", encoding="utf-8")))
        dates: list[pd.Timestamp] = []
        values: list[float] = []
        for row in rows[3:]:
            if not row or not row[0].strip():
                continue
            raw_date = row[0].strip()
            cell = row[1].strip() if len(row) > 1 else ""
            try:
                day, mon, year = raw_date.split("-")
                d = pd.Timestamp(int(year), MONTHS[mon.lower()[:3]], int(day))
            except Exception as exc:  # noqa: BLE001 - report, don't guess
                raise ValueError(f"unreadable date {raw_date!r} in {self.path}") from exc
            if cell == "":
                continue
            dates.append(d)
            values.append(float(cell))
        s = pd.Series(values, index=pd.DatetimeIndex(dates), dtype=float).sort_index()
        return _clean(s, self.path)

    def describe(self) -> dict:
        import hashlib
        h = hashlib.sha256(open(self.path, "rb").read()).hexdigest()[:16]
        return {"kind": "csv", "path": self.path, "sha256_16": h}


class DatabaseSource:
    """The `chicken_prices` table written by the app."""

    def __init__(self, dsn: str | None = None):
        self.dsn = dsn or os.environ.get("DATABASE_URL", "")
        if not self.dsn:
            raise RuntimeError("DATABASE_URL is required for the database source")

    def load(self) -> pd.Series:
        import psycopg
        with psycopg.connect(self.dsn) as conn, conn.cursor() as cur:
            cur.execute("SET TRANSACTION READ ONLY")
            cur.execute("SELECT price_date, price FROM chicken_prices ORDER BY price_date")
            rows = cur.fetchall()
        s = pd.Series(
            [float(p) for _, p in rows],
            index=pd.DatetimeIndex([d for d, _ in rows]),
            dtype=float,
        )
        return _clean(s, "chicken_prices")

    def describe(self) -> dict:
        return {"kind": "database", "table": "chicken_prices"}


class MemorySource:
    """Tests and ad-hoc runs: pass a dict or series directly."""

    def __init__(self, series: pd.Series | dict):
        self._s = pd.Series(series)

    def load(self) -> pd.Series:
        s = self._s.copy()
        s.index = pd.DatetimeIndex(s.index)
        return _clean(s.sort_index(), "memory")

    def describe(self) -> dict:
        return {"kind": "memory"}


def _clean(s: pd.Series, origin: str) -> pd.Series:
    if s.empty:
        raise ValueError(f"no priced days in {origin}")
    if s.index.has_duplicates:
        dupes = s.index[s.index.duplicated()].unique()
        raise ValueError(f"duplicate dates in {origin}: {dupes[:5].tolist()}")
    if (s <= 0).any():
        raise ValueError(f"non-positive price in {origin}")
    return s.astype(float)


# ---------------------------------------------------------------------------
# audit
# ---------------------------------------------------------------------------
@dataclass
class PriceAudit:
    observations: int
    first: str
    last: str
    span_days: int
    missing_days: int
    missing_pct: float
    gap_runs: int
    longest_gap: int
    gaps_ge_7: int
    mean: float
    median: float
    minimum: float
    maximum: float
    unchanged_pct: float
    daily_change_sd_pct: float
    gaps: list[dict]
    source: dict

    def to_dict(self) -> dict:
        d = self.__dict__.copy()
        return d


def audit(series: pd.Series, source: dict) -> PriceAudit:
    first, last = series.index.min(), series.index.max()
    span = pd.date_range(first, last, freq="D")
    missing = span.difference(series.index)
    gaps: list[dict] = []
    if len(missing):
        run = [missing[0]]
        for d in missing[1:]:
            if (d - run[-1]).days == 1:
                run.append(d)
            else:
                gaps.append({"from": run[0].date().isoformat(),
                             "to": run[-1].date().isoformat(),
                             "days": (run[-1] - run[0]).days + 1})
                run = [d]
        gaps.append({"from": run[0].date().isoformat(),
                     "to": run[-1].date().isoformat(),
                     "days": (run[-1] - run[0]).days + 1})

    changes = series.pct_change().dropna()
    return PriceAudit(
        observations=int(len(series)),
        first=first.date().isoformat(),
        last=last.date().isoformat(),
        span_days=int(len(span)),
        missing_days=int(len(missing)),
        missing_pct=round(float(len(missing) / len(span) * 100), 2),
        gap_runs=len(gaps),
        longest_gap=max((g["days"] for g in gaps), default=0),
        gaps_ge_7=sum(1 for g in gaps if g["days"] >= 7),
        mean=round(float(series.mean()), 2),
        median=float(series.median()),
        minimum=float(series.min()),
        maximum=float(series.max()),
        unchanged_pct=round(float((series.diff() == 0).mean() * 100), 2),
        daily_change_sd_pct=round(float(changes.std() * 100), 2),
        gaps=gaps,
        source=source,
    )


def dataset_hash(series: pd.Series) -> str:
    import hashlib
    payload = "\n".join(f"{d.date().isoformat()},{p:.2f}" for d, p in series.items())
    return hashlib.sha256(payload.encode()).hexdigest()[:16]
