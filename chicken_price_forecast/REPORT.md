# Wholesale chicken prices in Uttar Pradesh — statistical report and daily forecast to December 2027

Prepared 28 October 2026 · data through 23 October 2026 · forecast horizon 24 October 2026 – 31 December 2027

---

## 1. Executive summary

**What the data is.** A single daily wholesale price series for chicken in Uttar
Pradesh, in **INR per kg of live weight**, running from **1 April 2025** to
**23 October 2026** with **409 quoted days**. The series is not a panel: no
market identifier, no volume, no grade. It is one statewide wholesale reference
rate, and every statement below is about that series only.

**The three findings that matter most.**

1. **There is no reliable individual festival effect in this dataset.** The
   history contains 1.5 annual cycles and 31% of calendar days have no quote.
   Of 19 discrete events, 13 have at most two observed days inside the event
   window, and three have no usable evidence (two with no observed day at all).
   After pooling, only **wedding seasons** carry an effect distinguishable from
   zero: **+4.6%** (80% interval +2.6% to +6.7%, 12 independent occurrences,
   137 observed days).
2. **Festival effects came out slightly negative, against the hypothesis.**
   Pooled festival windows are **−0.9%** (95% interval −6.2% to +4.6%); the
   Diwali window is −2.6% and Karwa Chauth −3.6% after pooling. The raw,
   unpooled Diwali estimate is −6.5% on two observed days. This is a statement
   about *association in this sample*, not a causal effect: the October–November
   2025 festival cluster fell inside a falling market, so the event study cannot
   separate festival demand from the contemporaneous price slide.
3. **The series is close to a random walk around a seasonal shape; its trend is
   not identifiable.** A model with a free trend plus annual harmonics produces
   a 90-day forecast of **INR 2,619** when fitted to the first six months of
   data (`trend_instability.csv`). The base forecast therefore does **not**
   extrapolate a trend: it anchors the level to the last three observations and
   extrapolates only the seasonal shape and the event effects.

**Forecast headline.** The central path runs from **INR 100.5** on 24 October
2026 to **INR 111.9** on 31 December 2027 (baseline without event effects:
113.2), with a seasonal peak near **INR 120** in February 2027 and a trough near
**INR 97** in August 2027. The 95% interval at the end of the horizon is
**INR 66 – 190**. That width is the honest summary of what 18 months of a
volatile daily price series can support 14 months ahead.

**Largest estimated positive and negative event associations**

| direction | event | pooled effect | 80% interval | evidence |
|---|---|---|---|---|
| positive | Wedding seasons (*lagan*) | **+4.6%** | +2.6 to +6.7 | 12 occurrences, 137 days, grade A |
| positive | Muharram | +1.9% | −2.8 to +6.8 | 2 days, grade D |
| positive | Eid-ul-Adha | +1.1% | −3.8 to +6.3 | 3 days, grade D |
| negative | Ayodhya Deepotsav | **−5.3%** | −9.1 to −1.3 | 1 day, grade D |
| negative | Chaitra Navratri | −3.7% | −6.6 to −0.7 | 6 days, 1 occurrence, grade D |
| negative | Karwa Chauth | −3.6% | −6.6 to −0.5 | 1 day, grade D |
| negative | Diwali window | −2.6% | −6.2 to +1.1 | 2 days, grade D |

Only the wedding estimate is grade A. Everything else is grade C, D or E and
should be read as *a weak prior to be updated*, not as a measured recurring
effect.

**Model performance.** Eleven rolling origins (April–September 2026), horizons
1–90 days, 5,229 scored forecast days. The selected model — a seasonal anchor
with event offsets — has **sMAPE 10.3%** at 1–28 days and **15.3%** at 29–90
days, beating the naive forecast (11.2% / 16.1%), damped ETS (11.2% / 16.1%) and
the same model without event offsets (11.0% / 16.0%). Over the full 1–90 day
mix it is second to a 7-day moving average (13.66% vs 13.40% sMAPE), so no
single model dominates; the event model is preferred because it is the best at
operational horizons and is the only candidate that produces the requested
baseline / event-adjusted decomposition.

**Reliability of the event forecasts.** Wedding seasons: moderate confidence —
the point estimate is stable across 12 occurrences and statistically
distinguishable from zero, but those 12 clusters fall into only about six
wedding periods in 18 months, so they are not 12 independent seasons.
Festivals and observances: low confidence; the event-level intervals (roughly
±5% at 80%) are wider than any effect claimed for them.

---

## 2. Inputs, scope and data quality

### 2.1 Files

| file | content |
|---|---|
| `RATE TRACKER - Chicken Rate.csv` | 594 dated rows, 409 with a price, 185 blank |
| `up_chicken_events.json` | 26 definitions, 91 occurrences (2025–2027), sourced |
| `chicken_rates.json` (frontend build artefact) | same 409 observations as the CSV; used only as a cross-check |

SHA-256 of the untouched copies is recorded in `logs/inputs.sha256`.

### 2.2 What the series is

* **Currency and unit: INR per kg, live weight.** The CSV header says only
  "CHICKEN SOLD RATE", so the unit was verified rather than assumed. In the
  business database, `batch_sales` for item `DC101` (DESI CHICKEN, finished
  birds) records `value = rate × avg_weight` with `avg_weight` in kilograms per
  lot; 24 of the 30 September 2026 lots sold at 104–123 INR/kg, while six
  small cull lots (6–68 kg average) sold at 50–70. That matches the level of this
  series (95–117 in the same weeks) and establishes per-kg pricing. The database
  cannot confirm that the tracker is a *purchase* rather than a *sale* rate, or
  whether it is dressed or live weight; the report therefore says "live weight"
  only because the tracked values sit at live-bird wholesale levels, and flags
  the residual ambiguity.
* **Market: statewide Uttar Pradesh.** The tracker carries no market column.
  The events calendar is statewide, the price levels are consistent with UP
  wholesale markets, and no sub-state identifier exists to do better. Treat the
  series as a state reference rate, not a specific mandi.
* **Not a panel.** One observation per date; no trader, volume or grade
  dimension.

### 2.3 Coverage and missingness — the central data-quality fact

| item | value |
|---|---|
| first / last observation | 2025-04-01 / 2026-10-23 |
| observations | 409 |
| calendar days in span | 594 |
| days with no quote | **185 (31.1%)** |
| gap runs | 72 |
| longest internal gap | 15 days (2025-08-19 → 2025-09-02) |
| gaps ≥ 7 days | 4 |
| duplicate dates | 0 |
| non-numeric or non-positive prices | 0 |
| non-integer prices | 0 |
| weekday coverage | 64–75% every weekday — no systematic weekend omission |

The history starts on **1 April 2025, not 1 January 2025** as the brief assumed.
No January–March 2025 price exists, which is why Holi, Ramadan and Eid-ul-Fitr
have only one occurrence each inside the price sample.

The gaps are recording gaps, not market closures: they are irregular, they hit
weekdays and weekends alike, and they cluster in August–September 2025 (a
15-day run) and again in mid-2026. **No interpolation, smoothing or outlier
removal was applied.** All models fit on observed days only and impute nothing.
The one exception is the ETS benchmark, which needs an equally spaced series and
therefore bridges gaps linearly; it is labelled as a benchmark and its
limitations are stated.

Unusual observations were kept. The largest one-day moves are −30 and +24 INR
(28% and 24%); the series also has an 18.9% share of days on which the price did
not change at all, which is consistent with a negotiated reference rate that is
quoted in round rupees rather than a continuously traded price.

### 2.4 Descriptive statistics

| statistic | value |
|---|---|
| mean / median | 100.4 / 103 INR per kg |
| standard deviation | 15.9 (CV 15.8%) |
| minimum | 59 INR on 2025-07-26 |
| maximum | 145 INR on 2026-07-03 |
| 10th–90th percentile | 76 – 119 INR |
| mean absolute daily change | 3.6 INR (5.6% standard deviation of daily returns) |
| share of unchanged days | 18.9% |

---

## 3. Event calendar

### 3.1 Construction

The supplied JSON is used unchanged as the candidate list. Each occurrence gets
three windows:

| event length | lead-in | core | recovery |
|---|---|---|---|
| ≤ 7 days | 2 days | official dates | 2 days |
| 8–31 days | 1 day | official dates | 1 day |
| > 31 days | – | official dates | – |

Twenty-six definitions produce 91 dated occurrences for 2025–2027. **Seven
definitions are reclassified as seasonal regimes rather than discrete events**:
monsoon, summer heat, winter fog, Sawan, Ramadan, Magh Mela and the 2025 heat
wave. That leaves 19 discrete events. They cover most of the calendar
— 90% of observed days sit inside at least one core window — so they cannot be
separated from annual seasonality with 1.5 cycles, and they are described
(Section 4) rather than estimated as incremental effects.

For the 18 discrete events, coverage is thin and unevenly distributed:

| evidence class | events |
|---|---|
| A – well evidenced | `lagan-weddings` (12 occurrences, 137 observed days) |
| C – weak | `pitru-paksha` (2 occurrences, 14 days) |
| D – very weak (1 occurrence or <5 days) | `diwali-window` (2 days), `holi` (1), `christmas-new-year` (9 days but one occurrence), `raksha-bandhan` (1), `janmashtami` (2), `karwa-chauth` (1), `deepotsav` (1), `dussehra` (1 day, no usable comparison window), `chaitra-navratri` (6), `sharad-navratri` (7), `nirjala-ekadashi` (2), `hartalika-teej` (1), `maha-shivaratri` (1), `eid-ul-adha` (3), `muharram` (2) |
| E – no usable evidence | `chhath` (0 observed days), `eid-ul-fitr` (0), `dussehra` (1 day but fewer than 4 comparison days) |

The counting unit is the **occurrence**, not the day. Two observed days inside
one Diwali are one observation, not two.

### 3.2 Overlaps

Events share days extensively. The worst offenders among discrete events:
wedding clusters overlap summer heat on 170 days, and Pitru Paksha, Navratri
and Diwali overlap each other in the Sep–Nov window. Across events, **39% of all
occurrences share days with another discrete event** — close to 100% for the
October–November festival cluster (`event_overlap_pairs.csv` lists every pair).

This has a direct consequence that the report respects: **where two events
always co-occur, their effects cannot be separated.** The forecast applies
overlapping effects multiplicatively on the log scale and reports the combined
number, and the event table says which events share days.

### 3.3 Date verification

The calendar's own labels: 47 occurrences "confirmed", 40 "estimated", 4
"tentative" (all 2027 Islamic dates). Six 2027 dates were independently
re-checked against a public India holiday calendar that publishes state-level
(Uttar Pradesh) dates (Office Holidays, retrieved 28 October 2026):

| event | calendar | external check | status |
|---|---|---|---|
| Diwali | 27–31 Oct 2027 (Diwali 29 Oct) | Fri 29 Oct 2027, UP | confirmed |
| Holi | 21–22 Mar 2027 | Holika Dahan 21 Mar, Holi 22 Mar | confirmed |
| Eid-ul-Fitr | 8–10 Mar 2027 | Tue 9 Mar 2027 | confirmed |
| Eid-ul-Adha | 15–17 May 2027 | Mon 17 May 2027 | confirmed |
| Maha Shivaratri | 6 Mar 2027 | Sat 6 Mar 2027 | confirmed |
| Muharram | 16 Jun 2027 | Wed 16 Jun 2027 (Ashura) | confirmed |

The remaining 2027 dates were **not** independently re-checked in this run and
keep the calendar's "estimated" label. Islamic dates depend on local moon
sighting and may shift by a day; wedding-cluster dates are astrological muhurats
and shift more.

---

## 4. The normal price pattern

### 4.1 Trend

An unrestricted regression of log price on a linear trend, two annual harmonics
and weekday dummies gives a trend of **+20.1% per year** and R² of 0.46. That
number is not usable for forecasting, for a structural reason: with 1.5 annual
cycles, a linear trend and annual harmonics are almost collinear, so the
coefficients are individually meaningless even though the fit is decent. The
diagnostic makes it concrete (`trend_instability.csv`):

| fitted to data up to | implied trend | 30-day forecast | 90-day forecast | last observed |
|---|---|---|---|---|
| 2025-10-01 | +41,187%/yr | 258 | 2,619 | 110 |
| 2026-01-01 | −45%/yr | 93 | 68 | 104 |
| 2026-04-01 | −19%/yr | 91 | 74 | 102 |
| 2026-07-01 | +12%/yr | 117 | 119 | 134 |
| 2026-10-01 | +16%/yr | 117 | 138 | 117 |

A one-year-ahead extrapolation built on such a coefficient is worthless. The
consequence is a design decision, not a preference: **no drift is extrapolated
in the base forecast.** A drift sensitivity band is reported instead
(Section 7.4).

### 4.2 Seasonality

* **Annual cycle.** With two harmonics the joint test is significant
  (χ² = 19.1, p = 0.0008) and the implied seasonal amplitude is +12.9% at its
  peak (early April) and −16.4% at its trough (early December) *relative to the
  sample mean* — but that description is driven by the 2025 June–July collapse,
  which 2026 did not repeat. With one harmonic (the specification used for the
  forecast, chosen by backtest) the shape is smoother: peak in late
  December–February, trough in July–August.
* **Weekday.** Joint χ² = 15.0, p = 0.020. Saturday is −3.2% and Friday −2.4%
  relative to Sunday; the other days are within ±1%. The effect is small but
  real enough to include in the daily model.
* **Regime events.** Monsoon, winter fog, summer heat and Sawan are the annual
  cycle, not separately identified shocks. Their raw price levels are in
  `baseline_monthly_profile.csv`; no incremental effect is claimed.

### 4.3 Volatility and breaks

Daily returns have a 5.6% standard deviation, a near-zero AR(1) of daily
changes (0.09), and price autocorrelation of 0.66 at 7 days and 0.20 at 30 days
— persistent level, noisy day-to-day. A sup-F break scan over the mean of log
price peaks on **3 November 2025** (F = 165), which is the recovery from the
mid-2025 trough. The series is better described as level regimes than as a
stable trend, which is exactly why the forecast re-anchors its level.

---

## 5. Historical event effects

### 5.1 Method

Event effects are identified with a **local matched-window event study**.

For each occurrence:
* `E` = mean log price on the official event dates (observed days only);
* `M` = mean log price over 14 days immediately before the lead-in and 14 days
  immediately after the recovery, excluding days that belong to the core window
  of a *different* discrete event;
* the effect is `Δ = mean(E) − mean(M)`, reported as `(exp(Δ) − 1) × 100`.

Why matched windows rather than a global trend: the global trend is neither
identified nor stable (Section 4.1), and a symmetric local window removes level
drift without imposing a functional form. Why not a before/after difference:
the symmetric window averages the pre- and post-event level, so a trend in
either direction largely cancels.

Uncertainty: a circular block bootstrap of the local price path (2,000
replications, 7-day blocks) preserves serial correlation. Occurrences are pooled
per event with a random-effects model. Event estimates are then shrunk toward a
**pooled category effect** with a three-level empirical-Bayes scheme:

```
event effect   ~ N(category effect, tau_within^2)      tau_within estimated = 2.2% (log)
category effect ~ N(0, 4%^2)                            documented hyper-parameter
```

The 4% hyper-parameter matters: with only five categories it cannot be
estimated, and the value chosen avoids two failure modes — erasing the
well-evidenced wedding effect, or believing a one-day Deepotsav estimate
at face value. The shrinkage weight on own evidence is reported for every event
(0.09 for a one-day festival, 0.67 for weddings).

This is an **association**, not a causal effect. There is no control group, no
counterfactual market, and unobserved supply shocks (feed, disease, heat,
transport) move with the same calendar. The report says "estimated association"
throughout.

### 5.2 Results

Full table: `outputs/tables/historical_event_impact.csv`; occurrence-level:
`historical_event_occurrences.csv`.

| event | observed price | matched baseline | absolute | raw effect | 95% CI (raw) | pooled effect | 80% CI (pooled) | n occ | n days | grade |
|---|---|---|---|---|---|---|---|---|---|---|
| raksha-bandhan | 85.0 | 69.3 | +15.7 | +22.6% | −0.8 to +51.5 | +1.1% | −3.1 to +5.4 | 1 | 1 | D |
| muharram | 98.0 | 92.5 | +5.5 | +5.9% | −10.6 to +25.4 | +1.9% | −2.8 to +6.8 | 2 | 2 | D |
| lagan-weddings | 110.7 | 105.6 | +5.2 | +4.9% | +1.2 to +8.8 | **+4.6%** | +2.6 to +6.7 | 12 | 137 | **A** |
| sharad-navratri | 100.8 | 96.5 | +4.2 | +4.4% | −10.6 to +21.8 | −0.7% | −3.9 to +2.7 | 1 | 7 | D |
| nirjala-ekadashi | 100.0 | 96.0 | +4.0 | +4.1% | −12.7 to +24.2 | −0.8% | −4.1 to +2.6 | 2 | 2 | D |
| pitru-paksha | 108.9 | 105.0 | +3.8 | +3.7% | −6.9 to +15.4 | −0.3% | −3.4 to +2.9 | 2 | 14 | C |
| eid-ul-adha | 84.0 | 82.6 | +1.4 | +1.7% | −21.7 to +32.0 | +1.1% | −3.8 to +6.3 | 1 | 3 | D |
| christmas-new-year | 99.5 | 100.9 | −1.3 | −1.3% | −8.9 to +6.8 | −1.1% | −4.4 to +2.3 | 1 | 9 | D |
| janmashtami | 81.5 | 85.9 | −4.4 | −5.1% | −18.3 to +10.2 | −1.7% | −5.0 to +1.6 | 2 | 2 | D |
| holi | 102.0 | 108.2 | −6.2 | −5.7% | −14.8 to +4.3 | −2.5% | −6.0 to +1.2 | 1 | 1 | D |
| diwali-window | 85.0 | 90.8 | −5.9 | −6.5% | −15.6 to +3.7 | −2.6% | −6.2 to +1.1 | 1 | 2 | D |
| deepotsav | 82.0 | 90.6 | −8.6 | −9.5% | −18.9 to +1.2 | −5.3% | −9.1 to −1.3 | 1 | 1 | D |
| chaitra-navratri | 88.9 | 98.9 | −10.0 | −10.0% | −17.9 to −1.5 | −3.7% | −6.6 to −0.7 | 1 | 6 | D |
| karwa-chauth | 80.0 | 90.6 | −10.6 | −11.7% | −20.5 to −1.9 | −3.6% | −6.6 to −0.5 | 1 | 1 | D |
| chhath | – | – | – | – | – | −0.9% | −5.2 to +3.6 | 0 | 0 | E |
| dussehra | – | – | – | – | – | −0.9% | −5.2 to +3.6 | 0 | 1 | E |
| eid-ul-fitr | – | – | – | – | – | +1.1% | −4.1 to +6.5 | 0 | 0 | E |

Category pools (after the category-level shrinkage):

| category | occurrences | raw pooled | pooled effect | 95% CI |
|---|---|---|---|---|
| wedding | 12 | +4.9% | **+4.0%** | +0.6 to +7.5 |
| islamic | 3 | +4.6% | +1.1% | −5.6 to +8.2 |
| festival | 4 | −1.8% | −0.9% | −6.2 to +4.6 |
| observance | 11 | −1.6% | −1.3% | −4.8 to +2.4 |
| fair | 1 | −9.5% | −3.3% | −9.3 to +3.1 |

### 5.3 What this does and does not say

* **Weddings are the one robust finding.** The effect is stable across 12
  clusters (occurrence range −1.1% to +21.0%, but the wide ones are the
  five-day clusters where a single price swing dominates), and the pooled
  estimate is +4.6% with an 80% interval that excludes zero. It survives
  shrinkage because the shrinkage weight on its own evidence is 0.67.
* **The festival result contradicts the hypothesis and should be reported as
  such.** Prices around the October–November 2025 festival cluster were *below*
  the local baseline. Two mechanisms are consistent with the data and cannot be
  separated here: (i) festival demand is already priced in during the previous
  weeks, and (ii) the whole cluster sat inside a falling market. The lead-in
  analysis is suggestive: across all discrete events the median lead-in
  movement is +4.1% and the median ratio of lead-in to core movement is 1.09,
  i.e. much of any festival movement happens *before* the official dates.
* **Lead-in and recovery.** Pooled across occurrences, the mean movement in the
  2-day lead-in is +5.3% and in the 2-day recovery +3.5% (median ratio to the
  core movement 1.09 and 0.35 respectively). These are descriptive: they are not
  estimated per event and are **not** added to the forecast, which applies the
  effect to official event dates only. The forecast therefore probably
  understates the total event-period association.
* **No effect is causal.** The matched window removes level drift; it does not
  remove a supply shock that happens to coincide with the event.

---

## 6. Forecasting model

### 6.1 Candidates

| model | specification |
|---|---|
| `naive` | last observed price carried forward |
| `ma7` | mean of the last 7 observations |
| `snaive7` | price observed 7 days earlier |
| `ets_damped` | ETS(A,Ad,N) on the daily grid, gaps bridged linearly |
| `ets_weekly` | ETS(A,Ad,A7) on the same grid |
| `seasonal_anchor` | log p ~ 1 annual harmonic + weekday dummies, level re-anchored to the last 3 observations, no trend |
| `seasonal_anchor_events` | same + event offsets from Section 5 |
| `seasonal_flat` / `_events` | same seasonal shape but a full-sample level (no re-anchoring) |

A trend + harmonics specification was deliberately excluded after the
identification failure documented in Section 4.1. One harmonic rather than two
was chosen by out-of-sample comparison: with two, the 29–90 day sMAPE of the
anchored model rose from 15.9% to 20.7%.

### 6.2 Validation design

* **Chronological rolling origins**, every two weeks from **1 April 2026 to
  1 September 2026** — 11 origins. April 2026 is the first date with a full
  annual cycle of history; earlier origins are shown in the instability table
  but are not used for model selection.
* **Horizons 1–90 days**, scored only on days with an observed price.
* **Event effects are re-estimated at every origin** with the same estimator,
  cutting the data at the origin and dropping any occurrence whose comparison
  window would extend beyond it. No future information enters.
* **5,229 scored model-days** (581 days × 9 models), no failed fits — see
  `data/processed/backtest_predictions.csv`.

### 6.3 Results

Overall, all horizons 1–90:

| model | n | MAE (INR) | RMSE (INR) | sMAPE % | bias (INR) | bias % |
|---|---|---|---|---|---|---|
| ma7 | 581 | 14.20 | 17.64 | **13.40** | +2.67 | +2.5 |
| seasonal_anchor_events | 581 | 14.29 | 17.55 | 13.66 | −2.82 | −2.7 |
| seasonal_anchor | 581 | 14.94 | 18.30 | 14.33 | −3.89 | −3.7 |
| ets_weekly | 581 | 15.22 | 19.43 | 14.33 | +5.11 | +4.8 |
| ets_damped | 581 | 15.41 | 19.77 | 14.49 | +5.47 | +5.1 |
| naive | 581 | 15.41 | 19.77 | 14.49 | +5.47 | +5.1 |
| snaive7 | 581 | 15.63 | 19.93 | 14.69 | +5.33 | +5.0 |
| seasonal_flat_events | 581 | 18.87 | 22.72 | 18.70 | −18.05 | −17.0 |
| seasonal_flat | 581 | 19.80 | 23.78 | 19.70 | −18.98 | −17.8 |

By horizon bucket (sMAPE %):

| model | 1–7 d | 8–28 d | 29–90 d |
|---|---|---|---|
| seasonal_anchor_events | 8.07 | 11.10 | 15.32 |
| seasonal_anchor | 8.40 | 11.94 | 15.96 |
| ets_weekly | 7.37 | 12.31 | 15.96 |
| ma7 | 8.32 | 12.22 | 14.48 |
| naive | 7.18 | 12.59 | 16.13 |

Event days vs non-event days (sMAPE %), selected model:

| | event windows | non-event days |
|---|---|---|
| seasonal_anchor_events | **13.5** | 13.8 |
| seasonal_anchor (no event offsets) | 15.6 | 13.8 |

The event offsets cut event-window error from 15.6% to 13.5% without touching
non-event days — the clearest evidence that the event component adds something
real, even though the individual effects are small.

### 6.4 Selection and honest caveats

* **Selected for the forecast:** `seasonal_anchor_events`. It has the best 1–28
  day accuracy of the nine candidates (weighted sMAPE 10.3% vs 11.0% for the
  next best), it improves on its own no-event version, and it is the only model
  that separates baseline from event effects within one specification.
* **It is not the overall winner.** A 7-day moving average has a slightly lower
  sMAPE over the full 1–90 day mix (13.40% vs 13.66%) and a slightly lower MAE
  (14.20 vs 14.29). Both are within noise on 581 observations; neither dominates.
* **Biases differ in sign.** The selected model under-predicts by 2.7% on
  average; `naive` and ETS over-predict by ~5%. Reporting only sMAPE would hide
  this.
* **The validation sample is small.** 11 origins, six months of test data, one
  price regime. A different six months could reverse the ranking. Nothing in
  this report should be read as "this model is better than ETS" in general — only
  "on this sample, for these horizons, it was".
* **No claim of festival accuracy.** Event-window accuracy is 13.8% sMAPE, i.e.
  the model does not predict festival prices to within a few percent. It predicts
  them slightly better than a model that ignores events — that is all.

### 6.5 Prediction intervals

Errors grow with horizon: the standard deviation of the log error is
**7.1% at one day, 15.0% at 30 days and 19.0% at 90 days**, following roughly
`sigma(h) = 0.071 × h^0.22`.
Beyond the tested 90-day horizon that power law is extrapolated, but it is
**floored by the empirical dispersion of 12-month log price changes**
(23.7%, 99 year-over-year pairs from this sample) so that level shifts are not
understated. At h = 434 days this gives a 27% standard deviation.

Intervals are therefore **prediction intervals for an individual daily price**,
not confidence bands for a mean. They combine residual noise, parameter
uncertainty, event-effect uncertainty (added in quadrature on event days) and,
beyond 90 days, the observed year-on-year variability.

---

## 7. Forecast

### 7.1 Baseline versus event-adjusted

For every date:

* **Baseline** = seasonal anchor fitted to the event-adjusted series, with all
  discrete event offsets switched off.
* **Event-adjusted** = the same fitted model with the shrunk event offsets
  switched on for the official dates of each event.
* **Impact** = the difference, reported in INR and in %. Overlapping events are
  added on the log scale (multiplicative), so their impacts compound rather than
  being attributed to each other.

Both are model-derived counterfactuals. The baseline is **not** an observed
price and was never traded.

### 7.2 Headline path

| date | forecast | baseline | impact | 80% interval | 95% interval | active events |
|---|---|---|---|---|---|---|
| 2026-10-24 | 100.5 | 100.5 | 0.0% | 91.8–110.1 | 87.5–115.5 | – |
| 2026-11-08 | 101.9 | 104.7 | −2.6% | 85.9–121.0 | 78.5–132.4 | Diwali |
| 2026-12-31 | 115.1 | 116.4 | −1.1% | 91.2–145.3 | 80.7–164.3 | Christmas–New Year |
| 2027-03-31 | 113.6 | 113.6 | 0.0% | 86.2–149.8 | 74.4–173.4 | – |
| 2027-06-30 | 100.7 | 100.7 | 0.0% | 74.2–136.6 | 63.1–160.6 | – |
| 2027-12-31 | 111.9 | 113.2 | −1.1% | 79.2–158.3 | 65.9–190.1 | Christmas–New Year |

Monthly means of the event-adjusted path:

| month | INR/kg | month | INR/kg |
|---|---|---|---|
| 2026-11 | 107.2 | 2027-06 | 105.1 |
| 2026-12 | 113.2 | 2027-07 | 99.7 |
| 2027-01 | 117.3 | 2027-08 | 97.3 |
| 2027-02 | 120.4 | 2027-09 | 98.9 |
| 2027-03 | 115.9 | 2027-10 | 101.4 |
| 2027-04 | 110.4 | 2027-11 | 110.2 |
| 2027-05 | 109.3 | 2027-12 | 113.5 |

The shape is the fitted one-harmonic annual cycle: a winter peak in
January–February, a monsoon trough in July–August, and a recovery into
November–December.

### 7.3 Event-specific results

`outputs/tables/event_forecasts.csv` has one row per future occurrence (34
rows). Summary:

| event | occurrences in horizon | forecast impact* | event-period mean | reliability |
|---|---|---|---|---|
| Wedding seasons (*lagan*) | 11 | **+4.6%** | 102.9 – 120.6 | A |
| Muharram (2027-06-16) | 1 | +6.6% | 108.9 | D |
| Eid-ul-Adha (2027-05-15/17) | 1 | +5.7% | 109.5 | D |
| Eid-ul-Fitr (2027-03-08/10) | 1 | +5.7% | 121.4 | E |
| Maha Shivaratri (2027-03-06) | 1 | +4.2% | 115.7 | D |
| Nirjala Ekadashi (2027-06-14) | 1 | +3.8% | 104.6 | D |
| Raksha Bandhan (2027-08-17) | 1 | +1.0% | 98.3 | D |
| Pitru Paksha (2027-09-16/29) | 1 | −0.3% | 99.3 | C |
| Sharad Navratri (2027-09-30/10-08) | 1 | −0.7% | 100.5 | D |
| Hartalika Teej (2027-09-03) | 1 | −0.8% | 97.0 | D |
| Chhath (2026-11-13, 2027-11-02) | 2 | −0.9% | 104.8 – 105.2 | E |
| Dussehra (2027-10-09) | 1 | −0.9% | 97.5 | E |
| Christmas–New Year | 2 | −1.1% | 111.7 – 112.1 | D |
| Janmashtami (2027-08-25) | 1 | −1.7% | 97.3 | D |
| Holi (2027-03-21/22) | 1 | −2.5% | 109.5 | D |
| Diwali window (2026-11-06, 2027-10-27) | 2 | −3.6% | 100.5 – 101.9 | D |
| Karwa Chauth (2026-10-29, 2027-10-18) | 2 | −3.6% | 99.0 – 103.3 | D |
| Chaitra Navratri (2027-04-07/15) | 1 | −3.6% | 106.8 | D |
| Ayodhya Deepotsav (2026-11-07, 2027-10-28) | 2 | **−7.8%** | 94.6 – 98.7 | D |

\* Mean over the event's core days of (forecast / baseline − 1). Where two
events overlap this is the **combined** effect, not something attributable to
the named event alone. The per-day Diwali offset is −2.6%; the −3.6% row average
includes 7 November 2026, when Deepotsav coincides.

The Eid-ul-Fitr row illustrates the honesty constraint: there is **no observed
price inside any historical Eid-ul-Fitr window**, so its +5.7% is the Islamic
category prior (itself +1.1%) plus the overlapping wedding cluster on the same
days — not an Eid effect. The event row says so.

### 7.4 Drift sensitivity

Because no drift is extrapolated, the long-horizon level depends entirely on the
seasonal anchor. For transparency, the path under four annual drift assumptions:

| annual drift | 2027-06-30 baseline | 2027-12-31 baseline | 2027-12-31 event-adjusted |
|---|---|---|---|
| 0% (base case) | 100.7 | 113.4 | 111.8 |
| +6% | 104.8 | 121.5 | 119.8 |
| +12% | 108.8 | 129.8 | 127.9 |
| +20% (the unrestricted regression slope) | 114.1 | 140.9 | 138.8 |

The +20% row is what a naive trend extrapolation would imply. It is shown, not
adopted.

---

## 8. Limitations and unobserved confounders

1. **One series, no covariates.** Feed prices, chick placement, bird weight,
   mortality, disease outbreaks (particularly avian influenza), transport,
   weather shocks, imports and policy are all invisible. Any of them can
   dominate the price on a given day, and all of them are correlated with
   season and festival timing.
2. **Thin event evidence.** 13 of 19 discrete events have ≤ 2 observed days.
   Their estimates are mostly the category prior. Treat them as weak priors.
3. **Overlap.** Most event windows share days. Effects of co-occurring events
   cannot be separated, and the report does not pretend otherwise.
4. **Trend/seasonality are not separable** in 1.5 cycles. The forecast's flat
   drift is a choice, not a finding; Section 7.4 shows the alternative.
5. **31% of days are missing, not at random** with respect to price volatility
   perhaps, but there is no way to test that with the data at hand.
6. **The unit is inferred**, not documented by the source. If the tracker is
   dressed weight or per-bird, every level in this report is wrong by a
   constant factor.
7. **Intervals beyond 90 days are extrapolated**, calibrated partly on
   year-on-year variability from only 99 pairs, all drawn from one 18-month
   window.
8. **Structural breaks are likely.** The 2025 trough/to-2026 recovery is the
   dominant feature of the sample; a repeat of a −50% collapse would sit far
   outside the central path (though inside the 95% band).
9. **No causal claim.** Event effects are associations estimated from a single
   time series with no control group.

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
│   ├── 01_ingest.py … 08_verify_event_dates.py
├── outputs/tables/               every table as CSV
├── outputs/charts/               eight figures as PNG
├── outputs/chicken_price_deliverables.xlsx
└── logs/                         JSON run logs, data-quality audit, 26 consistency checks
```

Full rebuild: `bash run_all.sh` (about 25 seconds). The consistency suite
(`07_export.py`, 26 checks, all passing on the delivered run) verifies
day-by-day coverage, arithmetic identities between the three forecast columns,
interval ordering, event-effect consistency between the daily and event tables,
the absence of look-ahead in the backtest, and that the raw inputs are
unmodified.

To add new observations: append rows to the raw CSV, re-run. The forecast start
date follows the last quoted day automatically.
