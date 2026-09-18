---
table: batch_allocations
schema_hash: fnv1a64:d97deb325e40c05d
last_schema_verified: 2026-09-18
semantic_confidence: needs-verification
---

# batch_allocations

## Purpose

Unknown — needs verification.

## Database

PostgreSQL · schema `public`

## Owner

Unknown — needs verification.

Candidate code (inferred — needs verification): `src/handlers/fetch_by_id.rs` (5 refs), `src/handlers/batch_requirements.rs` (4 refs), `entity/src/batch_allocation_lines.rs` (3 refs)

## Consumers

Unknown — needs verification.

<!-- BEGIN GENERATED: schema -->
## Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| allocated_by | integer | no | — |
| allocated_qty | numeric(12,2) | no | — |
| allocated_value | numeric(18,2) | no | — |
| allocation_date | date | no | — |
| allocation_id | integer | no | nextval('batch_allocations_allocation_id_seq'::regclass) |
| requirement_id | integer | no | — |

## Primary Key

`allocation_id`

## Foreign Keys

| Constraint | Columns | References | On Update | On Delete |
|---|---|---|---|---|
| fk_batch_allocations_requirement | requirement_id | public.batch_requirements(requirement_id) | NO ACTION | NO ACTION |
| fk_batch_allocations_user | allocated_by | public.users(user_id) | NO ACTION | NO ACTION |

## Indexes

| Index | Unique | Method | Columns | Predicate |
|---|---|---|---|---|
| batch_allocations_pkey | yes | btree | allocation_id | — |

## Constraints

_None._

<!-- END GENERATED: schema -->

## Relationships

See the generated foreign keys above, `database/relationships.md`, or run
`./db-knowledge relationships batch_allocations`.

## Data Flow

Unknown — needs verification.

## Important Invariants

Unknown — needs verification. See `database/invariants.md`.

## Common Queries

```sql
SELECT *
FROM batch_allocations
LIMIT 20;
```

## Debugging Notes

None recorded yet.

## Related Tables

Run `./db-knowledge relationships batch_allocations` or `./db-knowledge impact batch_allocations`.

## Last Verified

Structural: 2026-09-18 (generated) · Semantic: never — needs verification.

## Confidence

- structural facts: generated from the live database
- semantic facts: needs verification
