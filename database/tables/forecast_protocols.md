---
table: forecast_protocols
semantic_confidence: verified
---

# forecast_protocols

## Purpose

One row per frozen forecast method. `id` is the SHA-256 fingerprint of the
method definition: model list, hybrid segment rules, calibration rules, scoring
rules, event calendar, Python version and the versions of the packages that
change fitted numbers. The worker refuses to start unless
`FORECAST_PROTOCOL_ID` matches the fingerprint computed from the code it is
running, so a silent retune cannot wear an old trial's label.

`definition` is the full JSON definition; `initial_known_dates` is the list of
`chicken_prices.price_date` values already known when the protocol was created.
Scoring uses it to refuse credit for outcomes that were already public at
activation.

The generated schema block is added by `./db-knowledge sync`.

## Owner

`chicken_price_forecast/forecast_ledger/protocol.py` (definition and
fingerprint), written by `forecast_ledger/store.py::register`.

## Consumers

`forecast_batches.protocol_id`; the read APIs in `src/handlers/forecast_ledger.rs`;
the Analytics ledger UI, which also lists the definition's model names and event
identifiers.

## Data Flow

`worker --describe` prints the fingerprint without touching the database →
`store.register` inserts it once (`ON CONFLICT DO NOTHING`) and then compares the
stored definition against the running one, raising on any mismatch.

## Important Invariants

- Append-only: `forecast_protocol_immutable` rejects `UPDATE` and `DELETE`.
  Changing a method means registering a new fingerprint, never editing this row.
- `initial_known_dates` is captured from `chicken_prices` at insert time.

## Common Queries

```sql
SELECT id, definition->>'name' AS name, created_at,
       jsonb_array_length(initial_known_dates) AS known_dates
FROM forecast_protocols
ORDER BY created_at DESC;
```

## Debugging Notes

- Worker exits with `Pin FORECAST_PROTOCOL_ID=...` at startup: the pinned value
  was produced by a different image, interpreter or package set. Re-run
  `--describe` **inside the container** and pin that value.
- `Pinned protocol differs from stored definition`: the same fingerprint
  produced different bytes, which should be impossible; treat it as corrupted
  or hand-edited data, not as a reason to update the row.
