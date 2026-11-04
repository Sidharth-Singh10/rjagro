---
table: forecast_predictions
semantic_confidence: verified
---

# forecast_predictions

## Purpose

The issued daily price paths (INR/kg live weight) for a batch: one row per
model, target date and horizon, exactly as published. These values are never
recomputed or smoothed afterwards, so a later comparison measures what was
actually claimed.

`interval_status` says where the bands came from
(`native_original_method`, `empirical_dependent_calibration`, or
`unvalidated_sqrt_h_scenario`); `events` lists the calendar events on that date
with their lead-in start, used for event-segment scoring.

The generated schema block is added by `./db-knowledge sync`.

## Owner

`chicken_price_forecast/forecast_ledger/forecasting.py::build` (generation) and
`store.py::publish` (insertion).

## Consumers

`forecast_evaluations` (foreign key), `forecast_score_rows` (horizon and events),
the ledger batch API and the Analytics ledger chart/table.

## Data Flow

Built from the batch's immutable snapshot → inserted in one transaction →
batch marked `published`. Actual prices are joined for display only; they never
alter a prediction row.

## Important Invariants

- `PRIMARY KEY (batch_id, model, target_date)` prevents duplicate points.
- `model` is one of `existing`, `hybrid`, `ar1`, `naive`.
- `target_date = batch.origin_date + horizon`, enforced by
  `forecast_prediction_guard`; inserts are rejected unless the batch is
  `running` and unpublished.
- Bands are positive, contain the point forecast, and nest (95% outside 80%);
  both bounds of a level are present or both absent.
- Append-only: `forecast_prediction_immutable` rejects `UPDATE`/`DELETE`.

## Common Queries

```sql
SELECT model, min(target_date), max(target_date), count(*)
FROM forecast_predictions
WHERE batch_id = $1
GROUP BY model
ORDER BY model;
```

## Debugging Notes

- `Publish a complete four-model cohort atomically`: the insert set was
  incomplete or duplicated; `store.publish` checks this before writing.
- A long run of `insufficient_calibration` (null bands) means the last 12
  historical origins did not yield 4 origins and 30 unique dates for that
  horizon bucket. It is a real limitation, not a rendering bug.
