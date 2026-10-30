# Wholesale chicken price — run report

Generated 2026-10-30 05:08 UTC from data through **2026-10-28**
(576 quoted days). Model `anchor_events`; run `export`;
dataset `8e9baf4593b20b87`.

## What this run says

- **event strength.** 8 of 19 events separate from zero at the 80% level. Above baseline: Vijayadashami (Dussehra) (+7.9%), Wedding season (Lagan) muhurat cluster (+6.1%), Pitru Paksha (Shraddh) (+3.9%), Chhath Puja (+3.8%), Eid-ul-Fitr (Ramzan Id) (+3.8%). Below baseline: Diwali to Bhai Dooj festival window (−4.7%), Karwa Chauth (−6.2%), Ayodhya Deepotsav (−7.2%).
- **strongest event.** Wedding season (Lagan) muhurat cluster is the only grade-A effect: +6.1% (80% interval +3.4% to +8.8%, 12 occurrences, 163 quoted days).
- **festival pool.** Pooled festival windows sit at +0.6% (95% interval −4.2% to +5.6%), too imprecise to confirm or reject the direction the calendar expects.
- **forecast path.** The path runs from ₹87.9 on 2026-10-29 to ₹98.1 on 2027-12-31, with the seasonal shape peaking at ₹102.2 around 2027-02-10 and bottoming at ₹86.9 around 2027-08-14.
- **forecast interval.** The 95% interval at the end of the horizon is ₹60.5 to ₹159.1 — a band about 101% as wide as the central value. That width is the honest summary of what this history supports; the level is one draw from it, the shape is the part worth trusting.
- **validation.** The selected model (anchor_events) scores 13.0% sMAPE overall, 11.7% at 8–28 days and 14.0% at 29–90 days. It is the best of the candidates tested.
- **evidence depth.** 9 of 19 events last two days or less, so each estimate rests on that many observations; the price series itself has no gaps. Event conclusions are associations in a thin sample, not causal effects.

## Data

| item | value |
|---|---|
| observations | 576 |
| first / last quote | 2025-04-01 / 2026-10-28 |
| calendar days in span | 576 |
| days with no quote | 0 (0.0%) |
| gap runs / longest gap | 0 / 0 days |
| mean / min / max | 100.7 / 59 / 145 INR per kg |
| source | csv |

Missing days are never filled. Models fit on quoted days only.

## Event estimates

| event | category | occ | days | raw | pooled | 80% CI | grade |
|---|---|---|---|---|---|---|---|
| Vijayadashami (Dussehra) | festival | 2 | 2 | +13.23% | +7.94% | +3.1% to +13.0% | D |
| Wedding season (Lagan) muhurat cluster | wedding | 12 | 163 | +6.27% | +6.07% | +3.4% to +8.8% | A |
| Pitru Paksha (Shraddh) | observance | 2 | 28 | +5.12% | +3.85% | +0.5% to +7.3% | C |
| Chhath Puja | festival | 1 | 4 | +4.47% | +3.81% | +0.6% to +7.1% | D |
| Eid-ul-Fitr (Ramzan Id) | islamic | 1 | 3 | +4.35% | +3.81% | +0.4% to +7.3% | D |
| Raksha Bandhan | festival | 2 | 2 | +10.86% | +3.79% | −2.2% to +10.1% | D |
| Muharram / Ashura | islamic | 2 | 2 | +8.12% | +3.61% | −2.3% to +9.9% | D |
| Sharadiya Navratri | observance | 2 | 19 | +4.56% | +2.65% | −1.6% to +7.1% | C |
| Nirjala Ekadashi | observance | 2 | 2 | +11.13% | +2.56% | −3.2% to +8.6% | D |
| Hartalika Teej | observance | 2 | 2 | +4.51% | +1.67% | −3.5% to +7.1% | D |
| Christmas and New Year holidays | festival | 1 | 9 | −2.40% | −1.10% | −5.2% to +3.1% | D |
| Maha Shivaratri | observance | 1 | 1 | −1.37% | −1.14% | −3.9% to +1.7% | D |
| Eid-ul-Adha (Bakrid) and preceding days | islamic | 2 | 6 | −6.63% | −1.45% | −6.6% to +4.0% | C |
| Chaitra Navratri | observance | 2 | 14 | −3.93% | −1.79% | −6.6% to +3.2% | C |
| Holi and Holika Dahan | festival | 1 | 2 | −5.47% | −3.16% | −7.1% to +0.9% | D |
| Krishna Janmashtami | observance | 2 | 3 | −10.24% | −3.28% | −8.5% to +2.2% | D |
| Diwali to Bhai Dooj festival window | festival | 1 | 6 | −7.21% | −4.69% | −8.3% to −0.9% | D |
| Karwa Chauth | observance | 1 | 1 | −11.68% | −6.19% | −10.4% to −1.7% | D |
| Ayodhya Deepotsav | fair | 1 | 1 | −10.16% | −7.19% | −11.8% to −2.3% | D |


| category | occurrences | raw | pooled | 95% CI |
|---|---|---|---|---|
| wedding | 1 | +6.27% | +4.86% | +1.1% to +8.8% |
| islamic | 3 | +2.23% | +1.23% | −3.9% to +6.7% |
| festival | 6 | +0.98% | +0.60% | −4.2% to +5.6% |
| observance | 8 | −0.35% | −0.25% | −4.2% to +3.9% |
| fair | 1 | −10.16% | −3.66% | −9.6% to +2.6% |


`raw` is the matched-window difference; `pooled` shrinks it toward the category
level so a one-day event cannot pose as a recurring effect. Grade A is the only
level with enough independent occurrences to act on.

## Forecast

| date | forecast | baseline | impact | 80% | 95% | events |
|---|---|---|---|---|---|---|
| 2026-10-29 | ₹87.9 | ₹93.7 | −6.2% | ₹76.5–₹101.2 | ₹71.0–₹108.9 | karwa-chauth |
| 2027-02-10 | ₹108.4 | ₹102.2 | +6.1% | ₹86.1–₹136.4 | ₹76.3–₹154.1 | lagan-weddings |
| 2027-08-14 | ₹86.9 | ₹86.9 | +0.0% | ₹67.2–₹112.4 | ₹58.6–₹128.8 | — |
| 2027-12-31 | ₹98.1 | ₹99.2 | −1.1% | ₹71.6–₹134.6 | ₹60.5–₹159.1 | christmas-new-year |


| month | INR/kg | month | INR/kg |
|---|---|---|---|
| 2026-10 | ₹90.9 | 2027-06 | ₹96.1 |
| 2026-11 | ₹95.5 | 2027-07 | ₹90.7 |
| 2026-12 | ₹100.1 | 2027-08 | ₹88.0 |
| 2027-01 | ₹103.7 | 2027-09 | ₹90.9 |
| 2027-02 | ₹106.9 | 2027-10 | ₹91.3 |
| 2027-03 | ₹102.8 | 2027-11 | ₹99.3 |
| 2027-04 | ₹98.8 | 2027-12 | ₹100.4 |
| 2027-05 | ₹98.7 |  |  |


The baseline is the same fitted model with every event offset switched off. It is
a counterfactual, not an observed price. Bands are prediction intervals for a
single day, not for the mean path.

## Validation

| model | n | MAE ₹ | RMSE ₹ | sMAPE % | bias ₹ |
|---|---|---|---|---|---|
| anchor_events | 939 | 13.61 | 16.67 | **13.03** | +0.17 |
| ma7_events | 939 | 14.29 | 17.74 | 13.46 | +3.76 |
| anchor | 939 | 14.15 | 17.36 | 13.58 | −0.53 |
| ma7 | 939 | 14.57 | 17.99 | 13.78 | +2.48 |
| ets_weekly | 939 | 15.31 | 19.14 | 14.49 | +6.35 |


Rolling origins, horizons 1–90 days, scored only on quoted days. Selected model:
**anchor_events** — sMAPE 9.07% (1–7 d), 11.74% (8–28 d),
13.98% (29–90 d). Error curve `sigma(h) = 0.103 × h^0.118`,
floored by a 12-month dispersion of 0.2254.

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
