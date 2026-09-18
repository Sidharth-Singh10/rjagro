---
table: batch_allocation_lines
schema_hash: fnv1a64:a6c106436afb9eac
last_schema_verified: 2026-09-18
semantic_confidence: needs-verification
---

# batch_allocation_lines

## Purpose

Unknown — needs verification.

## Database

PostgreSQL · schema `public`

## Owner

Unknown — needs verification.

Candidate code (inferred — needs verification): `src/pdf/contexts.rs` (8 refs), `src/handlers/fetch_by_id.rs` (7 refs), `src/handlers/batch_requirements.rs` (4 refs)

## Consumers

Unknown — needs verification.

<!-- BEGIN GENERATED: schema -->
## Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| allocation_id | integer | no | — |
| allocation_line_id | integer | no | nextval('batch_allocation_lines_allocation_line_id_seq'::regclass) |
| batch_id | integer | yes | — |
| line_value | numeric(12,2) | no | — |
| lot_id | integer | no | — |
| qty | numeric(12,2) | no | — |
| unit_cost | numeric(12,2) | no | — |

## Primary Key

`allocation_line_id`

## Foreign Keys

| Constraint | Columns | References | On Update | On Delete |
|---|---|---|---|---|
| fk_allocation_lines_allocation | allocation_id | public.batch_allocations(allocation_id) | CASCADE | CASCADE |
| fk_allocation_lines_lot | lot_id | public.stock_receipts(lot_id) | CASCADE | RESTRICT |
| fk_batch_allocation_lines_batch | batch_id | public.batches(batch_id) | NO ACTION | CASCADE |

## Indexes

| Index | Unique | Method | Columns | Predicate |
|---|---|---|---|---|
| batch_allocation_lines_pkey | yes | btree | allocation_line_id | — |
| idx_batch_allocation_lines_batch_id | no | btree | batch_id | — |

## Constraints

_None._

<!-- END GENERATED: schema -->

## Relationships

See the generated foreign keys above, `database/relationships.md`, or run
`./db-knowledge relationships batch_allocation_lines`.

## Data Flow

Unknown — needs verification.

## Important Invariants

Unknown — needs verification. See `database/invariants.md`.

## Common Queries

```sql
SELECT *
FROM batch_allocation_lines
LIMIT 20;
```

## Debugging Notes

None recorded yet.

## Related Tables

Run `./db-knowledge relationships batch_allocation_lines` or `./db-knowledge impact batch_allocation_lines`.

## Last Verified

Structural: 2026-09-18 (generated) · Semantic: never — needs verification.

## Confidence

- structural facts: generated from the live database
- semantic facts: needs verification
