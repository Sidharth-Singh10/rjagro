"""End-to-end fit from the approved MCP fixture, with no database access/writes."""
import json
import math
import unittest
from pathlib import Path

from forecast_ledger.forecasting import build
from reassessment.core import load_snapshot


class BuildTests(unittest.TestCase):
    def test_four_models_share_complete_aligned_forecast_grid(self):
        source = Path(__file__).resolve().parents[1] / 'reassessment/input/database_snapshot.json'
        prices, provenance = load_snapshot(source)
        self.assertEqual(provenance['profile'], 'rjagro')
        snapshot = {'prices': [dict(date=str(d.date()), price=float(p)) for d, p in prices.items()]}
        rows, metadata = build(snapshot, prices.index[-1].date())
        json.dumps(metadata, allow_nan=False)
        self.assertEqual(len(rows), 4 * (prices.index[-1].replace(year=2027, month=12, day=31) - prices.index[-1]).days)
        self.assertEqual(len({(r['model'], r['target_date']) for r in rows}), len(rows))
        self.assertEqual({r['model'] for r in rows}, {'existing', 'hybrid', 'ar1', 'naive'})
        for r in rows:
            self.assertTrue(math.isfinite(r['prediction']) and r['prediction'] > 0)
            if r['model'] == 'naive' or (r['model'] == 'hybrid' and 8 <= r['horizon'] <= 30):
                self.assertAlmostEqual(r['prediction'], prices.iloc[-1])
            if r['lo80'] is not None:
                self.assertLessEqual(r['lo95'], r['lo80'])
                self.assertLessEqual(r['lo80'], r['prediction'])
                self.assertLessEqual(r['prediction'], r['hi80'])
                self.assertLessEqual(r['hi80'], r['hi95'])
        by_key = {(r['model'], r['target_date']): r for r in rows}
        for r in rows:
            if r['model'] == 'hybrid' and r['horizon'] > 30:
                ar1 = by_key['ar1', r['target_date']]['prediction']
                self.assertAlmostEqual(r['prediction'], (prices.iloc[-1] + ar1) / 2)
