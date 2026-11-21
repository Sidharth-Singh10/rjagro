import dataclasses
import json
import unittest
from unittest.mock import patch

import numpy as np
import pandas as pd

from event_forecast.model import Config, fit
from event_forecast.service import build, safe_build
from event_forecast.uncertainty import calibrate, simulate, period_summary
from event_forecast.test_model import history


class IntervalTests(unittest.TestCase):
    def test_paths_and_weekly_means_are_reproducible_and_positive(self):
        model = fit(history(), config=Config(draws=200))
        dates = pd.date_range(model.cutoff + pd.Timedelta(days=1), periods=30)
        a, b = simulate(model, dates), simulate(model, dates)
        np.testing.assert_array_equal(a, b)
        self.assertTrue(np.isfinite(a).all() and (a > 0).all())
        summary = period_summary(a[:, :7], model.predict(dates).prediction[:7])
        means = a[:, :7].mean(axis=1)
        self.assertAlmostEqual(summary["lo95"], np.quantile(means, .025))
        self.assertAlmostEqual(summary["hi95"], np.quantile(means, .975))
        self.assertEqual(summary["intervalStatus"], "uncalibrated_path_scenario")

    def test_calibration_cannot_see_unmatured_outcomes(self):
        rows = pd.DataFrame([
            {"origin": pd.Timestamp("2025-01-01") + pd.Timedelta(days=i % 5),
             "date": pd.Timestamp("2025-02-01") + pd.Timedelta(days=i),
             "horizon": 1, "prediction": 100., "actual": 100.}
            for i in range(40)
        ])
        cutoff = pd.Timestamp("2025-04-01")
        q = calibrate(rows, cutoff, [1, 60])
        self.assertEqual(q[0]["status"], "empirical_dependent_calibration")
        self.assertEqual(q[1]["status"], "uncalibrated_path_scenario")
        future = rows.copy()
        future["date"] += pd.Timedelta(days=365)
        future["actual"] = .01
        self.assertEqual(q, calibrate(pd.concat([rows, future]), cutoff, [1, 60]))

    def test_service_archives_calendar_and_log_components(self):
        result = build(history(), end="2026-06-21", config=Config(draws=100))
        json.dumps(result, allow_nan=False)
        self.assertEqual(result["status"], "ready")
        self.assertEqual(result["role"], "challenger")
        self.assertEqual(len(result["calendarHash"]), 64)
        self.assertIn("base", result["calendar"])
        row = result["daily"][0]
        reconstructed = np.exp(sum(row[k] for k in
                                  ("levelLog", "seasonalLog", "eventLog", "recentLog")))
        # Archive contract: prices at 2 dp, log components at 5 dp.
        self.assertAlmostEqual(row["prediction"], reconstructed, places=2)
        self.assertLessEqual(row["lo95"], row["lo80"])
        self.assertLessEqual(row["hi80"], row["hi95"])
        self.assertEqual(result["metadata"]["promotion"], "not_promoted")

    def test_candidate_failure_is_explicit_not_relabelled_persistence(self):
        with patch("event_forecast.service.build", side_effect=ValueError("bad calendar")):
            result = safe_build(history())
        self.assertEqual(result["status"], "unavailable")
        self.assertNotIn("daily", result)
        self.assertTrue(result["incumbentUnchanged"])

    def test_empty_calibration_uses_scenario_not_claimed_nominal_coverage(self):
        self.assertTrue(all(x["q80"] is None for x in calibrate(
            pd.DataFrame(), pd.Timestamp("2026-01-01"), [1, 7, 30]
        )))


if __name__ == "__main__":
    unittest.main()
