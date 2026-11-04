# 2026-11-04 — Forecast ledger: prospective four-model trial

## Why

The published forecast could be checked against history, but nothing preserved
what was actually issued on a given day. Any later comparison was a backtest on
corrected data, not evidence that a model called the future.

This is additive. Observed prices, the existing worker, the existing
`analytics_runs` payload and its 50-run pruning are untouched. The four new
tables are an append-only record of issued forecasts and their scores.

## What changed

| object | purpose |
|---|---|
| `forecast_protocols` | one immutable row per fingerprinted method definition |
| `forecast_batches` | one immutable input snapshot and one real issuance timestamp per run |
| `forecast_predictions` | the issued daily paths for all four models |
| `forecast_evaluations` | append-only scoring history against recorded actuals |
| `forecast_evaluation_current` (view) | latest evaluation revision per batch/model/date |
| `forecast_score_rows` (view) | only complete, all-scored, same-revision four-model cohorts |

Guards:

- Protocols, predictions and evaluations raise on `UPDATE`/`DELETE`; a correction
  is a new evaluation revision, not an edit.
- Batches may only change `status`/timestamps/metadata before publication. A
  published batch, its snapshot and its intent key are frozen.
- A batch cannot publish unless every target date has exactly four model rows.
- A prediction may only be inserted into a running, unpublished batch, and only
  when `target_date = origin_date + horizon`.
- The partial unique index `forecast_official_day` allows one official batch per
  protocol and origin date; ad-hoc batches are keyed by snapshot hash instead.

## Verification performed

Through PostgreSQL MCP after the migration, in one transaction rolled back with
a private SQLSTATE so no synthetic forecast was left behind:

- mutating a protocol, a published snapshot, a published batch or an evaluation
  was rejected;
- publishing an empty batch and appending to a published batch were rejected;
- a horizon that did not match its target date was rejected;
- a complete cohort scored, then became ineligible when one revision changed,
  and eligible again once all four carried the same revision;
- marking the outcome `unavailable` removed eligibility.

Also verified against the live database:

- the 583 prices through `2026-11-04` and their ordered-price MD5
  (`f16934f5e22218de9fcde7b475620ef0`) were unchanged by the migration;
- all four tables and both views exist and start empty.

## DDL

Applied from `forecast_ledger_schema_additions.sql` at the repository root, as a
single `DO` block. Everything is additive; no existing table is altered.

## Not done here

The ledger worker was not started and no frontend build was deployed. Until the
worker runs with a pinned `FORECAST_PROTOCOL_ID`, the tables stay empty and the
Analytics ledger shows its empty state. Activation is described in
`chicken_price_forecast/forecast_ledger/README.md`.

The knowledge-base snapshot was **not** refreshed with `./db-knowledge sync`;
run it once after activation to add the generated schema blocks and clear the
drift report. Semantic docs for the four tables are already written.

## Rollback

```sql
DROP VIEW IF EXISTS forecast_score_rows, forecast_evaluation_current;
DROP TABLE IF EXISTS forecast_evaluations, forecast_predictions, forecast_batches, forecast_protocols;
DROP FUNCTION IF EXISTS forecast_prediction_guard(), forecast_batch_guard(), forecast_append_only();
```
