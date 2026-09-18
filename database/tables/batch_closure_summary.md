---
table: batch_closure_summary
schema_hash: fnv1a64:c6df34a2965ec21d
last_schema_verified: 2026-09-18
semantic_confidence: needs-verification
---

# batch_closure_summary

## Purpose

Unknown — needs verification.

## Database

PostgreSQL · schema `public`

## Owner

Unknown — needs verification.

Candidate code (inferred — needs verification): `src/handlers/batch_sales.rs` (9 refs), `src/handlers/metrics.rs` (6 refs), `src/handlers/inserts.rs` (5 refs)

## Consumers

Unknown — needs verification.

<!-- BEGIN GENERATED: schema -->
## Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| available_chicken_count | integer | no | — |
| batch_id | integer | no | — |
| end_date | date | no | — |
| gross_profit | numeric(12,2) | no | 0 |
| id | integer | no | nextval('batch_closure_summary_id_seq'::regclass) |
| initial_chicken_count | integer | no | — |
| revenue | numeric(12,2) | no | 0 |
| start_date | date | no | — |

## Primary Key

`id`

## Foreign Keys

| Constraint | Columns | References | On Update | On Delete |
|---|---|---|---|---|
| batch_closure_summary_batch_id_fkey | batch_id | public.batches(batch_id) | NO ACTION | CASCADE |

## Indexes

| Index | Unique | Method | Columns | Predicate |
|---|---|---|---|---|
| batch_closure_summary_pkey | yes | btree | id | — |

## Constraints

_None._

<!-- END GENERATED: schema -->

## Relationships

See the generated foreign keys above, `database/relationships.md`, or run
`./db-knowledge relationships batch_closure_summary`.

## Data Flow

Unknown — needs verification.

## Important Invariants

Unknown — needs verification. See `database/invariants.md`.

## Common Queries

```sql
SELECT *
FROM batch_closure_summary
LIMIT 20;
```

## Debugging Notes

None recorded yet.

## Related Tables

Run `./db-knowledge relationships batch_closure_summary` or `./db-knowledge impact batch_closure_summary`.

## Last Verified

Structural: 2026-09-18 (generated) · Semantic: never — needs verification.

## Confidence

- structural facts: generated from the live database
- semantic facts: needs verification
