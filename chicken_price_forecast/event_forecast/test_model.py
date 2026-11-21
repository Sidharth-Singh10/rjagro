import dataclasses
import unittest

import numpy as np
import pandas as pd

from event_forecast.calendar_data import EventCalendar
from event_forecast.model import Config, fit


def history():
    dates = pd.date_range("2025-04-01", periods=440)
    y = 4.6 + .06 * np.sin(np.arange(len(dates)) / 19)
    return pd.Series(np.exp(y), index=dates)


class ModelTests(unittest.TestCase):
    def setUp(self):
        self.calendar = EventCalendar.load()
        self.prices = history()

    def test_calendar_shift_leaves_annual_terms_unchanged(self):
        dates = pd.date_range("2027-01-01", periods=40)
        moved = self.calendar.shifted(14)
        a, names = self.calendar.design(dates, annual=True)
        b, other = moved.design(dates, annual=True)
        self.assertEqual(names, other)
        np.testing.assert_array_equal(a[:, :9], b[:, :9])
        self.assertFalse(np.array_equal(a[:, 9:], b[:, 9:]))

    def test_exact_wedding_dates_and_density_not_broad_season(self):
        dates = pd.date_range("2027-01-01", "2027-01-31")
        x, names = self.calendar.design(dates)
        core = x[:, names.index("wedding:core")]
        self.assertEqual(int(core.sum()), 9)
        self.assertEqual(core[14], 1)
        self.assertEqual(core[15], 0)
        self.assertEqual(x[7, names.index("wedding:lead")], 1 / 7)

    def test_duplicate_occurrences_do_not_multiply_exposure(self):
        dates = pd.date_range("2026-05-01", periods=40)
        duplicate = dataclasses.replace(
            self.calendar, occurrences=self.calendar.occurrences * 2
        )
        np.testing.assert_array_equal(
            self.calendar.design(dates)[0], duplicate.design(dates)[0]
        )

    def test_components_reconstruct_positive_deterministic_forecast(self):
        model = fit(self.prices, self.calendar)
        dates = pd.date_range(self.prices.index[-1] + pd.Timedelta(days=1), periods=60)
        a = model.predict(dates)
        b = fit(self.prices.copy(), self.calendar).predict(dates)
        np.testing.assert_array_equal(a.prediction, b.prediction)
        np.testing.assert_allclose(
            a.prediction,
            np.exp(a.level_log + a.seasonal_log + a.event_log + a.recent_log),
        )
        self.assertTrue((a.prediction > 0).all())
        self.assertEqual(model.config.annual, False)
        self.assertNotIn("january", " ".join(model.names).lower())

    def test_strict_cutoff_rejects_gaps_duplicates_nan_and_negative(self):
        invalid = [
            self.prices.drop(self.prices.index[10]),
            pd.concat([self.prices, self.prices.iloc[[-1]]]),
            self.prices.mask(self.prices.index == self.prices.index[10]),
            -self.prices,
        ]
        for series in invalid:
            with self.subTest(series=len(series)), self.assertRaises(ValueError):
                fit(series, self.calendar)

    def test_forecast_must_start_after_training_and_stay_in_calendar(self):
        model = fit(self.prices, self.calendar)
        with self.assertRaises(ValueError):
            model.predict(pd.date_range(self.prices.index[-1], periods=3))
        with self.assertRaises(ValueError):
            model.predict(pd.date_range("2028-01-01", periods=3))

    def test_leap_year_is_daily_not_a_365_day_price_lookup(self):
        dates = pd.date_range("2024-01-01", periods=420)
        prices = pd.Series(100., index=dates)
        # A synthetic calendar explicitly covering the leap year.
        calendar = dataclasses.replace(self.calendar, start="2024-01-01")
        model = fit(prices, calendar)
        future = pd.date_range(dates[-1] + pd.Timedelta(days=1), periods=7)
        np.testing.assert_allclose(model.predict(future).prediction, 100)

    def test_future_prices_cannot_enter_fit_or_features(self):
        cutoff = self.prices.index[-31]
        past = self.prices.loc[:cutoff]
        future = self.prices.index[-30:]
        original = fit(past, self.calendar).predict(future)
        changed = self.prices.copy()
        changed.loc[future] *= 10
        repeated = fit(changed.loc[:cutoff], self.calendar).predict(future)
        np.testing.assert_array_equal(original.prediction, repeated.prediction)

    def test_config_rejects_unstable_or_unregularized_settings(self):
        for kwargs in [{"rho_max": 1.1}, {"event_penalty": 0}, {"draws": 0}]:
            with self.subTest(kwargs=kwargs), self.assertRaises(ValueError):
                Config(**kwargs)


if __name__ == "__main__":
    unittest.main()
