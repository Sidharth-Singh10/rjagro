import unittest
from datetime import date
from forecast_ledger.forecasting import series_from_snapshot,bands
import pandas as pd


class SnapshotTests(unittest.TestCase):
    def test_missing_origin_is_blocked(self):
        with self.assertRaisesRegex(ValueError,'Missing origin'):
            series_from_snapshot({'prices':[{'date':'2026-11-03','price':90}]},date(2026,11,4))

    def test_internal_gaps_are_not_filled(self):
        with self.assertRaisesRegex(ValueError,'internal daily gaps'):
            series_from_snapshot({'prices':[{'date':'2026-11-01','price':90},{'date':'2026-11-04','price':94}]},date(2026,11,4))

    def test_no_bands_without_calibration(self):
        self.assertIsNone(bands(pd.DataFrame(),'naive',7))

    def test_partial_bucket_does_not_claim_unseen_horizon_support(self):
        errors = pd.DataFrame([dict(model='naive', h=100, date=d,
            origin=d-pd.Timedelta(days=100), error=.1)
            for d in pd.date_range('2026-01-01', periods=40)])
        self.assertEqual(bands(errors, 'naive', 180)[2], 'unvalidated_sqrt_h_scenario')


if __name__=='__main__':
    unittest.main()
