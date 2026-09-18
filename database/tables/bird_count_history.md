---
table: bird_count_history
schema_hash: fnv1a64:3b5998ad537bbc37
last_schema_verified: 2026-09-18
semantic_confidence: needs-verification
---

# bird_count_history

## Purpose

Unknown — needs verification.

## Database

PostgreSQL · schema `public`

## Owner

Unknown — needs verification.

Candidate code (inferred — needs verification): `src/handlers/batch_requirements.rs` (5 refs), `src/handlers/bird_count_history.rs` (5 refs), `src/pdf/builder.rs` (5 refs)

## Consumers

Unknown — needs verification.

<!-- BEGIN GENERATED: schema -->
## Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| additions | integer | no | 0 |
| batch_id | integer | no | — |
| created_at | timestamp with time zone | no | CURRENT_TIMESTAMP |
| deaths | integer | no | 0 |
| notes | text | no | — |
| record_date | date | no | — |
| record_id | integer | no | nextval('bird_count_history_record_id_seq'::regclass) |

## Primary Key

`record_id`

## Foreign Keys

| Constraint | Columns | References | On Update | On Delete |
|---|---|---|---|---|
| fk_bird_count_history_batch | batch_id | public.batches(batch_id) | NO ACTION | CASCADE |

## Indexes

| Index | Unique | Method | Columns | Predicate |
|---|---|---|---|---|
| bird_count_history_pkey | yes | btree | record_id | — |

## Constraints

_None._

<!-- END GENERATED: schema -->

## Relationships

See the generated foreign keys above, `database/relationships.md`, or run
`./db-knowledge relationships bird_count_history`.

## Data Flow

Unknown — needs verification.

## Important Invariants

Unknown — needs verification. See `database/invariants.md`.

## Common Queries

```sql
SELECT *
FROM bird_count_history
LIMIT 20;
```

## Debugging Notes

None recorded yet.

## Related Tables

Run `./db-knowledge relationships bird_count_history` or `./db-knowledge impact bird_count_history`.

## Last Verified

Structural: 2026-09-18 (generated) · Semantic: never — needs verification.

## Confidence

- structural facts: generated from the live database
- semantic facts: needs verification
