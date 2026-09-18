---
table: batch_requirements
schema_hash: fnv1a64:71d1c3ac94cf231b
last_schema_verified: 2026-09-18
semantic_confidence: needs-verification
---

# batch_requirements

## Purpose

Unknown — needs verification.

## Database

PostgreSQL · schema `public`

## Owner

Unknown — needs verification.

Candidate code (inferred — needs verification): `src/handlers/fetch_by_id.rs` (8 refs), `src/handlers/batch_requirements.rs` (5 refs), `entity/src/batch_allocations.rs` (3 refs)

## Consumers

Unknown — needs verification.

<!-- BEGIN GENERATED: schema -->
## Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| batch_id | integer | no | — |
| item_code | character varying(100) | no | — |
| line_id | integer | no | — |
| quantity | numeric(12,2) | no | — |
| request_date | date | no | — |
| requirement_id | integer | no | nextval('batch_requirements_requirement_id_seq'::regclass) |
| status | requirement_status | no | 'pending'::requirement_status |
| supervisor_id | integer | no | — |

## Primary Key

`requirement_id`

## Foreign Keys

| Constraint | Columns | References | On Update | On Delete |
|---|---|---|---|---|
| fk_batch_requirements_batch | batch_id | public.batches(batch_id) | NO ACTION | NO ACTION |
| fk_batch_requirements_item | item_code | public.items(item_code) | NO ACTION | NO ACTION |
| fk_batch_requirements_line | line_id | public.production_lines(line_id) | NO ACTION | NO ACTION |
| fk_batch_requirements_supervisor | supervisor_id | public.users(user_id) | NO ACTION | NO ACTION |

## Indexes

| Index | Unique | Method | Columns | Predicate |
|---|---|---|---|---|
| batch_requirements_pkey | yes | btree | requirement_id | — |

## Constraints

_None._

<!-- END GENERATED: schema -->

## Relationships

See the generated foreign keys above, `database/relationships.md`, or run
`./db-knowledge relationships batch_requirements`.

## Data Flow

Unknown — needs verification.

## Important Invariants

Unknown — needs verification. See `database/invariants.md`.

## Common Queries

```sql
SELECT *
FROM batch_requirements
LIMIT 20;
```

## Debugging Notes

None recorded yet.

## Related Tables

Run `./db-knowledge relationships batch_requirements` or `./db-knowledge impact batch_requirements`.

## Last Verified

Structural: 2026-09-18 (generated) · Semantic: never — needs verification.

## Confidence

- structural facts: generated from the live database
- semantic facts: needs verification
