# Wholesale chicken prices in Uttar Pradesh — statistical report and daily forecast to December 2027

Source: `RATE TRACKER - Chicken Rate Updated 29⁄10.csv` · data through 2026-10-28 ·
forecast horizon 2026-10-29 – 2027-12-31

---

## 1. Executive summary

**What the data is.** A single daily wholesale price series for chicken in Uttar
Pradesh, in **INR per kg of live weight**, running from **2025-04-01** to
**2026-10-28** with **425 quoted days**. The series is not a panel: no market
identifier, no volume, no grade. It is one statewide wholesale reference rate,
and every statement below is about that series only.

**The three findings that matter most.**

1. **Only the wedding season survives the evidence test.** Of 19 discrete
   events, 11 have at most two observed days (2 of them none at all).
   After pooling, the wedding (*lagan*) clusters show **+5.4%**
   (80% interval +3.0% to +8.0%,
   12 occurrences, 139 observed days, grade A).
2. **The festival estimate is small and moves with the data, not with the festival.**
   Pooled festival windows now sit at **+1.1%**
   (95% interval −4.5% to +7.0%).
   The previous extract of this same file gave −0.9%; adding sixteen quotes and
   correcting five prices was enough to flip the sign. That instability *is* the
   finding: with one or two quoted days per festival, the estimate is dominated
   by which days happen to be priced, not by demand.
3. **The series is close to a random walk around a seasonal shape; its trend is
   not identifiable.** A model with a free trend plus annual harmonics produces a
   90-day forecast of **INR 2,619** when fitted
   to the first six months of data (`trend_instability.csv`). The base forecast
   therefore does **not** extrapolate a trend: it anchors the level to the last
   three observations and extrapolates only the seasonal shape and event effects.

**Forecast headline.** The central path starts at **INR 89.0** on
2026-10-29 and ends at **INR 99.8** on 2027-12-31
(baseline without event effects: 100.5), the seasonal shape peaks at
**INR 105.6** around 2027-02-11 and bottoms at
**INR 84.4** around 2027-08-07. The deepest
event-adjusted day is 2026-11-07 at **INR 82.2**
(−10.0% on the day, deepotsav, diwali-window).
The 95% interval at the end of the horizon is **INR 59 – 168**.

**Largest estimated associations**

| direction | event | pooled effect | 80% interval | evidence |
|---|---|---|---|---|
| positive | Vijayadashami (Dussehra) | +6.9% | −0.1% to +14.4% | 1 day, grade D |
| negative | Ayodhya Deepotsav | −6.8% | −11.8% to −1.6% | 1 day, grade D |
| positive | Raksha Bandhan | +6.8% | +0.3% to +13.7% | 2 days, grade D |
| negative | Karwa Chauth | −6.8% | −11.4% to −1.9% | 1 day, grade D |
| negative | Chaitra Navratri | −6.5% | −10.8% to −2.0% | 6 days, grade D |
| positive | Wedding season (Lagan) muhurat cluster | **+5.4%** | +3.0% to +8.0% | 139 days, grade A |
| positive | Pitru Paksha (Shraddh) | +3.6% | −0.8% to +8.1% | 14 days, grade C |
| positive | Sharadiya Navratri | +3.4% | −1.9% to +9.0% | 7 days, grade C |

Grade counts across the 19 events: **A 1, B 0, C 2, D 14, E 2**.
Everything below grade A should be read as *a weak prior to be updated*, not as a
measured recurring effect.

**Model performance.** 11 rolling origins
(2026-04-01 → 2026-09-01), horizons 1–90 days,
652 scored days per model. The selected model — a seasonal anchor with
event offsets — has **sMAPE 11.1%** at 1–28 days and
**15.7%** at 29–90 days, against 11.8% / 16.0%
for the naive forecast. Over the full 1–90 day mix it is **14.24%**,
second to a 7-day moving average at 13.24%, so no single model
dominates; the event model is preferred because it is the most accurate at
operational horizons and is the only candidate that produces the requested
baseline / event-adjusted decomposition.

**Reliability of the event forecasts.** Wedding seasons: the only effect that is
statistically distinguishable from zero, and even it rests on about six wedding
periods rather than twelve independent seasons. Festivals and observances: low
confidence — the event-level 80% intervals are wider than any effect claimed.

---

## 2. Inputs, scope and data quality

### 2.1 Files

| file | content |
|---|---|
| `RATE TRACKER - Chicken Rate Updated 29⁄10.csv` | 594 dated rows, 425 with a price, 169 blank |
| `up_chicken_events.json` | 26 definitions, 91 occurrences (2025–2027), sourced |
| `chicken_rates.json` (frontend build artefact) | same observations as the CSV; used only as a cross-check |

The previous extract of the tracker is kept beside the current one in
`data/raw/`; only the current file is read. SHA-256 of every raw file is in
`logs/inputs.sha256`.

### 2.2 What the series is

* **Currency and unit: INR per kg, live weight.** The CSV header says only
  "CHICKEN SOLD RATE", so the unit was verified rather than assumed. In the
  business database, `batch_sales` for item `DC101` (DESI CHICKEN, finished
  birds) records `value = rate × avg_weight` with `avg_weight` in kilograms per
  lot; 24 of the 30 September 2026 lots sold at 104–123 INR/kg. That matches the
  level of this series and establishes per-kg pricing.
* **Market: statewide Uttar Pradesh.** The tracker carries no market column and
  no sub-state identifier exists, so this is a state reference rate.
* **Not a panel.** One observation per date; no trader, volume or grade.

### 2.3 Coverage and missingness

| item | value |
|---|---|
| first / last observation | 2025-04-01 / 2026-10-28 |
| observations | 425 |
| calendar days in span | 594 |
| days with no quote | **169 (28.4%)** |
| gap runs | 72 |
| longest gap | 18 days |
| gaps ≥ 7 days | 3 |
| duplicate dates | 0 |
| non-numeric or non-positive prices | 0 |
| share of unchanged days | 17.4% |

The history starts on **2025-04-01**, not 1 January 2025, which is why Holi,
Ramadan and Eid-ul-Fitr each have only one occurrence inside the price sample.

The gaps are recording gaps, not market closures: they are irregular and hit
weekdays and weekends alike. **No interpolation, smoothing or outlier removal was
applied.** All models fit on observed days only. The one exception is the ETS
benchmark, which needs an equally spaced series and therefore bridges gaps
linearly; it is labelled as a benchmark.

### 2.4 Descriptive statistics

| statistic | value |
|---|---|
| mean / median | 100.4 / 103 INR per kg |
| standard deviation | 15.8 (CV 15.8%) |
| minimum | 59 INR on 2025-07-26 |
| maximum | 145 INR on 2026-07-03 |
| mean absolute daily change | 3.8 INR (5.96% sd of daily returns) |
| share of unchanged days | 17.4% |

---

## 3. Event calendar

### 3.1 Construction

The supplied JSON is used unchanged as the candidate list. Each occurrence gets
a lead-in, the official dates, and a recovery window:

| event length | lead-in | core | recovery |
|---|---|---|---|
| ≤ 7 days | 2 days | official dates | 2 days |
| 8–31 days | 1 day | official dates | 1 day |
| > 31 days | – | official dates | – |

Twenty-six definitions produce 91 dated occurrences for 2025–2027. **Seven
definitions are reclassified as seasonal regimes** — monsoon, summer heat,
winter fog, Sawan, Ramadan, Magh Mela and the 2025 heat wave — because they cover
most of the calendar (89% of observed days sit
inside at least one core window) and cannot be separated from annual seasonality
with 1.5 cycles. That leaves 19 discrete events.

| event | category | occurrences | with quotes | observed days | coverage | class |
|---|---|---|---|---|---|---|
| chhath | festival | 3 | 0 | 0 | 0% | none |
| eid-ul-fitr | islamic | 2 | 0 | 0 | 0% | none |
| deepotsav | fair | 3 | 1 | 1 | 33% | single occurrence |
| dussehra | festival | 3 | 1 | 1 | 33% | single occurrence |
| hartalika-teej | observance | 3 | 1 | 1 | 33% | single occurrence |
| holi | festival | 2 | 1 | 1 | 25% | single occurrence |
| karwa-chauth | observance | 3 | 1 | 1 | 33% | single occurrence |
| maha-shivaratri | observance | 2 | 1 | 1 | 50% | single occurrence |
| diwali-window | festival | 3 | 1 | 2 | 12% | single occurrence |
| janmashtami | observance | 3 | 2 | 2 | 50% | two occurrences |
| muharram | islamic | 3 | 2 | 2 | 67% | two occurrences |
| nirjala-ekadashi | observance | 3 | 2 | 2 | 67% | two occurrences |
| raksha-bandhan | festival | 3 | 2 | 2 | 67% | two occurrences |
| eid-ul-adha | islamic | 3 | 2 | 4 | 44% | two occurrences |
| chaitra-navratri | observance | 3 | 1 | 6 | 26% | single occurrence |
| sharad-navratri | observance | 3 | 2 | 7 | 25% | two occurrences |
| christmas-new-year | festival | 3 | 1 | 9 | 35% | single occurrence |
| pitru-paksha | observance | 3 | 2 | 14 | 33% | two occurrences |
| lagan-weddings | wedding | 23 | 12 | 139 | 40% | moderate |


### 3.2 Overlaps

Wedding clusters overlap the pre-monsoon heat season on 170 days, and Pitru
Paksha, Navratri and Diwali overlap each other in the September–November window.
Across events, 39% of occurrences share days with another discrete event, close
to 100% for the October–November cluster (`event_overlap_pairs.csv` lists every
pair). Where two events always co-occur their effects cannot be separated; the
forecast applies overlapping effects multiplicatively and reports the combined
number.

### 3.3 Date verification

The calendar's own labels: 47 occurrences "confirmed",
40 "estimated", 4 "tentative".
The 2027 dates that matter most were independently re-checked against a public
India holiday calendar publishing state-level (Uttar Pradesh) dates:

| event | calendar date | calendar label | external source | status |
|---|---|---|---|---|
| diwali-window | 2027-10-27 | estimated | Diwali: Fri 29 Oct 2027 (Uttar Pradesh) | confirmed |
| eid-ul-adha | 2027-05-15 | tentative | Bakrid: Mon 17 May 2027 | confirmed |
| eid-ul-fitr | 2027-03-08 | tentative | Idul Fitr: Tue 09 Mar 2027 | confirmed |
| holi | 2027-03-21 | estimated | Holika Dahan Sun 21 Mar, Holi Mon 22 Mar 2027 | confirmed |
| maha-shivaratri | 2027-03-06 | estimated | Maha Shivratri: Sat 06 Mar 2027 | confirmed |
| muharram | 2027-06-16 | tentative | Ashura (10 Muharram): Wed 16 Jun 2027 | confirmed |

The remaining 2027 dates were **not** independently re-checked and keep the
calendar's "estimated" label. Islamic dates depend on local moon sighting;
wedding muhurats shift more.

---

## 4. The normal price pattern

### 4.1 Trend

An unrestricted regression of log price on a linear trend, two annual harmonics
and weekday dummies gives a trend of **17.85% per year**
and R² of 0.403. That number is unusable for forecasting: with 1.5 annual
cycles, trend and harmonics are almost collinear, so the coefficients are
individually meaningless even when the fit looks decent.

| fitted to data up to | implied trend | 30-day | 90-day | last observed |
|---|---|---|---|---|
| 2025-10-01 | +41,187% | 258 | 2,619 | 110 |
| 2026-01-01 | -45% | 93 | 68 | 104 |
| 2026-04-01 | -19% | 91 | 74 | 102 |
| 2026-07-01 | +11% | 116 | 119 | 134 |
| 2026-10-01 | +16% | 116 | 137 | 117 |


A one-year-ahead extrapolation built on such a coefficient is worthless, which is
why **no drift is extrapolated in the base forecast**. A drift sensitivity band
is reported instead (§7.4).

### 4.2 Seasonality

* **Annual cycle.** With two harmonics the joint test is significant
  (p = 0.0025); the implied amplitude is +12.8%
  at its peak and −15.2% at its trough *relative to the sample mean*.
  With one harmonic — the specification the backtest selected — the shape is
  smoother: a winter peak and a monsoon trough.
* **Weekday.** Joint p = 0.0152. Saturday and Friday run below
  Sunday; the rest are within ±1% (`baseline_weekday.csv`).
* **Regime events.** Monsoon, winter fog, summer heat and Sawan *are* the annual
  cycle, not separately identified shocks. No incremental effect is claimed.

### 4.3 Volatility and breaks

Daily returns have a 5.96% standard deviation, near-zero autocorrelation of
daily changes (0.05), and price autocorrelation of 0.633 at 7 days.
A sup-F break scan peaks on **2025-11-03** (F = 146), the recovery from the
mid-2025 trough. The series is better described as level regimes than as a stable
trend, which is why the forecast re-anchors its level.

---

## 5. Historical event effects

### 5.1 Method

For each occurrence: `E` is the mean log price on the official event dates, `M`
the mean log price over 14 days before the lead-in and 14 days after the
recovery (excluding days in another discrete event's core window), and the
effect is `Δ = mean(E) − mean(M)`, reported as `(exp(Δ) − 1) × 100`.

A symmetric local window is used because the global trend is neither identified
nor stable (§4.1), and because averaging both sides makes a price that is
trending into or out of the event largely cancel.

Uncertainty: a circular block bootstrap of the local price path (2,000
replications, 7-day blocks). Occurrences are pooled per event with a
random-effects model, then shrunk toward a pooled category effect:

```
event effect    ~ N(category effect, tau_within^2)   tau_within = 5.6% (estimated)
category effect ~ N(0, 4%^2)                          documented hyper-parameter
```

With five categories the between-category spread cannot be estimated; 4% avoids
both erasing the wedding effect and believing a one-day reading. The shrinkage
weight on own evidence is reported for every event.

This is an **association**, not a causal effect: there is no control group, and
unobserved supply shocks move with the same calendar.

### 5.2 Results

| event | n occ | n days | observed | baseline | raw | 95% CI (raw) | pooled | 80% CI (pooled) | grade |
|---|---|---|---|---|---|---|---|---|---|
| dussehra | 1 | 1 | 112.0 | 91.9 | +21.87% | +0.8% to +47.3% | **+6.91%** | −0.1% to +14.4% | D |
| raksha-bandhan | 2 | 2 | 92.5 | 79.7 | +16.05% | −0.3% to +35.1% | **+6.81%** | +0.3% to +13.7% | D |
| lagan-weddings | 12 | 139 | 110.7 | 104.9 | +5.53% | +1.6% to +9.6% | **+5.42%** | +3.0% to +8.0% | A |
| pitru-paksha | 2 | 14 | 108.9 | 103.2 | +5.47% | −2.5% to +14.2% | **+3.58%** | −0.8% to +8.1% | C |
| sharad-navratri | 2 | 7 | 100.8 | 94.1 | +7.05% | −4.2% to +19.6% | **+3.44%** | −1.9% to +9.0% | C |
| muharram | 2 | 2 | 98.0 | 92.5 | +5.90% | −10.7% to +25.5% | **+2.26%** | −4.4% to +9.3% | D |
| nirjala-ekadashi | 2 | 2 | 102.0 | 96.1 | +6.18% | −11.2% to +27.0% | **+1.51%** | −4.8% to +8.2% | D |
| chhath | 0 | 0 | — | — | — | — | **+1.09%** | −6.8% to +9.6% | E |
| hartalika-teej | 1 | 1 | 108.0 | 105.1 | +2.72% | −10.9% to +18.5% | **+0.84%** | −5.0% to +7.0% | D |
| eid-ul-fitr | 0 | 0 | — | — | — | — | **+0.25%** | −7.8% to +9.0% | E |
| maha-shivaratri | 1 | 1 | 102.0 | 101.8 | +0.22% | −4.4% to +5.0% | **+0.13%** | −2.7% to +3.0% | D |
| christmas-new-year | 1 | 9 | 99.5 | 100.8 | −1.33% | −8.9% to +6.8% | **−0.63%** | −4.9% to +3.8% | D |
| eid-ul-adha | 2 | 4 | 88.0 | 91.8 | −4.15% | −19.4% to +13.9% | **−1.34%** | −7.8% to +5.5% | D |
| janmashtami | 2 | 2 | 81.5 | 86.5 | −5.75% | −18.7% to +9.3% | **−2.49%** | −8.2% to +3.5% | D |
| holi | 1 | 1 | 102.0 | 108.2 | −5.73% | −14.8% to +4.3% | **−3.07%** | −7.9% to +2.0% | D |
| diwali-window | 1 | 2 | 85.0 | 90.8 | −6.45% | −15.6% to +3.7% | **−3.42%** | −8.3% to +1.7% | D |
| chaitra-navratri | 1 | 6 | 88.9 | 98.9 | −10.04% | −17.9% to −1.5% | **−6.50%** | −10.8% to −2.0% | D |
| karwa-chauth | 1 | 1 | 80.0 | 90.6 | −11.68% | −20.5% to −1.9% | **−6.81%** | −11.4% to −1.9% | D |
| deepotsav | 1 | 1 | 82.0 | 90.6 | −9.45% | −18.9% to +1.2% | **−6.83%** | −11.8% to −1.6% | D |


Category pools after shrinkage:

| category | occurrences | events | raw pooled | pooled effect | 95% CI |
|---|---|---|---|---|---|
| wedding | 12 | 1 | +5.53% | **+4.44%** | +0.9% to +8.1% |
| festival | 6 | 6 | +2.28% | **+1.09%** | −4.5% to +7.0% |
| islamic | 4 | 3 | +0.83% | **+0.25%** | −6.1% to +7.1% |
| observance | 12 | 8 | −0.53% | **−0.40%** | −4.2% to +3.5% |
| fair | 1 | 1 | −9.45% | **−3.26%** | −9.2% to +3.1% |


### 5.3 What this does and does not say

* **Wedding seasons are the one robust finding** — +5.4% with an
  80% interval that excludes zero, stable across 12 occurrences.
* **The festival estimate is unstable, and that is the honest result.** Adding
  sixteen quotes and correcting five prices to the same file moved the pooled
  festival effect from −0.9% to +1.1%. Individual festival rows swing far
  more: Diwali is −3.4% on two quoted days, while
  Deepotsav — one day, one occurrence — is −6.8%.
* **Lead-in and recovery.** Pooled across occurrences, the median lead-in movement
  is +3.3% and the median recovery movement
  +1.1%, with median ratios to the core movement of
  0.96 and 0.50. These are descriptive and are
  **not** added to the forecast, which applies the effect to official event dates
  only and therefore probably understates the total event-period association.
* **No effect is causal.** The matched window removes level drift, not a supply
  shock that happens to coincide with the event.

---

## 6. Forecasting model

### 6.1 Candidates

`naive`, `ma7`, `snaive7`, `ets_damped`, `ets_weekly`, `seasonal_anchor`
(log price on one annual harmonic plus weekday dummies, level re-anchored to the
last three observations), `seasonal_flat`, and the two variants with event
offsets. A trend + harmonics specification was excluded after the identification
failure in §4.1; one harmonic rather than two was chosen by out-of-sample
comparison.

### 6.2 Validation design

Chronological rolling origins from 2026-04-01 (the first date with a full annual
cycle of history) to 2026-09-01, every two weeks, horizons 1–90 days, scored only
on observed days. Event effects are re-estimated at every origin with the same
estimator, cutting the data at the origin. No future information enters.

### 6.3 Results

| model | n | MAE ₹ | RMSE ₹ | sMAPE % | bias ₹ | bias % |
|---|---|---|---|---|---|---|
| ma7 | 652 | 13.94 | 17.34 | **13.24** | +1.58 | +1.5 |
| seasonal_anchor_events | 652 | 14.82 | 18.14 | 14.24 | −2.67 | −2.5 |
| ets_weekly | 652 | 15.23 | 19.27 | 14.41 | +5.33 | +5.0 |
| ets_damped | 652 | 15.48 | 19.70 | 14.63 | +5.72 | +5.4 |
| naive | 652 | 15.48 | 19.70 | 14.63 | +5.72 | +5.4 |
| snaive7 | 652 | 15.69 | 19.84 | 14.81 | +5.56 | +5.3 |
| seasonal_anchor | 652 | 15.43 | 18.87 | 14.88 | −3.81 | −3.6 |
| seasonal_flat_events | 652 | 18.43 | 22.40 | 18.28 | −17.32 | −16.4 |
| seasonal_flat | 652 | 19.43 | 23.50 | 19.36 | −18.33 | −17.3 |


By horizon bucket (sMAPE %):

| model | 1–7 d | 8–28 d | 29–90 d |
|---|---|---|---|
| seasonal_anchor_events | 8.60 | 11.96 | 15.73 |
| seasonal_anchor | 9.00 | 12.79 | 16.33 |
| ets_weekly | 7.63 | 12.91 | 15.76 |
| ma7 | 8.30 | 12.89 | 13.95 |
| naive | 7.44 | 13.22 | 16.01 |


Event days versus non-event days (sMAPE %):

| model | non-event days | event windows |
|---|---|---|
| seasonal_anchor_events | 14.23 | 14.26 |
| seasonal_anchor | 14.23 | 16.32 |
| ets_weekly | 16.12 | 10.59 |
| ma7 | 13.90 | 11.76 |
| naive | 16.36 | 10.78 |


The event offsets cut event-window error from
16.32% to 14.26% without touching non-event days — the clearest
evidence that the event component adds something, even though the individual
effects are small.

### 6.4 Selection and honest caveats

* **Selected for the forecast:** `seasonal_anchor_events` — best 1–28 day accuracy
  (11.1% weighted sMAPE), and the only candidate that separates baseline
  from event effects inside one specification.
* **It is not the overall winner.** A 7-day moving average scores
  13.24% over the full 1–90 day mix against 14.24% here.
* **Biases differ in sign.** The selected model under-predicts by
  2.5% on average; naive and ETS over-predict by about
  5.4%.
* **The validation sample is small** — 11 origins, six months of test data, one
  price regime. Nothing here claims this model is better than ETS in general.
* **No claim of festival accuracy.** Event-window sMAPE is
  14.3%: the model does not predict festival prices to within a few
  percent, it merely predicts them slightly better than a model that ignores events.

### 6.5 Prediction intervals

The standard deviation of the log error is 9.9% at one week and
19.2% at 90 days, following roughly
`sigma(h) = 0.087 × h^0.17`. Beyond the tested horizon that
power law is extrapolated but floored by the empirical dispersion of 12-month
price changes (24.4%, 107 year-over-year pairs).

Intervals are **prediction intervals for an individual daily price**, not
confidence bands for a mean.

---

## 7. Forecast

### 7.1 Baseline versus event-adjusted

For every date: the **baseline** is the same fitted model with every discrete
event offset switched off; the **event-adjusted** value turns them on for the
official dates; the **impact** is the difference. Overlapping events compound on
the log scale. Both are model-derived counterfactuals — the baseline was never a
traded price.

### 7.2 Headline path

| date | forecast | baseline | impact | 80% | 95% | active events |
|---|---|---|---|---|---|---|
| 2026-10-29 | 89.0 | 95.5 | −6.8% | 78.7–100.6 | 73.7–107.4 | karwa-chauth |
| 2026-11-08 | 89.9 | 93.1 | −3.4% | 75.2–107.4 | 68.5–118.0 | diwali-window |
| 2026-12-31 | 102.9 | 103.6 | −0.6% | 81.3–130.3 | 71.8–147.6 | christmas-new-year |
| 2027-03-31 | 101.4 | 101.4 | +0.0% | 77.4–132.8 | 67.1–153.2 | — |
| 2027-06-30 | 90.1 | 90.1 | +0.0% | 67.3–120.8 | 57.6–141.0 | — |
| 2027-12-31 | 99.8 | 100.5 | −0.6% | 71.0–140.4 | 59.2–168.2 | christmas-new-year |


Monthly means of the event-adjusted path:

| month | INR/kg | month | INR/kg |
|---|---|---|---|
| 2026-10 | 90.7 | 2027-06 | 95.0 |
| 2026-11 | 95.6 | 2027-07 | 89.6 |
| 2026-12 | 101.0 | 2027-08 | 87.2 |
| 2027-01 | 104.8 | 2027-09 | 90.1 |
| 2027-02 | 108.0 | 2027-10 | 91.3 |
| 2027-03 | 103.6 | 2027-11 | 98.9 |
| 2027-04 | 98.1 | 2027-12 | 101.4 |
| 2027-05 | 98.3 |  |  |


### 7.3 Event-specific results

`outputs/tables/event_forecasts.csv` has one row per future occurrence
(34 rows). Summary by event:

| event | occurrences | impact | 80% CI | mean price | grade |
|---|---|---|---|---|---|
| Muharram / Ashura | 1 | +7.8% | +0.4% to +15.7% | 99 | D |
| Nirjala Ekadashi | 1 | +7.1% | −0.0% to +14.6% | 97 | D |
| Vijayadashami (Dussehra) | 1 | +6.8% | −0.1% to +14.4% | 94 | D |
| Raksha Bandhan | 1 | +6.8% | +0.3% to +13.7% | 93 | D |
| Eid-ul-Fitr (Ramzan Id) | 1 | +5.7% | −3.1% to +15.3% | 108 | E |
| Maha Shivaratri | 1 | +5.6% | +1.7% to +9.6% | 104 | D |
| Wedding season (Lagan) muhurat cluster | 11 | +5.4% | +3.0% to +8.0% | 102 | A |
| Eid-ul-Adha (Bakrid) and preceding days | 1 | +4.0% | −3.2% to +11.7% | 96 | D |
| Pitru Paksha (Shraddh) | 1 | +3.6% | −0.8% to +8.1% | 92 | C |
| Sharadiya Navratri | 1 | +3.5% | −1.9% to +9.0% | 93 | C |
| Chhath Puja | 2 | +1.1% | −6.8% to +9.6% | 95 | E |
| Hartalika Teej | 1 | +0.9% | −5.0% to +7.0% | 88 | D |
| Christmas and New Year holidays | 2 | −0.6% | −4.9% to +3.8% | 100 | D |
| Krishna Janmashtami | 1 | −2.5% | −8.2% to +3.5% | 86 | D |
| Holi and Holika Dahan | 1 | −3.0% | −7.9% to +2.0% | 97 | D |
| Diwali to Bhai Dooj festival window | 2 | −4.7% | −9.7% to +0.9% | 89 | D |
| Chaitra Navratri | 1 | −6.5% | −10.8% to −2.0% | 93 | D |
| Karwa Chauth | 2 | −6.8% | −11.4% to −1.9% | 87 | D |
| Ayodhya Deepotsav | 2 | −10.0% | −16.6% to −3.0% | 84 | D |


Where a row averages over several core days and two events overlap, the impact is
the **combined** effect on those dates, not the named event alone.

### 7.4 Drift sensitivity

Because no drift is extrapolated, the long-horizon level depends on the seasonal
anchor. Under four annual drift assumptions:

| annual drift | baseline 2027-12-31 | event-adjusted 2027-12-31 |
|---|---|---|
| +0% | 100.5 | 99.8 |
| +6% | 107.6 | 106.9 |
| +12% | 114.8 | 114.0 |
| +20% | 124.5 | 123.7 |


---

## 8. Limitations and unobserved confounders

1. **One series, no covariates.** Feed prices, chick placement, bird weight,
   mortality, disease, transport, weather, imports and policy are invisible.
2. **Thin event evidence.** 13 of 19 discrete events have ≤ 2 observed days; their
   estimates are mostly the category prior.
3. **Overlap.** Most event windows share days; co-occurring effects cannot be
   separated.
4. **Trend and seasonality are not separable** in 1.5 cycles. The flat drift is a
   choice, not a finding; §7.4 shows the alternative.
5. **28% of days are missing**, and there is no way to test whether
   they are missing at random with respect to price.
6. **The unit is inferred**, not documented by the source.
7. **Intervals beyond 90 days are extrapolated**, calibrated partly on
   year-over-year variability from a single 18-month window.
8. **Structural breaks are likely.** The 2025 trough and 2026 recovery dominate
   the sample.
9. **No causal claim.** Event effects are associations from one time series with
   no control group.

---

## 9. Reproducibility

```
chicken_price_forecast/
├── README.md                     how to run and update
├── requirements.txt              pinned versions
├── run_all.sh                    one command rebuilds everything
├── data/raw/                     untouched inputs + SHA-256
├── data/processed/               cleaned daily series, event days, backtest predictions
├── src/
│   ├── cplib.py                  IO, calendar features, HAC/Wald helpers
│   ├── effects.py                the event estimator (shared by report and backtest)
│   ├── 01_ingest.py … 10_report.py
├── outputs/tables/               every table as CSV
├── outputs/charts/               eight figures as PNG
├── outputs/chicken_price_deliverables.xlsx
└── logs/                         JSON run logs, data-quality audit, consistency checks
```

Full rebuild: `bash run_all.sh` (about half a minute). This report is rendered by
`src/10_report.py`, so every figure above is read from a generated artefact
rather than typed by hand. The consistency suite (`07_export.py`) verifies
day-by-day coverage, the arithmetic identities between the three forecast
columns, interval ordering, event-effect consistency between the daily and event
tables, the absence of look-ahead in the backtest, and that the raw inputs are
unmodified.

To add new observations: drop the new extract into `data/raw/`, point
`cplib.PRICE_CSV` at it, re-run. The forecast start date follows the last quoted
day automatically, and step 09 refreshes the web app's
`rjagro_frontend/app/data/price_forecast.json`.
