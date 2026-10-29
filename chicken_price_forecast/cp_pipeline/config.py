"""Configuration and paths for the price pipeline.

Everything that a modeller might want to change lives here or in a config file
that maps onto this dataclass. Nothing downstream reads environment variables.
"""
from __future__ import annotations

import json
from dataclasses import dataclass, field, asdict
from pathlib import Path

PACKAGE_DIR = Path(__file__).resolve().parent
PROJECT_DIR = PACKAGE_DIR.parent
DATA_DIR = PROJECT_DIR / "data"
RAW_DIR = DATA_DIR / "raw"
PROCESSED_DIR = DATA_DIR / "processed"
OUTPUT_DIR = PROJECT_DIR / "outputs"
TABLE_DIR = OUTPUT_DIR / "tables"
CHART_DIR = OUTPUT_DIR / "charts"
LOG_DIR = PROJECT_DIR / "logs"

DEFAULT_EVENTS = RAW_DIR / "up_chicken_events.json"


@dataclass(frozen=True)
class Config:
    """Every knob the pipeline exposes, with today's values as defaults."""

    # ---- horizon -----------------------------------------------------------
    horizon_end: str = "2027-12-31"      # forecast end date, inclusive

    # ---- calendar model ----------------------------------------------------
    fourier_harmonics: int = 1           # one annual harmonic; two lost out of sample
    anchor_observations: int = 3         # level = mean of the last N residuals
    include_weekday: bool = True
    include_trend: bool = False          # trend is not identified; see REPORT.md §4.1

    # ---- event study -------------------------------------------------------
    match_days: int = 14                 # symmetric comparison window either side
    bootstrap_reps: int = 2000
    bootstrap_block_days: int = 7
    shrinkage_tau_between: float = 0.04  # category ~ N(0, tau_between^2)

    # ---- backtest ----------------------------------------------------------
    origin_start: str = "2026-04-01"     # first origin with a full annual cycle
    origin_end: str = "2026-09-01"
    origin_step_days: int = 14
    max_horizon_days: int = 90
    backtest_bootstrap: int = 300      # draws per origin; lower than the final run
    selection_metric: str = "smape_1_28"

    # ---- models ------------------------------------------------------------
    # Order matters only for tie-breaking; selection is by the metric above.
    candidates: tuple[str, ...] = (
        "anchor_events", "anchor", "ma7", "ma7_events", "ets_weekly",
    )
    # The model used for the published forecast.
    #
    # Pinned to the structural model rather than to the backtest winner on
    # purpose: a 7-day mean carried flat wins every tested horizon (1-90 days)
    # because prices are persistent, but it has no seasonal shape and so says
    # nothing about 2027. The structural model is within a point of it at
    # 1-28 days and is the only candidate that can produce a 14-month path with
    # a baseline/event split. The persistence models stay in the candidate list
    # and their accuracy is reported next to it.
    # Set to "best" to let the backtest choose instead.
    primary_model: str = "anchor_events"

    # ---- intervals ---------------------------------------------------------
    interval_power_floor: float = 0.10
    interval_power_ceiling: float = 0.70

    # ---- copy --------------------------------------------------------------
    market: str = "Uttar Pradesh (statewide wholesale)"
    unit: str = "INR/kg"
    price_definition: str = "chicken wholesale sold rate, live weight"

    extra: dict = field(default_factory=dict)

    # ------------------------------------------------------------------------
    def to_dict(self) -> dict:
        d = asdict(self)
        d["candidates"] = list(self.candidates)
        return d

    def fingerprint(self) -> str:
        import hashlib
        return hashlib.sha256(
            json.dumps(self.to_dict(), sort_keys=True).encode()
        ).hexdigest()[:16]

    @classmethod
    def load(cls, path: str | Path | None) -> "Config":
        """Load a JSON or TOML override file, falling back to defaults."""
        if not path:
            return cls()
        p = Path(path)
        if not p.exists():
            raise FileNotFoundError(p)
        if p.suffix == ".toml":
            import tomllib
            data = tomllib.loads(p.read_text())
        else:
            data = json.loads(p.read_text())
        if "candidates" in data:
            data["candidates"] = tuple(data["candidates"])
        known = {f for f in cls.__dataclass_fields__}
        unknown = set(data) - known
        if unknown:
            raise ValueError(f"unknown config keys: {sorted(unknown)}")
        return cls(**data)
