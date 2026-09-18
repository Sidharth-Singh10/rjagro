---
table: purchase_orders
schema_hash: fnv1a64:c47c0b5ba591f26f
last_schema_verified: 2026-09-18
semantic_confidence: needs-verification
---

# purchase_orders

## Purpose

Unknown — needs verification.

## Database

PostgreSQL · schema `public`

## Owner

Unknown — needs verification.

Candidate code (inferred — needs verification): `src/handlers/purchase_orders.rs` (7 refs), `entity/src/purchases.rs` (3 refs), `src/routes/fetch_all.rs` (2 refs)

## Consumers

Unknown — needs verification.

<!-- BEGIN GENERATED: schema -->
## Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| created_by | integer | no | — |
| payment_type | payment_type | yes | — |
| purchase_date | date | no | — |
| purchase_order_id | integer | no | nextval('purchase_orders_purchase_order_id_seq'::regclass) |
| supplier_id | integer | no | — |
| total_cost | numeric(12,2) | no | 0 |

## Primary Key

`purchase_order_id`

## Foreign Keys

_None._

## Indexes

| Index | Unique | Method | Columns | Predicate |
|---|---|---|---|---|
| idx_purchase_orders_supplier_id | no | btree | supplier_id | — |
| purchase_orders_pkey | yes | btree | purchase_order_id | — |

## Constraints

_None._

<!-- END GENERATED: schema -->

## Relationships

See the generated foreign keys above, `database/relationships.md`, or run
`./db-knowledge relationships purchase_orders`.

## Data Flow

Unknown — needs verification.

## Important Invariants

Unknown — needs verification. See `database/invariants.md`.

## Common Queries

```sql
SELECT *
FROM purchase_orders
LIMIT 20;
```

## Debugging Notes

None recorded yet.

## Related Tables

Run `./db-knowledge relationships purchase_orders` or `./db-knowledge impact purchase_orders`.

## Last Verified

Structural: 2026-09-18 (generated) · Semantic: never — needs verification.

## Confidence

- structural facts: generated from the live database
- semantic facts: needs verification
