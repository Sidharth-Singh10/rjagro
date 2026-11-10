import unittest
from datetime import date, datetime, timedelta, timezone

from forecast_ledger.core import (IST,official_window,pending_origins,evaluate,
                                  horizon_bucket,summarize)


class LedgerTests(unittest.TestCase):
    def test_ist_offset_is_available_at_runtime(self):
        self.assertEqual(IST.utcoffset(datetime(2026, 11, 4, tzinfo=IST)), __import__('datetime').timedelta(hours=5, minutes=30))

    def test_every_recorded_day_after_the_floor_gets_one_batch(self):
        priced=[date(2026,10,31),date(2026,11,1),date(2026,11,2),date(2026,11,3),date(2026,11,4)]
        self.assertEqual(pending_origins(priced,set(),date(2026,11,1)),
                         [date(2026,11,1),date(2026,11,2),date(2026,11,3),date(2026,11,4)])

    def test_a_three_day_import_queues_three_origins_not_one(self):
        priced=[date(2026,10,31),date(2026,11,5),date(2026,11,6),date(2026,11,7)]
        batched={date(2026,10,31)}
        self.assertEqual(pending_origins(priced,batched,date(2026,11,1)),
                         [date(2026,11,5),date(2026,11,6),date(2026,11,7)])

    def test_capture_is_idempotent(self):
        priced=[date(2026,11,1),date(2026,11,2)]
        self.assertEqual(pending_origins(priced,{date(2026,11,1)},date(2026,11,1)),[date(2026,11,2)])
        self.assertEqual(pending_origins(priced,set(priced),date(2026,11,1)),[])

    def test_a_wrong_floor_cannot_queue_the_whole_history(self):
        priced=[date(2026,11,1)+timedelta(days=i) for i in range(100)]
        self.assertEqual(len(pending_origins(priced,set(),date(2026,11,1),limit=30)),30)

    def test_backfill_window_bounds(self):
        start,end=official_window(date(2026,11,4))
        self.assertEqual(start.isoformat(),'2026-11-05T00:05:00+05:30')
        self.assertEqual(end.isoformat(),'2026-11-06T00:00:00+05:30')

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
