# Event-aligned AR-error challenger

Final implementation of the two research rounds. It is a **candidate**, not a
replacement: the published Analytics forecast stays `anchor_events`, and the
four-model ledger cohort is unchanged.

## Selected model

Log-price regression with AR(1) deviations and **no annual harmonic**:

```
y_t   = ln(P_t)
y_t   = m_t + u_t
m_t   = a + weekday(t) + E_t(calendar dates)
u_t   = rho * u_(t-1) + eps_t
P_hat(t+h) = exp( a + weekday + E_(t+h) + rho^h * (y_t - m_t) )
```

- `E_t` is built from **actual event dates**, so moving festivals shift their
  contribution and broad annual terms are untouched.
- Recent prices enter only through the decaying deviation `rho^h (y_t - m_t)`.
- All coefficients are ridge-regularized (`event_penalty=12`, weekday `2`) and
  free in sign: an event may raise, lower, or leave prices unchanged.

The annual harmonic exists as `Config(annual=True)` and was **rejected by
measurement**: at 1-30 days it left MAE unchanged (10.973) while worsening bias
(-0.58 vs +1.35) and large-price underprediction.

## Event features

| Group | Representation |
|---|---|
| `festival`, `observance`, `islamic`, `fair` | lead / core / recovery, 7-day halo, union not sum |
| `sawan`, `ramadan` | moving long observances as their own lead/core/recovery |
| `wedding` | exact Lucknow muhurat dates: upcoming-7-day density, current-day availability, prior-7-day density |

Design rules:

- Overlapping or duplicated occurrences of one group are **capped, never summed**.
  Adding the same occurrence twice leaves the design matrix identical (tested).
- `deepotsav` is dropped: it is nested inside the Diwali window.
- Broad `winter-fog`, `monsoon`, `summer-heat`, `magh-mela` regimes are excluded.
- Winter observances with no replicated response (Pausha Purnima, Sakat Chauth)
  are recorded in the calendar but carry **no invented coefficient**.
- No January term, no universal wedding multiplier.

`calendar-v1.json` is the versioned, sourced overlay. Its SHA-256 is archived with
every forecast, so a later date correction cannot silently change issued output.

Verified corrections and caveats are in `limitations`: Drik Panchang's Lucknow
calendar lists **no January 2026 marriage muhurats**; Magh Mela 2026 opened
**January 3**, not January 14; 2027 Makar Sankranti is January 15 by panchang and
January 14 in holiday listings; Islamic 2027 dates remain tentative.

## Uncertainty

- **Daily bands**: empirical 80/95 absolute log-error quantiles over matured,
  pre-origin errors (unique dates, >=4 origins, >=30 dates). Dependent data, so
  these are not iid conformal guarantees.
- **Beyond 60 days**: widths widen by `sqrt(h/60)` and are labelled
  `uncalibrated_path_scenario`.
- **Weekly averages**: computed from whole simulated paths (block-bootstrapped
  innovations plus conditional ridge parameter draws), never by combining daily
  endpoints. Always labelled a scenario.
- **Tentative calendar**: a \(\pm\)1-day shift scenario is applied to a third of
  paths; the maximum INR effect is exported per issuance.

## Files

| Path | Role |
|---|---|
| `event_forecast/calendar_data.py` | versioned calendar, design matrix, shift/falsification |
| `event_forecast/calendar-v1.json` | sourced dates, corrections, limitations |
| `event_forecast/model.py` | fit, components, diagnostics, validation |
| `event_forecast/uncertainty.py` | calibration, simulation, weekly summaries |
| `event_forecast/service.py` | one issuance: definition, build, `safe_build` |
| `event_forecast/evaluate.py` | fixed-protocol finalist comparison |
| `event_forecast/case_study.py` | January 2027 component case study |
| `forecast_ledger/worker.py` | opt-in `--event-challenger` archiving |

## Reproduce

```bash
PYTHONPATH=. .venv/bin/python -m unittest discover -s event_forecast -t . -p 'test_*.py' -v
PYTHONPATH=. .venv/bin/python -m event_forecast.evaluate \
  --prices event_forecast/input/prices-2026-11-20.json \
  --out event_forecast/outputs/finalists.json
PYTHONPATH=. .venv/bin/python -m event_forecast.case_study \
  --prices event_forecast/input/prices-2026-11-20.json \
  --published event_forecast/input/published-january.json \
  --out event_forecast/outputs/january_2027.json
```

`input/prices-2026-11-20.json` is the MCP-verified 599-day series
(`prices_md5=e0eaf8616720b574057656458a4a474f`,
`dates_md5=66c36e85d3b0241cd340517c85544c38`). Training data is the same real
history; the evaluation is **reconstructed**, because original quote-publication
vintages and archived calendar vintages do not exist.

## Measured results (14 origins, Apr-Oct 2026, max 60 days)

MAE in ₹/kg:

| Model | 1-7 | 1-14 | 1-30 | 1-60 |
|---|---|---|---|---|
| AR(1) | 9.020 | 10.206 | **10.738** | 11.537 |
| Event AR-error (selected) | 9.166 | 10.230 | 10.760 | **11.521** |
| Event + annual harmonic | 8.908 | **10.058** | 10.973 | 11.967 |
| Annual only | **8.904** | 10.116 | 10.973 | 11.918 |
| Production anchor | 9.218 | 11.164 | 11.411 | 13.774 |
| Event AR, calendar shifted +28 d | 9.039 | 10.106 | 10.656 | 11.462 |

- The selected model is **statistically indistinguishable from AR(1)** at short
  horizons and marginally better at 60 days, while beating the production
  anchor at every window.
- **Falsification:** shifting every event date by 28 days is not worse
  (10.656 vs 10.760 at 1-30; 11.462 vs 11.521 at 1-60). The event timing has
  therefore **not** been shown to add predictive accuracy. The capability is
  architectural, not a proven gain.
- 80% coverage on 3 late origins: 85.6% (event AR) and 84.9% (AR(1)) over 146
  scored days - mildly conservative, dependent sample.
- All models underpredicted quotes at or above ₹110/kg by ₹10.7-15.7; event
  features did not remove that failure mode.

## Activating the archive

The candidate is archived **only** for newly issued batches under a protocol that
pins it. Enabling the flag changes the protocol fingerprint, so activation creates
a new cohort rather than mutating the existing one.

Protocol v3 starts its official cohort on the activation day (`originsFrom =
2026-11-21`) so no origin is backfilled after its outcomes were public.

```bash
docker pull sidharthsingh7/rjagro_forecast_ledger:latest
docker run --rm sidharthsingh7/rjagro_forecast_ledger:latest \
  python -m forecast_ledger.worker --describe --event-challenger   # read the pin
docker run -d --restart unless-stopped --name forecast-ledger \
  -e DATABASE_URL=... -e FORECAST_PROTOCOL_ID=<pin> \
  sidharthsingh7/rjagro_forecast_ledger:latest \
  python -m forecast_ledger.worker --event-challenger
```

Expected on the first day a price is recorded: one official batch for that day,
`queued` then `published`, whose `metadata.eventChallenger.status` is `ready`.
Nothing appears retroactively for November 1-20.

## Rollback

Restart the worker without `--event-challenger`, keeping the pin of the
four-model-only protocol (or re-pin). Existing archived metadata stays, the
`/analytics/ledger/challenger` route returns `null`, and the ledger UI shows its
empty state. No SQL, no migration.

## Promotion criteria

Frozen before the prospective trial; **all** required:

1. at least 12 official origins with matured 30-day outcomes;
2. origin-balanced MAE at 1-30 days at least 5% better than both AR(1) and the
   published anchor;
3. the real calendar better than the shifted-calendar falsification by more than
   the 80% paired block-bootstrap interval;
4. no regression in 80% daily coverage.

Until then the incumbent stays published and this model stays a challenger.

**Current status: not promoted.** Objective reasons:

1. No measured advantage over AR(1); the extra structure is not justified by accuracy.
2. The real calendar does not beat a deliberately shifted calendar.
3. Only one December-to-January transition and 60 days of evaluated support.

## Integration

Archiving is opt-in and additive. With `--event-challenger`, the worker stores
the full candidate issuance under `forecast_batches.metadata.eventChallenger`
for **newly issued** batches only; `forecast_predictions` still holds exactly the
four published models, so scoring is untouched and no migration is needed.

Any candidate failure returns `{"status":"unavailable","incumbentUnchanged":true}`
and never blocks publication.

Read-only surface: `GET /analytics/ledger/challenger` returns the latest archived
issuance; the Analytics ledger renders it under "Issued forecasts" with the
component breakdown.
