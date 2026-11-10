---
table: forecast_batches
semantic_confidence: verified
---

# forecast_batches

## Purpose

One forecast issuance: the input prices as they stood at capture time, the
time it was captured, the time it was published, and its lifecycle status.

`kind = 'official'` is the trial: exactly one batch per recorded market day at
or after the protocol's `originsFrom`, issued as that day's rate is recorded.
Its snapshot is cut at that day, so a batch never trains on its own targets.
`kind = 'ad_hoc'` is a manual or correction update, held separate so it cannot be
mistaken for the daily trial.

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

`capture` inserts one `queued` batch for every recorded market day at or after
`originsFrom` that has no batch yet, with the snapshot cut at that day, and
`blocked` when the series has a gap or is too short → `claim` moves one row to
`running` with a lease timestamp → `publish` inserts the four-model cohort and
sets `published`; failures set `failed` with a message and are retried up to
three attempts.

## Important Invariants

- `forecast_official_day` is a partial unique index on
  `(protocol_id, origin_date) WHERE kind = 'official'`: one official batch per
  recorded market day per protocol. Re-running capture is therefore idempotent.
- A batch is inserted only when its snapshot validates; an invalid series is
  recorded `blocked` once with the reason and is never retried.
- `metadata.backfill` marks a batch issued after its nominal 00:05 slot. Its
  `published_at` is still the real issue time; nothing is backdated.
- `forecast_batch_immutable` freezes the snapshot, intent key, origin, schedule
  and hashes. After publication the row is fully frozen, including status.
- `(status = 'published') = (published_at IS NOT NULL)`.
- Publication requires exactly four models for every target date (trigger reads
  `forecast_predictions`).
- A fit that has not published within 15 minutes of being claimed is refused by
  the worker and marked failed; `published_at` is never backdated.

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
- No batch for a day you entered: the day is before the protocol's `originsFrom`,
  or no worker ticked after the save. Every recorded day at or after the floor is
  picked up within 15 seconds.
- `blocked` carries the validation reason (internal daily gap, fewer than 366
  observations). Fix the price data; the blocked day is not retried and later days
  stay blocked too, because the series must stay gap-free.
- `metadata.backfill = true`: the batch was issued after its nominal slot, so its
  1–7 day window may already have been recorded. Scores only count outcomes first
  seen after `published_at`.
