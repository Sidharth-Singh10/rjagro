# 2026-11-21 — Event-aligned AR-error challenger archived in batch metadata

## Why

Two research rounds produced an event-aware candidate that follows actual festival
and wedding dates. It needed to be implemented, evaluated and integrated without
replacing the published forecast, because the evidence did not justify promotion.

## What changed

No schema change. `forecast_batches.metadata` gains an opt-in
`eventChallenger` object for newly issued batches when the ledger worker runs with
`--event-challenger`:

| key | meaning |
|---|---|
| `status` | `ready` or `unavailable` (a contained failure) |
| `version`, `fingerprint` | candidate model and its content hash |
| `trainingCutoff`, `datasetHash`, `calendarHash` | what was used, immutably |
| `daily` | per-date prediction, log components, bands, interval status |
| `weekly` | whole-path weekly averages and scenario bands |
| `metadata.rho`, `metadata.coefficients` | fitted persistence and regularized effects |
| `tentativeDateSensitivityMaxInr` | worst INR swing from \(\pm\)1-day tentative dates |

`forecast_predictions` still holds exactly the four published models, so
`forecast_score_rows`, `forecast_evaluation_current` and every scoring rule are
unaffected. A candidate failure is recorded as `status='unavailable'` with
`incumbentUnchanged=true` and never blocks publication.

## New read-only surface

`GET /analytics/ledger/challenger?protocol=<id>` returns the latest archived
`status:'ready'` challenger for a protocol (or `null`). It does not join the
scored cohort and cannot promote anything.

## Verification performed

- Python: 18 tests (`event_forecast` 14, `forecast_ledger` 4 new) plus the
  existing 20 ledger tests, the pipeline golden tests, and the production
  `tests/test_pipeline.py` golden run — all pass.
- Rust: `cargo test forecast_ledger` compiles and passes.
- Frontend: `npx tsc --noEmit` clean; `check_forecast_ledger.mjs` and the new
  `check_event_challenger.mjs` pass.
- Archive size: ~100 KB of JSONB per opted-in batch (TOAST-compressed); list
  queries that do not select `metadata` are unaffected.

## Not done here

The worker was not restarted with `--event-challenger`, so the live database
holds no challenger archive yet. `./db-knowledge sync` was not run because the
schema did not change.

## Rollback

Restart the worker without `--event-challenger`. Existing archived metadata stays
(append-only), the route returns `null`, and the Analytics ledger shows its empty
state. No SQL.
