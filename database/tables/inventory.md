---
table: inventory
schema_hash: fnv1a64:91f36850e8123477
last_schema_verified: 2026-09-18
semantic_confidence: needs-verification
---

# inventory

## Purpose

Unknown — needs verification.

## Database

PostgreSQL · schema `public`

## Owner

Unknown — needs verification.

Candidate code (inferred — needs verification): `src/handlers/batch_requirements.rs` (22 refs), `src/handlers/purchases.rs` (18 refs), `src/handlers/batches.rs` (16 refs)

## Consumers

Unknown — needs verification.

<!-- BEGIN GENERATED: schema -->
## Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| current_qty | numeric(12,2) | no | 0 |
| inventory_id | integer | no | nextval('inventory_inventory_id_seq'::regclass) |
| item_code | character varying(100) | no | — |
| last_updated | timestamp with time zone | no | CURRENT_TIMESTAMP |

## Primary Key

`inventory_id`

## Foreign Keys

| Constraint | Columns | References | On Update | On Delete |
|---|---|---|---|---|
| fk_inventory_item | item_code | public.items(item_code) | NO ACTION | CASCADE |

## Indexes

| Index | Unique | Method | Columns | Predicate |
|---|---|---|---|---|
| inventory_pkey | yes | btree | inventory_id | — |

## Constraints

_None._

<!-- END GENERATED: schema -->

## Relationships

See the generated foreign keys above, `database/relationships.md`, or run
`./db-knowledge relationships inventory`.

## Data Flow

Unknown — needs verification.

## Important Invariants

Unknown — needs verification. See `database/invariants.md`.

## Common Queries

```sql
SELECT *
FROM inventory
LIMIT 20;
```

## Debugging Notes

None recorded yet.

## Related Tables

Run `./db-knowledge relationships inventory` or `./db-knowledge impact inventory`.

## Last Verified

Structural: 2026-09-18 (generated) · Semantic: never — needs verification.

## Confidence

- structural facts: generated from the live database
- semantic facts: needs verification
