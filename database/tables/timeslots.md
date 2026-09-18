---
table: timeslots
schema_hash: fnv1a64:4bb5a787230d6ce3
last_schema_verified: 2026-09-18
semantic_confidence: needs-verification
---

# timeslots

## Purpose

Unknown — needs verification.

## Database

PostgreSQL · schema `public`

## Owner

Unknown — needs verification.

Candidate code (inferred — needs verification): `src/handlers/trader_app.rs` (10 refs), `src/handlers/timeslots.rs` (8 refs), `entity/src/orders.rs` (3 refs)

## Consumers

Unknown — needs verification.

<!-- BEGIN GENERATED: schema -->
## Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| batch_id | integer | no | — |
| created_at | timestamp with time zone | no | CURRENT_TIMESTAMP |
| slot_end | time without time zone | no | — |
| slot_start | time without time zone | no | — |
| timeslot_id | integer | no | nextval('timeslots_timeslot_id_seq'::regclass) |

## Primary Key

`timeslot_id`

## Foreign Keys

| Constraint | Columns | References | On Update | On Delete |
|---|---|---|---|---|
| timeslots_batch_id_fkey | batch_id | public.batches(batch_id) | NO ACTION | CASCADE |

## Indexes

| Index | Unique | Method | Columns | Predicate |
|---|---|---|---|---|
| timeslots_pkey | yes | btree | timeslot_id | — |

## Constraints

_None._

<!-- END GENERATED: schema -->

## Relationships

See the generated foreign keys above, `database/relationships.md`, or run
`./db-knowledge relationships timeslots`.

## Data Flow

Unknown — needs verification.

## Important Invariants

Unknown — needs verification. See `database/invariants.md`.

## Common Queries

```sql
SELECT *
FROM timeslots
LIMIT 20;
```

## Debugging Notes

None recorded yet.

## Related Tables

Run `./db-knowledge relationships timeslots` or `./db-knowledge impact timeslots`.

## Last Verified

Structural: 2026-09-18 (generated) · Semantic: never — needs verification.

## Confidence

- structural facts: generated from the live database
- semantic facts: needs verification
