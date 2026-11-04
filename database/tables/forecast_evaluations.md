---
table: forecast_evaluations
semantic_confidence: verified
---

# forecast_evaluations

## Purpose

Append-only scoring history. Each row scores one issued prediction against one
recorded actual revision, so a corrected or deleted price adds evidence instead
of rewriting it.

`status` is `scored`, `known_before_publication` (the outcome was already public
when the forecast was issued, so no credit is given) or `unavailable` (the price
was deleted or never recorded). `actual_revision` fingerprints the truth version
(`updated_at` plus the latest audit id, or `deleted`).

Errors are `prediction - actual`; positive `error`/`bias` means overprediction.
`width80`/`width95` and `interval_score80/95` are null when that model issued no
usable band for the date, and coverage denominators count only issued bands.

The generated schema block is added by `./db-knowledge sync`.

## Owner

`chicken_price_forecast/forecast_ledger/core.py::evaluate` (arithmetic) and
`store.py::reconcile` (eligibility and insertion).

## Consumers

Views `forecast_evaluation_current` and `forecast_score_rows`; the scores and
report APIs; the Analytics accuracy table and report download.

## Data Flow

`reconcile` (every 15 s, single advisory lock) reads `chicken_prices` and
`chicken_price_audit` at `REPEATABLE READ`, finds issued targets whose current
truth revision has no evaluation yet, appends a row, and stops there. The views
then keep the newest revision per batch/model/date and expose only cohorts where
all four models were scored against the same revision.

## Important Invariants

- `UNIQUE (batch_id, model, target_date, actual_revision)`; repeated ticks are
  idempotent.
- Append-only: `forecast_evaluation_immutable` rejects `UPDATE`/`DELETE`.
- Only outcomes whose first recorded availability is strictly after
  `published_at` can be `scored`.
- A cohort is score-eligible only while all four models have `scored` rows on the
  same revision.

## Common Queries

```sql
SELECT status, count(*)
FROM forecast_evaluation_current
GROUP BY status;

SELECT count(*) FROM forecast_score_rows;
```

## Debugging Notes

- Scores are missing although prices exist: check
  `initial_known_dates` on the protocol, the audit trail for the date, and
  whether `chicken_prices.updated_at` predates publication (that makes the
  outcome `known_before_publication`).
- A cohort disappeared from `forecast_score_rows`: one model's revision moved.
  That is intended — mixed-revision cohorts are not comparable.
- Deleted prices make cohorts ineligible rather than silently scoring the last
  known value.
