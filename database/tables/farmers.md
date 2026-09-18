---
table: farmers
schema_hash: fnv1a64:32a94de42b5782f7
last_schema_verified: 2026-09-18
semantic_confidence: needs-verification
---

# farmers

## Purpose

Unknown — needs verification.

## Database

PostgreSQL · schema `public`

## Owner

Unknown — needs verification.

Candidate code (inferred — needs verification): `src/handlers/fetch_all.rs` (7 refs), `entity/src/batches.rs` (3 refs), `entity/src/farmer_commission_history.rs` (3 refs)

## Consumers

Unknown — needs verification.

<!-- BEGIN GENERATED: schema -->
## Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| address | text | no | — |
| area_size | numeric(10,2) | no | — |
| bank_account_no | character varying(30) | no | — |
| bank_name | character varying(100) | no | — |
| created_at | timestamp with time zone | no | CURRENT_TIMESTAMP |
| farmer_id | integer | no | nextval('farmers_farmer_id_seq'::regclass) |
| ifsc_code | character varying(15) | no | — |
| name | character varying(100) | no | — |
| phone_number | character varying(15) | no | — |

## Primary Key

`farmer_id`

## Foreign Keys

_None._

## Indexes

| Index | Unique | Method | Columns | Predicate |
|---|---|---|---|---|
| farmers_phone_number_key | yes | btree | phone_number | — |
| farmers_pkey | yes | btree | farmer_id | — |

## Constraints

- `farmers_phone_number_key`: UNIQUE (phone_number)

<!-- END GENERATED: schema -->

## Relationships

See the generated foreign keys above, `database/relationships.md`, or run
`./db-knowledge relationships farmers`.

## Data Flow

Unknown — needs verification.

## Important Invariants

Unknown — needs verification. See `database/invariants.md`.

## Common Queries

```sql
SELECT *
FROM farmers
LIMIT 20;
```

## Debugging Notes

None recorded yet.

## Related Tables

Run `./db-knowledge relationships farmers` or `./db-knowledge impact farmers`.

## Last Verified

Structural: 2026-09-18 (generated) · Semantic: never — needs verification.

## Confidence

- structural facts: generated from the live database
- semantic facts: needs verification
