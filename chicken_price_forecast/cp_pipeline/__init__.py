"""Wholesale chicken price pipeline.

    from cp_pipeline import run, Config, CsvSource
    result = run(CsvSource("data/raw/RATE TRACKER - Chicken Rate Updated 29⁄10.csv"))

The three seams are `prices.PriceSource` (where data comes from),
`models.REGISTRY` (the forecast equation) and `conclusions.build` (the words).
Changing any of them does not require touching the others.
"""
from .config import Config
from .prices import CsvSource, DatabaseSource, MemorySource
from .runner import run, STAGES

__all__ = ["Config", "CsvSource", "DatabaseSource", "MemorySource", "run", "STAGES"]
__version__ = "2.0.0"
