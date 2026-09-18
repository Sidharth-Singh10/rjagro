---
table: production_lines
schema_hash: fnv1a64:f35d51b8d763fa1c
last_schema_verified: 2026-09-18
semantic_confidence: needs-verification
---

# production_lines

## Purpose

Unknown — needs verification.

## Database

PostgreSQL · schema `public`

## Owner

Unknown — needs verification.

Candidate code (inferred — needs verification): `src/handlers/batches.rs` (4 refs), `entity/src/batch_requirements.rs` (3 refs), `entity/src/batches.rs` (3 refs)

## Consumers

Unknown — needs verification.

<!-- BEGIN GENERATED: schema -->
## Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| created_at | timestamp with time zone | no | CURRENT_TIMESTAMP |
| line_id | integer | no | nextval('production_lines_line_id_seq'::regclass) |
| line_name | character varying(100) | no | — |
| supervisor_id | integer | no | — |

## Primary Key

`line_id`

## Foreign Keys

| Constraint | Columns | References | On Update | On Delete |
|---|---|---|---|---|
| fk_production_lines_supervisor | supervisor_id | public.users(user_id) | NO ACTION | NO ACTION |

## Indexes

| Index | Unique | Method | Columns | Predicate |
|---|---|---|---|---|
| production_lines_pkey | yes | btree | line_id | — |

## Constraints

_None._

<!-- END GENERATED: schema -->

## Relationships

See the generated foreign keys above, `database/relationships.md`, or run
`./db-knowledge relationships production_lines`.

## Data Flow

Unknown — needs verification.

## Important Invariants

Unknown — needs verification. See `database/invariants.md`.

## Common Queries

```sql
SELECT *
FROM production_lines
LIMIT 20;
```

## Debugging Notes

None recorded yet.

## Related Tables

Run `./db-knowledge relationships production_lines` or `./db-knowledge impact production_lines`.

## Last Verified

Structural: 2026-09-18 (generated) · Semantic: never — needs verification.

## Confidence

- structural facts: generated from the live database
- semantic facts: needs verification
