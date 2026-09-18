---
table: batches
schema_hash: fnv1a64:8045c38d2e40e83c
last_schema_verified: 2026-09-18
semantic_confidence: needs-verification
---

# batches

## Purpose

Unknown — needs verification.

## Database

PostgreSQL · schema `public`

## Owner

Unknown — needs verification.

Candidate code (inferred — needs verification): `src/handlers/batches.rs` (17 refs), `src/handlers/trader_app.rs` (11 refs), `src/handlers/fetch_all.rs` (9 refs)

## Consumers

Unknown — needs verification.

<!-- BEGIN GENERATED: schema -->
## Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| activated_at | timestamp with time zone | yes | — |
| avg_body_weight | numeric(10,2) | yes | — |
| batch_id | integer | no | nextval('batches_batch_id_seq'::regclass) |
| closed_at | timestamp with time zone | yes | — |
| created_at | timestamp with time zone | no | CURRENT_TIMESTAMP |
| current_bird_count | integer | no | — |
| end_date | date | no | — |
| farm_id | integer | yes | — |
| farmer_id | integer | no | — |
| initial_bird_count | integer | no | — |
| line_id | integer | no | — |
| start_date | date | no | — |
| status | batch_status | yes | 'open'::batch_status |
| supervisor_id | integer | no | — |

## Primary Key

`batch_id`

## Foreign Keys

| Constraint | Columns | References | On Update | On Delete |
|---|---|---|---|---|
| batches_farm_id_fkey | farm_id | public.farms(farm_id) | NO ACTION | NO ACTION |
| fk_batches_farmer | farmer_id | public.farmers(farmer_id) | NO ACTION | NO ACTION |
| fk_batches_line | line_id | public.production_lines(line_id) | NO ACTION | NO ACTION |
| fk_batches_supervisor | supervisor_id | public.users(user_id) | NO ACTION | NO ACTION |

## Indexes

| Index | Unique | Method | Columns | Predicate |
|---|---|---|---|---|
| batches_pkey | yes | btree | batch_id | — |

## Constraints

_None._

<!-- END GENERATED: schema -->

## Relationships

See the generated foreign keys above, `database/relationships.md`, or run
`./db-knowledge relationships batches`.

## Data Flow

Unknown — needs verification.

## Important Invariants

Unknown — needs verification. See `database/invariants.md`.

## Common Queries

```sql
SELECT *
FROM batches
LIMIT 20;
```

## Debugging Notes

None recorded yet.

## Related Tables

Run `./db-knowledge relationships batches` or `./db-knowledge impact batches`.

## Last Verified

Structural: 2026-09-18 (generated) · Semantic: never — needs verification.

## Confidence

- structural facts: generated from the live database
- semantic facts: needs verification
