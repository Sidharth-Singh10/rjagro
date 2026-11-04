---
table: forecast_batches
semantic_confidence: verified
---

# forecast_batches

## Purpose

One forecast issuance: the input prices as they stood at capture time, the
time it was captured, the time it was published, and its lifecycle status.

`kind = 'official'` is the daily trial batch: it closes the previous market day
at midnight IST and captures at 00:05 IST. `kind = 'ad_hoc'` is a manual or
out-of-schedule update, held separate so it cannot be mistaken for the daily
trial.

`snapshot` holds the price rows actually used (`date`, `price`, `recordedAt`);
`dataset_hash` is the SHA-256 of that JSON; `source_watermark` is the highest
`chicken_price_audit.id` at capture.

The generated schema block is added by `./db-knowledge sync`.

## Owner

`chicken_price_forecast/forecast_ledger/store.py` (`capture`, `claim`, `fail`,
`publish`).

## Consumers

`forecast_predictions`, `forecast_evaluations`, the ledger APIs and the
Analytics ledger UI (history list, issued batch selector).

## Data Flow

`capture` inserts `queued` (or `blocked`/`missed` when the snapshot is unusable
or the two-minute capture window has passed) → `claim` moves one row to
`running` with a lease timestamp → `publish` inserts the four-model cohort and
sets `published`; failures set `failed` with a message and are retried up to
three attempts.

## Important Invariants

- `forecast_official_day` is a partial unique index on
  `(protocol_id, origin_date) WHERE kind = 'official'`: one official batch per
  day per protocol. A missed day stays missed rather than being backfilled.
- `forecast_batch_immutable` freezes the snapshot, intent key, origin, schedule
  and hashes. After publication the row is fully frozen, including status.
- `(status = 'published') = (published_at IS NOT NULL)`.
- Publication requires exactly four models for every target date (trigger reads
  `forecast_predictions`).
- An official batch published more than 15 minutes after `scheduled_for` is
  refused by the worker and marked failed; `published_at` is never backdated.

## Common Queries

```sql
SELECT kind, status, count(*), max(published_at) AS last_published
FROM forecast_batches
GROUP BY 1, 2
ORDER BY 1, 2;
```

## Debugging Notes

- No rows at all: the worker has never run, or its protocol pin is wrong — check
  container logs for the startup refusal.
- A `missed` row means the worker was not alive inside the 00:05–00:07 IST
  capture window. This is a recorded gap, not a bug to repair.
- A `blocked` row carries the validation reason (missing prior-day quote,
  internal daily gap, fewer than 366 observations). Fix the price data; the
  blocked batch is not retried.
