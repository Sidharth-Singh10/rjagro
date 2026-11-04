import unittest
from datetime import date, datetime, timezone

from forecast_ledger.core import IST, schedule, evaluate, horizon_bucket, summarize


class LedgerTests(unittest.TestCase):
    def test_ist_offset_is_available_at_runtime(self):
        self.assertEqual(IST.utcoffset(datetime(2026, 11, 4, tzinfo=IST)), __import__('datetime').timedelta(hours=5, minutes=30))

    def test_ist_midnight_closes_previous_day(self):
        s=schedule(datetime(2026,11,4,18,35,tzinfo=timezone.utc))
        self.assertEqual(s['origin'],date(2026,11,4))
        self.assertEqual(s['state'],'due')
        self.assertEqual(s['scheduled'].isoformat(),'2026-11-05T00:05:00+05:30')

    def test_no_backdated_official_runs(self):
        self.assertEqual(schedule(datetime(2026,11,4,18,34,tzinfo=timezone.utc))['state'],'waiting')
        self.assertEqual(schedule(datetime(2026,11,4,19,0,tzinfo=timezone.utc))['state'],'missed')

    def test_score_bias_and_intervals(self):
        p=dict(prediction=110,lo80=95,hi80=115,lo95=90,hi95=120)
        s=evaluate(p,100,datetime(2026,11,5,tzinfo=timezone.utc),datetime(2026,11,4,tzinfo=timezone.utc))
        self.assertEqual(s['error'],10)
        self.assertEqual(s['absolute_error'],10)
        self.assertTrue(s['covered80'])
        self.assertEqual(s['interval_score95'],30)

    def test_known_outcomes_and_deletions_are_not_scored(self):
        t=datetime(2026,11,4,tzinfo=timezone.utc)
        self.assertEqual(evaluate({'prediction':100},100,t,t)['status'],'known_before_publication')
        self.assertEqual(evaluate({'prediction':100},None,None,t)['status'],'unavailable')

    def test_unavailable_intervals_are_not_counted_as_misses(self):
        t=datetime(2026,11,4,tzinfo=timezone.utc)
        e=evaluate({'prediction':100},100,t.replace(day=5),t)
        self.assertIsNone(e['covered80'])

    def test_horizon_edges(self):
        self.assertEqual([horizon_bucket(x) for x in [7,8,30,31,90,91,180,181,365,366]],
                         ['1-7','8-30','8-30','31-90','31-90','91-180','91-180','181-365','181-365','>365'])

    def test_missing_challenger_is_excluded_from_paired_comparison(self):
        rows=[dict(batch_id='a',target_date='2026-11-05',model=m,horizon=1,
                   origin_date='2026-11-04',events=[],**evaluate({'prediction':100},90,
                   datetime(2026,11,5,tzinfo=timezone.utc),datetime(2026,11,4,tzinfo=timezone.utc)))
              for m in ['existing','hybrid','ar1']]
        self.assertEqual(summarize(rows),[])


if __name__=='__main__':
    unittest.main()
