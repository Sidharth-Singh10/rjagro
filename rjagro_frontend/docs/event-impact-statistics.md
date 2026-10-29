# Wholesale chicken price — run report

Generated 2026-10-29 12:13 UTC from data through **2026-10-28**
(425 quoted days). Model `anchor_events`; run `export`;
dataset `e83e13f42d52eaa4`.

## What this run says

- **event strength.** 5 of 19 events separate from zero at the 80% level. Above baseline: Raksha Bandhan (+6.8%), Wedding season (Lagan) muhurat cluster (+5.4%). Below baseline: Chaitra Navratri (−6.5%), Karwa Chauth (−6.8%), Ayodhya Deepotsav (−6.8%).
- **strongest event.** Wedding season (Lagan) muhurat cluster is the only grade-A effect: +5.4% (80% interval +3.0% to +8.0%, 12 occurrences, 139 quoted days).
- **festival pool.** Pooled festival windows sit at +0.8% (95% interval −4.9% to +6.8%), too imprecise to confirm or reject the direction the calendar expects.
- **forecast path.** The path runs from ₹89.0 on 2026-10-29 to ₹99.8 on 2027-12-31, with the seasonal shape peaking at ₹105.6 around 2027-02-11 and bottoming at ₹84.4 around 2027-08-14.
- **forecast interval.** The 95% interval at the end of the horizon is ₹59.2 to ₹168.2 — a band about 109% as wide as the central value. That width is the honest summary of what this history supports; the level is one draw from it, the shape is the part worth trusting.
- **validation.** The selected model (anchor_events) scores 14.2% sMAPE overall, 12.0% at 8–28 days and 15.7% at 29–90 days. ma7_events scores 12.8% overall, so no single model dominates.
- **evidence depth.** 13 of 19 events have at most two quoted days inside their window, and 151 of 576 calendar days have no quote at all. Event conclusions are therefore associations in a thin sample, not causal effects.

## Data

| item | value |
|---|---|
| observations | 425 |
| first / last quote | 2025-04-01 / 2026-10-28 |
| calendar days in span | 576 |
| days with no quote | 151 (26.22%) |
| gap runs / longest gap | 71 / 15 days |
| mean / min / max | 100.4 / 59 / 145 INR per kg |
| source | csv |

Missing days are never filled. Models fit on quoted days only.

## Event estimates

| event | category | occ | days | raw | pooled | 80% CI | grade |
|---|---|---|---|---|---|---|---|
| Vijayadashami (Dussehra) | festival | 1 | 1 | +21.87% | +6.91% | −0.1% to +14.4% | D |
| Raksha Bandhan | festival | 2 | 2 | +16.05% | +6.81% | +0.3% to +13.7% | D |
| Wedding season (Lagan) muhurat cluster | wedding | 12 | 139 | +5.53% | +5.42% | +3.0% to +8.0% | A |
| Pitru Paksha (Shraddh) | observance | 2 | 14 | +5.47% | +3.58% | −0.8% to +8.1% | C |
| Sharadiya Navratri | observance | 2 | 7 | +7.05% | +3.44% | −1.9% to +9.0% | C |
| Muharram / Ashura | islamic | 2 | 2 | +5.90% | +2.26% | −4.4% to +9.3% | D |
| Nirjala Ekadashi | observance | 2 | 2 | +6.18% | +1.51% | −4.8% to +8.2% | D |
| Chhath Puja | festival | 0 | 0 | — | +1.09% | −6.8% to +9.6% | E |
| Hartalika Teej | observance | 1 | 1 | +2.72% | +0.84% | −5.0% to +7.0% | D |
| Eid-ul-Fitr (Ramzan Id) | islamic | 0 | 0 | — | +0.25% | −7.8% to +9.0% | E |
| Maha Shivaratri | observance | 1 | 1 | +0.22% | +0.13% | −2.7% to +3.0% | D |
| Christmas and New Year holidays | festival | 1 | 9 | −1.33% | −0.63% | −4.9% to +3.8% | D |
| Eid-ul-Adha (Bakrid) and preceding days | islamic | 2 | 4 | −4.15% | −1.34% | −7.8% to +5.5% | D |
| Krishna Janmashtami | observance | 2 | 2 | −5.75% | −2.49% | −8.2% to +3.5% | D |
| Holi and Holika Dahan | festival | 1 | 1 | −5.73% | −3.07% | −7.9% to +2.0% | D |
| Diwali to Bhai Dooj festival window | festival | 1 | 2 | −6.45% | −3.42% | −8.3% to +1.7% | D |
| Chaitra Navratri | observance | 1 | 6 | −10.04% | −6.50% | −10.8% to −2.0% | D |
| Karwa Chauth | observance | 1 | 1 | −11.68% | −6.81% | −11.4% to −1.9% | D |
| Ayodhya Deepotsav | fair | 1 | 1 | −9.45% | −6.83% | −11.8% to −1.6% | D |


| category | occurrences | raw | pooled | 95% CI |
|---|---|---|---|---|
| wedding | 1 | +5.53% | +4.44% | +0.9% to +8.1% |
| festival | 5 | +1.75% | +0.80% | −4.9% to +6.8% |
| islamic | 2 | +0.83% | +0.25% | −6.1% to +7.1% |
| observance | 8 | −1.24% | −0.87% | −5.0% to +3.5% |
| fair | 1 | −9.45% | −3.26% | −9.2% to +3.1% |


`raw` is the matched-window difference; `pooled` shrinks it toward the category
level so a one-day event cannot pose as a recurring effect. Grade A is the only
level with enough independent occurrences to act on.

## Forecast

| date | forecast | baseline | impact | 80% | 95% | events |
|---|---|---|---|---|---|---|
| 2026-10-29 | ₹89.0 | ₹95.5 | −6.8% | ₹78.7–₹100.6 | ₹73.7–₹107.4 | karwa-chauth |
| 2027-02-11 | ₹111.3 | ₹105.6 | +5.4% | ₹86.3–₹143.5 | ₹75.5–₹164.1 | lagan-weddings |
| 2027-08-14 | ₹84.4 | ₹84.4 | +0.0% | ₹62.4–₹114.1 | ₹53.2–₹133.8 | — |
| 2027-12-31 | ₹99.8 | ₹100.5 | −0.6% | ₹71.0–₹140.4 | ₹59.2–₹168.2 | christmas-new-year |


| month | INR/kg | month | INR/kg |
|---|---|---|---|
| 2026-10 | ₹90.7 | 2027-06 | ₹95.0 |
| 2026-11 | ₹95.6 | 2027-07 | ₹89.6 |
| 2026-12 | ₹101.1 | 2027-08 | ₹87.2 |
| 2027-01 | ₹104.8 | 2027-09 | ₹90.1 |
| 2027-02 | ₹108.0 | 2027-10 | ₹91.3 |
| 2027-03 | ₹103.6 | 2027-11 | ₹98.9 |
| 2027-04 | ₹98.1 | 2027-12 | ₹101.4 |
| 2027-05 | ₹98.3 |  |  |


The baseline is the same fitted model with every event offset switched off. It is
a counterfactual, not an observed price. Bands are prediction intervals for a
single day, not for the mean path.

## Validation

| model | n | MAE ₹ | RMSE ₹ | sMAPE % | bias ₹ |
|---|---|---|---|---|---|
| ma7_events | 652 | 13.52 | 16.91 | 12.82 | +2.79 |
| ma7 | 652 | 13.94 | 17.34 | 13.24 | +1.58 |
| anchor_events | 652 | 14.82 | 18.15 | **14.24** | −2.67 |
| ets_weekly | 652 | 15.23 | 19.27 | 14.41 | +5.33 |
| anchor | 652 | 15.34 | 18.78 | 14.78 | −3.23 |


Rolling origins, horizons 1–90 days, scored only on quoted days. Selected model:
**anchor_events** — sMAPE 8.6% (1–7 d), 11.96% (8–28 d),
15.73% (29–90 d). Error curve `sigma(h) = 0.0875 × h^0.174`,
floored by a 12-month dispersion of 0.2436.

## Method, in one paragraph

Event effects come from a matched-window study: the mean log price inside an
event is compared with the 14 days before and after, excluding other events'
core days, with a 2000-draw block bootstrap for uncertainty. Occurrences
are pooled per event and shrunk toward a pooled category effect
(category sd 4%). The forecast is a seasonal anchor —
one annual harmonic, weekday terms, no trend —
with the level re-anchored to the last 3 observations and event
offsets added per date. A trend is deliberately not extrapolated: with 1.5 annual
cycles the trend and the cycle are not separately identified.

## Limits

One price series and a calendar. Feed costs, arrivals, disease, weather and
policy are invisible, and every event estimate is an association in a thin
sample rather than a causal effect. Intervals beyond 90 days are extrapolated.

## Reproducing

```
python -m cp_pipeline run --prices <csv> --out <dir>
```

Config fingerprint `24b60f4a98d77af1`. Same dataset hash and config hash
produce the same payload.
