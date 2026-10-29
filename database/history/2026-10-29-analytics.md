# 2026-10-29 — Analytics: editable prices and versioned pipeline runs

## Why

The Analytics tab used to read a JSON file built at deploy time from a CSV in
the repository. Correcting a price meant editing a file, re-running a Python
script and redeploying. The numbers could not be updated by the person who
knows them.

This migration moves the price history into the database and adds a run table so
that every edit produces a recorded, reproducible computation.

## What changed

| table | purpose |
|---|---|
| `chicken_prices` | one row per quoted day; the source of truth for the tracker |
| `chicken_price_audit` | append-only record of every insert, correction, delete and import |
| `analytics_runs` | one row per pipeline execution: status, hashes, the payload and the rendered report |
| `analytics_settings` | pipeline knobs (currently the model candidate list and selector) |

Invariants:

- `chicken_prices.price_date` is the primary key, so a day has one quote. A
  missing row means no quote — never zero, never interpolated.
- `price > 0 AND price < 10000` is enforced by the table, not only by the API.
- `analytics_runs_one_queued` is a partial unique index on `status = 'queued'`.
  A burst of edits collapses into one run instead of queueing a job per save.
- A run is never deleted; `status` moves queued → running → succeeded | failed,
  and `error` holds the traceback on failure.

## DDL

Applied from `analytics_schema_additions.sql` at the repository root. Everything
is additive; no existing table is altered.

## Rollback

```sql
DROP TABLE IF EXISTS analytics_settings, analytics_runs, chicken_price_audit, chicken_prices;
```

The pre-migration behaviour is unaffected: the app falls back to the bundled
`app/data/price_forecast.json` when `NEXT_PUBLIC_ANALYTICS_SOURCE` is not `api`.

## Operational notes

- Seed once with `python -m cp_pipeline.cli import-csv --prices <sheet>`.
- The worker prunes succeeded runs beyond the newest 50; payloads are ~90 KB.
- `analytics_runs.requested_by` / `changed_by` reference `users(user_id)` with
  `ON DELETE SET NULL`, so removing a user never rewrites pricing history.
