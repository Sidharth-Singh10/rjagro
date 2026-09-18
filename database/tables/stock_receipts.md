---
table: stock_receipts
schema_hash: fnv1a64:8b5c2ad12c615bd1
last_schema_verified: 2026-09-18
semantic_confidence: needs-verification
---

# stock_receipts

## Purpose

Unknown — needs verification.

## Database

PostgreSQL · schema `public`

## Owner

Unknown — needs verification.

Candidate code (inferred — needs verification): `src/handlers/batches.rs` (8 refs), `src/handlers/batch_requirements.rs` (6 refs), `src/handlers/purchase_orders.rs` (6 refs)

## Consumers

Unknown — needs verification.

<!-- BEGIN GENERATED: schema -->
## Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| item_code | character varying(100) | no | — |
| lot_id | integer | no | nextval('stock_receipts_lot_id_seq'::regclass) |
| purchase_id | integer | no | — |
| received_date | date | no | — |
| received_qty | numeric(12,2) | no | — |
| remaining_qty | numeric(12,2) | no | — |
| supplier | character varying(100) | no | — |
| unit_cost | numeric(12,2) | no | — |

## Primary Key

`lot_id`

## Foreign Keys

| Constraint | Columns | References | On Update | On Delete |
|---|---|---|---|---|
| fk_stock_receipts_item | item_code | public.items(item_code) | CASCADE | RESTRICT |
| fk_stock_receipts_purchase | purchase_id | public.purchases(purchase_id) | CASCADE | SET NULL |

## Indexes

| Index | Unique | Method | Columns | Predicate |
|---|---|---|---|---|
| stock_receipts_pkey | yes | btree | lot_id | — |

## Constraints

_None._

<!-- END GENERATED: schema -->

## Relationships

See the generated foreign keys above, `database/relationships.md`, or run
`./db-knowledge relationships stock_receipts`.

## Data Flow

Unknown — needs verification.

## Important Invariants

Unknown — needs verification. See `database/invariants.md`.

## Common Queries

```sql
SELECT *
FROM stock_receipts
LIMIT 20;
```

## Debugging Notes

None recorded yet.

## Related Tables

Run `./db-knowledge relationships stock_receipts` or `./db-knowledge impact stock_receipts`.

## Last Verified

Structural: 2026-09-18 (generated) · Semantic: never — needs verification.

## Confidence

- structural facts: generated from the live database
- semantic facts: needs verification
