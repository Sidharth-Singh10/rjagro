---
table: users
schema_hash: fnv1a64:9a8499881cc1d15a
last_schema_verified: 2026-09-18
semantic_confidence: needs-verification
---

# users

## Purpose

Unknown — needs verification.

## Database

PostgreSQL · schema `public`

## Owner

Unknown — needs verification.

Candidate code (inferred — needs verification): `src/handlers/fetch_all.rs` (10 refs), `src/handlers/trader_app.rs` (6 refs), `src/auth/login.rs` (4 refs)

## Consumers

Unknown — needs verification.

<!-- BEGIN GENERATED: schema -->
## Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| created_at | timestamp with time zone | no | CURRENT_TIMESTAMP |
| email | character varying(100) | no | — |
| name | character varying(100) | no | — |
| password | character varying(100) | no | — |
| phone | character varying(15) | yes | — |
| role | user_role | no | — |
| user_id | integer | no | nextval('users_user_id_seq'::regclass) |

## Primary Key

`user_id`

## Foreign Keys

_None._

## Indexes

| Index | Unique | Method | Columns | Predicate |
|---|---|---|---|---|
| users_email_key | yes | btree | email | — |
| users_pkey | yes | btree | user_id | — |

## Constraints

- `users_email_key`: UNIQUE (email)

<!-- END GENERATED: schema -->

## Relationships

See the generated foreign keys above, `database/relationships.md`, or run
`./db-knowledge relationships users`.

## Data Flow

Unknown — needs verification.

## Important Invariants

Unknown — needs verification. See `database/invariants.md`.

## Common Queries

```sql
SELECT *
FROM users
LIMIT 20;
```

## Debugging Notes

None recorded yet.

## Related Tables

Run `./db-knowledge relationships users` or `./db-knowledge impact users`.

## Last Verified

Structural: 2026-09-18 (generated) · Semantic: never — needs verification.

## Confidence

- structural facts: generated from the live database
- semantic facts: needs verification
