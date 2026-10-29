"""Contract tests for the pipeline.

    PYTHONPATH=. .venv/bin/python tests/test_pipeline.py

They are deliberately plain asserts rather than pytest: the package has no test
dependency, and these are the three things that must never regress.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from cp_pipeline import Config, CsvSource, MemorySource, run  # noqa: E402
from cp_pipeline import models  # noqa: E402
from cp_pipeline.config import PROJECT_DIR  # noqa: E402

CSV = PROJECT_DIR / "data" / "raw" / "RATE TRACKER - Chicken Rate Updated 29⁄10.csv"
PAYLOAD_KEYS = {"schema", "meta", "data", "events", "forecast", "validation", "conclusions", "baseline"}


def test_golden():
    """The packaged pipeline reproduces the number the report was written on."""
    result = run(CsvSource(CSV), Config(), verbose=False, run_id="test")
    payload = result["payload"]
    f = payload["forecast"]

    assert set(payload) >= PAYLOAD_KEYS, set(payload)
    assert f["days"] == 429, f["days"]
    assert f["start"] == "2026-10-29", f["start"]
    assert abs(f["first"] - 89.0) < 0.2, f["first"]
    assert abs(f["lastCentral"] - 99.8) < 0.2, f["lastCentral"]
    assert payload["data"]["observations"] == 425
    assert payload["validation"]["selected"] in models.REGISTRY
    assert 5 <= len(payload["conclusions"]) <= 12

    # payload must survive a JSON round trip with no NaN
    dumped = json.dumps(payload, allow_nan=False)
    assert "NaN" not in dumped
    assert json.loads(dumped)["forecast"]["days"] == 429
    print(f"  golden ok: {f['first']} -> {f['lastCentral']} over {f['days']} days")


def test_model_swap():
    """A different equation changes the numbers without touching anything else."""

    class FlatDrift:
        key = "flat_test"

        def predict(self, train, future, *, train_offsets, future_offsets, cfg):
            level = float(np.log(train.values[-3:]).mean())
            return np.full(len(future), level)

    models.register(FlatDrift())
    cfg = Config()
    cfg = Config(candidates=(*cfg.candidates, "flat_test"), primary_model="flat_test")
    result = run(MemorySource(CsvSource(CSV).load()), cfg, run_id="swap")
    payload = result["payload"]

    f = payload["forecast"]
    spread = max(r["forecast"] for r in f["daily"]) - min(r["forecast"] for r in f["daily"])
    assert spread < 30, f"a flat model should not produce a seasonal swing this large ({spread:.1f})"
    assert payload["meta"]["model"] == "flat_test"
    assert payload["validation"]["selected"] == "flat_test"
    assert any("flat_test" in c["text"] for c in payload["conclusions"])
    print(f"  model swap ok: flat model produced a {spread:.1f} INR spread")


def test_facts_are_the_only_source():
    """Every conclusion must trace back to a fact reference."""
    payload = run(CsvSource(CSV), Config(), run_id="refs")["payload"]
    for c in payload["conclusions"]:
        assert c["refs"], c["id"]
        for ref in c["refs"]:
            head = ref.split(".")[0]
            assert head in payload, f"{c['id']} references missing fact group {ref}"
    print(f"  facts ok: {len(payload['conclusions'])} conclusions, all referenced")


if __name__ == "__main__":
    for fn in (test_golden, test_model_swap, test_facts_are_the_only_source):
        print(fn.__name__)
        fn()
    print("all pipeline tests passed")
