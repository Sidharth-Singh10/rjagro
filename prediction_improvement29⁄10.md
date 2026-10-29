# Improving the price prediction — 29 October 2026

Companion to `chicken_price_forecast/REPORT.md`. Written against the 29 Oct
extract (425 quoted days, 2026-10-28) and the model that produced
`outputs/tables/daily_forecast.csv`.

---

## 1. The part that matters most: the interval, not the line

The central path is the least reliable thing we publish. At the end of the
horizon it is one draw from a distribution roughly 110 rupees wide:

| horizon | central | 80% band | 95% band |
|---|---|---|---|
| 2026-10-29 | 89.0 | 78.7 – 100.6 | 73.7 – 107.4 |
| 2026-12-31 | 102.9 | 81.3 – 130.3 | 71.8 – 147.6 |
| 2027-06-30 | 90.1 | 67.3 – 120.8 | 57.6 – 141.0 |
| 2027-12-31 | 99.8 | 71.0 – 140.4 | 59.2 – 168.2 |

The width comes from measured error, not from a theoretical formula:
`sigma(h) = 0.087 × h^0.174`, floored by the observed dispersion of 12-month
price changes (24.4%, 107 year-over-year pairs). At 429 days that is a 25.2%
standard deviation in logs.

**How to use the numbers**

- Trust the **shape**: winter peak (Feb), monsoon trough (Jul–Aug), the event
  dips and lifts. That ordering has survived every re-run this year.
- Treat the **level** as one plausible draw. Planning against ₹99.8 without
  looking at ₹59–168 is planning against a number we cannot defend.
- Use the **80% band** for most decisions. The 95% band is for "can this get
  catastrophically expensive", and the answer is yes — a repeat of the 2025
  collapse sits inside it.
- **Event impacts are the weakest part of the path.** A one-day festival offset
  of −6.8% is a point estimate from a handful of quotes; it should move a
  conversation, not a purchase order.

The moment the interval is too wide to be useful, the answer is more data, not
a more elaborate model. That is what the rest of this document is about.

---

## 2. Where the error actually comes from

Diagnosis before prescription. In the rolling-origin backtest (11 origins, 652
scored days), the selected model scores 11.1% sMAPE at 1–28 days and 15.7% at
29–90 days. Decomposing that error:

| source | share of the long-horizon error | why |
|---|---|---|
| **Level** | dominant | the anchor is the mean of the last three quotes; a level shift after it is issued cannot be anticipated by anything in the model |
| **Seasonal shape** | moderate | one annual harmonic fitted on 1.5 cycles; ±8–9% is a smooth approximation of a noisy curve |
| **Event offsets** | small in aggregate, large on specific days | 13 of 19 events have ≤ 2 quoted days inside their window |
| **Missing days** | indirect | 169 of 594 days (28.4%) have no quote, so event windows and comparison windows are thin |

Note what is *not* in that list: model complexity. Adding parameters has already
been tested and lost. The binding constraint is information, not method.

---

## 3. Suggestions, in order of value per unit of effort

### Tier 1 — no new data, no new model. Do these first.

**1. Quote more days.** The single largest lever. Every filled day improves
three things at once: the anchor, the seasonal fit, and the event windows.
Today a Diwali estimate rests on 2 quoted days; Deepotsav, Karwa Chauth and
Dussehra on 1 each. A quote every day through the Sep–Nov festival block
would do more for the event estimates than any change to the estimator.

**2. Never leave a festival window blank.** If only 40 extra quotes a year are
possible, spend them on the 10 days before, during and after each major event —
that is where the model is currently guessing.

**3. Record the rate's definition once.** The tracker says "CHICKEN SOLD RATE"
and nothing else. We inferred INR/kg live weight from the business database.
One line in the sheet — live or dressed, and the market name — removes a
standing ambiguity from every number in the report.

**4. Add a market column if the rate is not statewide.** If this is one mandi's
rate, say which. If it is an average of several, record them separately; a
two-market series would let us control for local supply shocks that currently
look like "event effects".

### Tier 2 — one external series. Highest marginal value.

**5. Daily arrivals or offtake at the mandi.** This is the missing half of a
price model: price is where supply meets demand, and we only observe one side.
Even weekly arrivals would let the model distinguish "prices are low for the
season" from "prices are low because supply is heavy" — the distinction the
current forecast cannot make and the one that matters for a buying decision.

**6. Feed price (maize / soy, weekly).** A cost shifter with a lag of weeks, not
days. It would not improve a 7-day forecast much; it would anchor the long-run
level and reduce the need for the flat-drift assumption.

**7. One supply-shock indicator you already know:** heat-wave days, a disease
notification, a transport strike. A binary flag with a date is enough; the model
can estimate the rest.

### Tier 3 — modelling, once the data above exists.

**8. Replace ad-hoc shrinkage with a small hierarchical model.** The current
empirical-Bayes step (event → category → zero, τ = 5.6%) is a hand-built
approximation of a partial-pooling model. With more occurrences per event, a
proper multilevel model would estimate the pooling strength instead of assuming
it.

**9. Score the intervals, not just the point.** sMAPE rewards the central line
and ignores whether the band is honest. Adding CRPS or pinball loss to the
backtest would tell us whether the 80% band actually contains 80% of outcomes —
right now that is an assumption, not a measurement.

**10. Extend the backtest as history accumulates.** 11 origins over six months
is enough to rank models roughly and not enough to declare a winner. At 24
origins the ranking between the seasonal anchor and MA7 could be resolved
instead of reported as a near-tie.

**11. Revisit the trend only when there are 3+ annual cycles.** The trend is not
identifiable at 1.5 cycles; that is a property of the sample, not a permanent
verdict. Put a note in the calendar to re-test in 2028.

**12. Track event-date confidence as a first-class field.** Four 2027 dates are
labelled tentative and Islamic dates can shift by a day on moon sighting. A
forecast built on the wrong day is wrong in a way no interval communicates.

### Tier 4 — operational hygiene.

**13. Refresh weekly, not monthly.** The anchor is only as good as the last
three quotes; a month-old anchor is a month of unmodelled drift.

**14. Watch for anchor breaks.** If the last three quotes move more than two
standard deviations from the fitted level, flag it instead of silently
re-anchoring — that is the signal that a regime change is under way.

**15. Publish the interval alongside the point, always.** Every downstream use
of these numbers should carry the band with it.

---

## 4. What would change the numbers most

Ranked by expected effect on forecast accuracy, from the evidence in the
backtest:

1. **More quoted days** — directly reduces the level and event-window noise that
   dominate the error.
2. **Arrivals data** — the only item that could explain the level rather than
   estimate it.
3. **A second market** — turns an unobservable state-wide shock into a
   measurable local one.
4. **Better event-date precision** — cheap, and removes a known error source.
5. **More model structure** — last, and only after 1–4.

---

## 5. What not to spend time on

- **Fancier models on 425 points.** Gradient boosting or a neural net would fit
  this sample and fail the next one. Nine candidates were already tested; the
  winner is essentially "level + seasonal shape + event offsets".
- **More annual harmonics.** Two harmonics scored worse out of sample than one
  in the specification search. The curve is not the problem.
- **Trend extrapolation.** Documented failure: a 90-day forecast of ₹2,619 from
  one origin.
- **Per-event dummies for one-day festivals.** They are already shrunk; adding
  free parameters would fit noise and call it signal.
- **Interpolating missing days.** It manufactures observations and hides the one
  data problem worth fixing at source.

---

## 6. A concrete next 30 days

- [ ] Add market and weight-definition columns to the tracker.
- [ ] Backfill the Sep–Nov 2026 festival windows from any paper records still
      available.
- [ ] Commit to a daily quote through the Diwali–Chhath block (29 Oct – 16 Nov).
- [ ] Ask the mandi commission agent whether daily arrivals can be shared; even
      a WhatsApp-forwarded number is enough to start.
- [ ] Add CRPS to the backtest so interval honesty becomes measurable.
- [ ] Re-run `bash run_all.sh` after the next extract and compare the event
      estimates against today's — the size of that movement is a direct read on
      how much evidence each event really has.
