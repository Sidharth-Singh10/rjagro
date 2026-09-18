---
table: inventory_movements
schema_hash: fnv1a64:bea202f8853b9c43
last_schema_verified: 2026-09-18
semantic_confidence: needs-verification
---

# inventory_movements

## Purpose

Unknown — needs verification.

## Database

PostgreSQL · schema `public`

## Owner

Unknown — needs verification.

Candidate code (inferred — needs verification): `src/handlers/purchases.rs` (4 refs), `src/handlers/batch_requirements.rs` (3 refs), `src/handlers/purchase_orders.rs` (3 refs)

## Consumers

Unknown — needs verification.

<!-- BEGIN GENERATED: schema -->
## Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| item_code | character varying(100) | no | — |
| movement_date | timestamp with time zone | no | CURRENT_TIMESTAMP |
| movement_id | integer | no | nextval('inventory_movements_movement_id_seq'::regclass) |
| movement_type | movement_type | no | — |
| qty_change | numeric(12,2) | no | — |
| reference_id | integer | no | — |

## Primary Key

`movement_id`

## Foreign Keys

| Constraint | Columns | References | On Update | On Delete |
|---|---|---|---|---|
| fk_inventory_movements_item | item_code | public.items(item_code) | NO ACTION | CASCADE |

## Indexes

| Index | Unique | Method | Columns | Predicate |
|---|---|---|---|---|
| inventory_movements_pkey | yes | btree | movement_id | — |

## Constraints

_None._

<!-- END GENERATED: schema -->

## Relationships

See the generated foreign keys above, `database/relationships.md`, or run
`./db-knowledge relationships inventory_movements`.

## Data Flow

Unknown — needs verification.

## Important Invariants

Unknown — needs verification. See `database/invariants.md`.

## Common Queries

```sql
SELECT *
FROM inventory_movements
LIMIT 20;
```

## Debugging Notes

None recorded yet.

## Related Tables

Run `./db-knowledge relationships inventory_movements` or `./db-knowledge impact inventory_movements`.

## Last Verified

Structural: 2026-09-18 (generated) · Semantic: never — needs verification.

## Confidence

- structural facts: generated from the live database
- semantic facts: needs verification
