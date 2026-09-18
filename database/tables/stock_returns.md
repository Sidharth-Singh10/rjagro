---
table: stock_returns
schema_hash: fnv1a64:3bf2235b66a2c4d6
last_schema_verified: 2026-09-18
semantic_confidence: needs-verification
---

# stock_returns

## Purpose

Unknown — needs verification.

## Database

PostgreSQL · schema `public`

## Owner

Unknown — needs verification.

Candidate code (inferred — needs verification): `src/pdf/contexts.rs` (7 refs), `src/handlers/fetch_by_id.rs` (5 refs), `src/handlers/batch_requirements.rs` (4 refs)

## Consumers

Unknown — needs verification.

<!-- BEGIN GENERATED: schema -->
## Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| allocation_line_id | integer | no | — |
| batch_id | integer | no | — |
| created_at | timestamp with time zone | yes | CURRENT_TIMESTAMP |
| return_date | date | no | CURRENT_DATE |
| return_id | integer | no | nextval('stock_returns_return_id_seq'::regclass) |
| return_qty | numeric(12,2) | no | — |
| return_value | numeric(12,2) | no | — |
| unit_cost | numeric(12,2) | no | — |

## Primary Key

`return_id`

## Foreign Keys

| Constraint | Columns | References | On Update | On Delete |
|---|---|---|---|---|
| fk_returns_allocation_line | allocation_line_id | public.batch_allocation_lines(allocation_line_id) | CASCADE | RESTRICT |
| fk_returns_batch | batch_id | public.batches(batch_id) | CASCADE | RESTRICT |

## Indexes

| Index | Unique | Method | Columns | Predicate |
|---|---|---|---|---|
| idx_stock_returns_batch_id | no | btree | batch_id | — |
| stock_returns_pkey | yes | btree | return_id | — |

## Constraints

_None._

<!-- END GENERATED: schema -->

## Relationships

See the generated foreign keys above, `database/relationships.md`, or run
`./db-knowledge relationships stock_returns`.

## Data Flow

Unknown — needs verification.

## Important Invariants

Unknown — needs verification. See `database/invariants.md`.

## Common Queries

```sql
SELECT *
FROM stock_returns
LIMIT 20;
```

## Debugging Notes

None recorded yet.

## Related Tables

Run `./db-knowledge relationships stock_returns` or `./db-knowledge impact stock_returns`.

## Last Verified

Structural: 2026-09-18 (generated) · Semantic: never — needs verification.

## Confidence

- structural facts: generated from the live database
- semantic facts: needs verification
