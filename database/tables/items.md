---
table: items
schema_hash: fnv1a64:d45d17e6f01512bc
last_schema_verified: 2026-09-18
semantic_confidence: needs-verification
---

# items

## Purpose

Unknown — needs verification.

## Database

PostgreSQL · schema `public`

## Owner

Unknown — needs verification.

Candidate code (inferred — needs verification): `src/handlers/purchase_orders.rs` (16 refs), `src/handlers/fetch_all.rs` (5 refs), `entity/src/inventory_movements.rs` (4 refs)

## Consumers

Unknown — needs verification.

<!-- BEGIN GENERATED: schema -->
## Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| item_category | item_category | no | — |
| item_code | character varying(100) | no | — |
| item_name | character varying(100) | no | — |
| unit | character varying(50) | no | — |

## Primary Key

`item_code`

## Foreign Keys

_None._

## Indexes

| Index | Unique | Method | Columns | Predicate |
|---|---|---|---|---|
| items_pkey | yes | btree | item_code | — |

## Constraints

_None._

<!-- END GENERATED: schema -->

## Relationships

See the generated foreign keys above, `database/relationships.md`, or run
`./db-knowledge relationships items`.

## Data Flow

Unknown — needs verification.

## Important Invariants

Unknown — needs verification. See `database/invariants.md`.

## Common Queries

```sql
SELECT *
FROM items
LIMIT 20;
```

## Debugging Notes

None recorded yet.

## Related Tables

Run `./db-knowledge relationships items` or `./db-knowledge impact items`.

## Last Verified

Structural: 2026-09-18 (generated) · Semantic: never — needs verification.

## Confidence

- structural facts: generated from the live database
- semantic facts: needs verification
