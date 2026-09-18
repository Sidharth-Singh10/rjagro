---
table: farms
schema_hash: fnv1a64:2ec64ff167072076
last_schema_verified: 2026-09-18
semantic_confidence: needs-verification
---

# farms

## Purpose

Unknown — needs verification.

## Database

PostgreSQL · schema `public`

## Owner

Unknown — needs verification.

Candidate code (inferred — needs verification): `src/handlers/trader_app.rs` (9 refs), `src/handlers/fetch_all.rs` (7 refs), `src/handlers/farms.rs` (5 refs)

## Consumers

Unknown — needs verification.

<!-- BEGIN GENERATED: schema -->
## Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| code | character varying(50) | no | — |
| created_at | timestamp with time zone | no | CURRENT_TIMESTAMP |
| farm_id | integer | no | nextval('farms_farm_id_seq'::regclass) |
| farmer_id | integer | no | — |
| gmaps_url | text | yes | — |
| location | text | yes | — |
| name | character varying(150) | no | — |
| video_url | text | yes | — |

## Primary Key

`farm_id`

## Foreign Keys

| Constraint | Columns | References | On Update | On Delete |
|---|---|---|---|---|
| farms_farmer_id_fkey | farmer_id | public.farmers(farmer_id) | NO ACTION | NO ACTION |

## Indexes

| Index | Unique | Method | Columns | Predicate |
|---|---|---|---|---|
| farms_code_key | yes | btree | code | — |
| farms_pkey | yes | btree | farm_id | — |

## Constraints

- `farms_code_key`: UNIQUE (code)

<!-- END GENERATED: schema -->

## Relationships

See the generated foreign keys above, `database/relationships.md`, or run
`./db-knowledge relationships farms`.

## Data Flow

Unknown — needs verification.

## Important Invariants

Unknown — needs verification. See `database/invariants.md`.

## Common Queries

```sql
SELECT *
FROM farms
LIMIT 20;
```

## Debugging Notes

None recorded yet.

## Related Tables

Run `./db-knowledge relationships farms` or `./db-knowledge impact farms`.

## Last Verified

Structural: 2026-09-18 (generated) · Semantic: never — needs verification.

## Confidence

- structural facts: generated from the live database
- semantic facts: needs verification
