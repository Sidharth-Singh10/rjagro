---
table: purchases
schema_hash: fnv1a64:5a46166f1db4d24b
last_schema_verified: 2026-09-18
semantic_confidence: needs-verification
---

# purchases

## Purpose

Unknown — needs verification.

## Database

PostgreSQL · schema `public`

## Owner

Unknown — needs verification.

Candidate code (inferred — needs verification): `src/handlers/purchases.rs` (12 refs), `src/handlers/purchase_orders.rs` (10 refs), `src/handlers/suppliers.rs` (7 refs)

## Consumers

Unknown — needs verification.

<!-- BEGIN GENERATED: schema -->
## Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| cost_per_unit | numeric(12,2) | no | — |
| created_by | integer | no | — |
| item_code | character varying(100) | no | — |
| payment_type | payment_type | yes | — |
| purchase_date | date | no | — |
| purchase_id | integer | no | nextval('purchases_purchase_id_seq'::regclass) |
| purchase_order_id | integer | yes | — |
| quantity | numeric(12,2) | no | 0 |
| supplier_id | integer | no | — |
| total_cost | numeric(12,2) | no | — |

## Primary Key

`purchase_id`

## Foreign Keys

| Constraint | Columns | References | On Update | On Delete |
|---|---|---|---|---|
| fk_purchases_created_by | created_by | public.users(user_id) | NO ACTION | NO ACTION |
| fk_purchases_item_code | item_code | public.items(item_code) | NO ACTION | NO ACTION |
| fk_purchases_purchase_order | purchase_order_id | public.purchase_orders(purchase_order_id) | CASCADE | RESTRICT |
| fk_purchases_supplier_id | supplier_id | public.suppliers(supplier_id) | NO ACTION | NO ACTION |

## Indexes

| Index | Unique | Method | Columns | Predicate |
|---|---|---|---|---|
| idx_purchases_purchase_order_id | no | btree | purchase_order_id | — |
| idx_purchases_supplier_id | no | btree | supplier_id | — |
| purchases_pkey | yes | btree | purchase_id | — |

## Constraints

_None._

<!-- END GENERATED: schema -->

## Relationships

See the generated foreign keys above, `database/relationships.md`, or run
`./db-knowledge relationships purchases`.

## Data Flow

Unknown — needs verification.

## Important Invariants

Unknown — needs verification. See `database/invariants.md`.

## Common Queries

```sql
SELECT *
FROM purchases
LIMIT 20;
```

## Debugging Notes

None recorded yet.

## Related Tables

Run `./db-knowledge relationships purchases` or `./db-knowledge impact purchases`.

## Last Verified

Structural: 2026-09-18 (generated) · Semantic: never — needs verification.

## Confidence

- structural facts: generated from the live database
- semantic facts: needs verification
