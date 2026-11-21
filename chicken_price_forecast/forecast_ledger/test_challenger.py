import unittest
from unittest.mock import Mock, patch
from datetime import date

from forecast_ledger.worker import process
from forecast_ledger.protocol import definition


class ChallengerIntegrationTests(unittest.TestCase):
    def test_disabled_by_default_preserves_four_model_build(self):
        store = Mock()
        job = {"id": "example", "kind": "official", "snapshot": {},
               "origin_date": date(2026, 11, 20)}
        with patch("forecast_ledger.worker.build", return_value=([], {"original": True})):
            process(store, job)
        store.publish.assert_called_once_with(job, [], {"original": True})
        store.fail.assert_not_called()

    def test_candidate_failure_does_not_fail_incumbent_batch(self):
        store = Mock()
        job = {"id": "example", "kind": "official", "origin_date": date(2026, 11, 20),
               "snapshot": {"prices": [{"date": "2026-11-20", "price": 79}]}}
        failure = {"status": "unavailable", "incumbentUnchanged": True}
        with patch("forecast_ledger.worker.build", return_value=([], {})), \
             patch("event_forecast.service.safe_build", return_value=failure):
            process(store, job, event_challenger=True)
        self.assertEqual(store.publish.call_args.args[2]["eventChallenger"], failure)
        store.fail.assert_not_called()

    def test_protocol_explicitly_pins_opt_in_candidate(self):
        old, old_definition = definition()
        new, new_definition = definition(event_challenger=True)
        self.assertNotEqual(old, new)
        self.assertNotIn("eventChallenger", old_definition)
        self.assertEqual(new_definition["eventChallenger"]["role"], "challenger")

    def test_archive_step_failure_is_contained_to_metadata(self):
        store = Mock()
        job = {"id": "example", "kind": "official", "origin_date": date(2026, 11, 20),
               "snapshot": {"prices": [{"date": "not-a-date", "price": 79}]}}
        with patch("forecast_ledger.worker.build", return_value=([], {"original": True})):
            process(store, job, event_challenger=True)
        metadata = store.publish.call_args.args[2]
        self.assertEqual(metadata["original"], True)
        self.assertEqual(metadata["eventChallenger"]["status"], "unavailable")
        self.assertTrue(metadata["eventChallenger"]["incumbentUnchanged"])
        store.fail.assert_not_called()


if __name__ == "__main__":
    unittest.main()
