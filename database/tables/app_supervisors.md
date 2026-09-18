---
table: app_supervisors
schema_hash: fnv1a64:da4b15187bc19f57
last_schema_verified: 2026-09-18
semantic_confidence: needs-verification
---

# app_supervisors

## Purpose

Unknown — needs verification.

## Database

PostgreSQL · schema `public`

## Owner

Unknown — needs verification.

Candidate code (inferred — needs verification): `entity/src/app_supervisors.rs` (2 refs), `entity/src/mod.rs` (1 refs), `entity/src/prelude.rs` (1 refs)

## Consumers

Unknown — needs verification.

<!-- BEGIN GENERATED: schema -->
## Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| created_at | timestamp with time zone | no | CURRENT_TIMESTAMP |
| email | character varying(255) | no | — |
| google_sub | character varying(255) | no | — |
| id | integer | no | nextval('app_supervisors_id_seq'::regclass) |
| name | character varying(150) | no | — |
| phone | character varying(15) | yes | — |

## Primary Key

`id`

## Foreign Keys

_None._

## Indexes

| Index | Unique | Method | Columns | Predicate |
|---|---|---|---|---|
| app_supervisors_email_key | yes | btree | email | — |
| app_supervisors_google_sub_key | yes | btree | google_sub | — |
| app_supervisors_pkey | yes | btree | id | — |

## Constraints

- `app_supervisors_email_key`: UNIQUE (email)
- `app_supervisors_google_sub_key`: UNIQUE (google_sub)

<!-- END GENERATED: schema -->

## Relationships

See the generated foreign keys above, `database/relationships.md`, or run
`./db-knowledge relationships app_supervisors`.

## Data Flow

Unknown — needs verification.

## Important Invariants

Unknown — needs verification. See `database/invariants.md`.

## Common Queries

```sql
SELECT *
FROM app_supervisors
LIMIT 20;
```

## Debugging Notes

None recorded yet.

## Related Tables

Run `./db-knowledge relationships app_supervisors` or `./db-knowledge impact app_supervisors`.

## Last Verified

Structural: 2026-09-18 (generated) · Semantic: never — needs verification.

## Confidence

- structural facts: generated from the live database
- semantic facts: needs verification
