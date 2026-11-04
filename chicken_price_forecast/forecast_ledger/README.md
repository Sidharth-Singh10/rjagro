# Prospective forecast ledger

Four fixed methods issue a daily forecast from the database prices, keep it
exactly as issued, and are scored automatically as actual quotes arrive. This is
evidence, not a leaderboard: **nothing here promotes a model into production.**
The published Analytics forecast keeps coming from the existing worker.

| Model id | Meaning | Fixed rule |
|---|---|---|
| `existing` | the production event-anchor equation | unchanged `cp_pipeline.run`, including its native bands |
| `hybrid` | frozen reassessment hybrid | HGB at 1–7 days, last price at 8–30, naive/AR(1) mean beyond |
| `ar1` | AR(1) on log price | clipped persistence, equilibrium reversion |
| `naive` | last-price benchmark | carries the last quote |

## Schedule and honesty rules

- **00:05 IST** issues the official daily batch. Midnight IST closes the
  preceding market day, so the batch trains through that day.
- The input snapshot must be captured inside **00:05–00:07 IST**. A worker that
  was down records a `missed` batch; the forecast is never backdated.
- Publication must happen within **15 minutes** of the scheduled time. A late
  fit is marked failed rather than issued with a false timestamp.
- Missing prior-day quote, an internal daily gap, or fewer than 366 observations
  marks the batch `blocked`; nothing is interpolated.
- Ad-hoc captures are stored as `ad_hoc` and are scored separately. They are
  never pooled into the official trial.
- Only outcomes first recorded **strictly after publication** are scored.
  Outcomes already public at protocol activation (`initial_known_dates`) get no
  credit.
- Actual-price corrections append a new evaluation revision. Issued forecasts,
  snapshots, protocols and old evaluations are append-only; a deleted price
  makes a cohort ineligible instead of scoring a stale value.

## Activate it

The schema is already applied. Activation is two deliberate steps, because the
protocol fingerprint pins the methods.

CI builds and pushes `sidharthsingh7/rjagro_forecast_ledger` on every push to
`main` under `chicken_price_forecast/**`, and **prints the fingerprint for the
image it just built** in the run summary. Use that value; it is the one the pushed
image will compute.

```bash
# 1. Pull the image you intend to run (the sha tag matches one build forever; the
#    latest tag moves), then read its fingerprint and review the definition.
docker pull sidharthsingh7/rjagro_forecast_ledger:latest
docker run --rm sidharthsingh7/rjagro_forecast_ledger:latest \
  python -m forecast_ledger.worker --describe
# → {"id": "<64 hex chars>", "definition": {...}}

# 2. Start the worker with that pin.
docker run -d --restart unless-stopped --name forecast-ledger --memory 2g \
  -e DATABASE_URL=postgresql://USER:PASS@HOST:5432/rjagro \
  -e FORECAST_PROTOCOL_ID=<that id> \
  sidharthsingh7/rjagro_forecast_ledger:latest
```

Building locally works the same way, but the fingerprint is computed by *your*
interpreter and package set, so build, describe and run the same local tag:

```bash
cd chicken_price_forecast
docker build -f Dockerfile.ledger -t rjagro_forecast_ledger:local .
docker run --rm rjagro_forecast_ledger:local python -m forecast_ledger.worker --describe
```

Or through the sidecar file, which is opt-in and leaves the existing worker
untouched:

```bash
DATABASE_URL=... FORECAST_PROTOCOL_ID=<id> \
  docker compose -f docker-compose.analytics.yml --profile forecast-ledger up -d --build
```

Without `--profile forecast-ledger` (or an explicit service target) Compose
starts only the existing analytics worker. An empty or stale
`FORECAST_PROTOCOL_ID` makes the container exit at startup on purpose.

A new build keeps the old fingerprint only while the methods, the event calendar
and the pinned package versions are unchanged. Change any of them and the running
container must be restarted with the newly printed pin; it will not silently
continue under a different method.

The first run registers the protocol. Registration reads the dates already in
`chicken_prices` into `initial_known_dates`, so that day's history cannot be
scored as if it were a forecast.

## What you should see

| Time | Expected |
|---|---|
| immediately | one `forecast_protocols` row; no batches until the next 00:05 IST |
| 00:05–00:07 IST | one `official` batch `queued`, then `running`, then `published` |
| as quotes are entered | `forecast_evaluations` rows appear for matured target dates |
| after ~1 week | the first 1–7 day scores; 31+ day buckets stay empty for a month |

```sql
SELECT origin_date, kind, status, requested_at, published_at, error
FROM forecast_batches ORDER BY requested_at DESC LIMIT 10;

SELECT model, count(*), avg(absolute_error)
FROM forecast_score_rows GROUP BY model ORDER BY model;
```

Expect empty long-horizon buckets for a while. Empty is not zero error.

## Reading the results

- Scores come from complete four-model cohorts scored against the same actual
  revision, so the comparison is like-for-like.
- `overlapping origins` are not independent observations. Origin-balanced MAE is
  shown next to pooled MAE for that reason.
- Event counts are distinct event/start-date pairs and calendar years, not
  replications. One festival in one year is not evidence of a festival effect.
- Coverage denominators count only issued bands. Native bands are daily price
  bands, not event-mean intervals; long horizons are labelled scenarios.
- Official and ad-hoc cohorts are reported separately. Official batches are the
  trial; ad-hoc updates are diagnostics.

## Troubleshooting

| Symptom | Cause | Action |
|---|---|---|
| container exits, mentions `FORECAST_PROTOCOL_ID` | pin missing or computed elsewhere | re-run `--describe` inside the image and pin that value |
| `Pinned protocol differs from stored definition` | same fingerprint, different stored bytes | treat as corrupted data; do not edit the protocol row |
| `missed` batches | worker down in the capture window | leave as recorded; fix monitoring |
| `blocked` batches | bad or incomplete price history | fix `chicken_prices`; the batch stays blocked |
| repeated `failed` | model fit error | read container logs; the message is stored in `forecast_batches.error`, details stay in logs |
| accuracy view empty | no matured outcomes yet, or filters too narrow | widen filters; check `forecast_evaluation_current` |

## Tests

```bash
cd chicken_price_forecast
.venv/bin/python -m unittest discover -s forecast_ledger -p 'test_*.py' -v
```

`test_build.py` fits all four models on the approved MCP snapshot (slow, ~40 s)
and checks grid alignment, nesting of bands, and the fixed segment rules. No
database is touched by any test.
