---
table: app_traders
schema_hash: fnv1a64:3f0af3f7a51e33b8
last_schema_verified: 2026-09-18
semantic_confidence: needs-verification
---

# app_traders

## Purpose

Unknown — needs verification.

## Database

PostgreSQL · schema `public`

## Owner

Unknown — needs verification.

Candidate code (inferred — needs verification): `src/auth/trader_login.rs` (11 refs), `src/handlers/trader_app.rs` (8 refs), `src/handlers/supervisor_app.rs` (4 refs)

## Consumers

Unknown — needs verification.

<!-- BEGIN GENERATED: schema -->
## Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| created_at | timestamp with time zone | no | CURRENT_TIMESTAMP |
| credit_limit | numeric(18,2) | yes | — |
| credit_terms_days | integer | yes | — |
| email | character varying(255) | no | — |
| id | integer | no | nextval('app_traders_id_seq'::regclass) |
| linked_trader_id | integer | yes | — |
| name | character varying(150) | no | — |
| password_hash | character varying(255) | no | — |
| phone | character varying(15) | no | — |

## Primary Key

`id`

## Foreign Keys

| Constraint | Columns | References | On Update | On Delete |
|---|---|---|---|---|
| fk_app_traders_linked_trader_id | linked_trader_id | public.traders(trader_id) | CASCADE | SET NULL |

## Indexes

| Index | Unique | Method | Columns | Predicate |
|---|---|---|---|---|
| app_traders_email_key | yes | btree | email | — |
| app_traders_phone_key | yes | btree | phone | — |
| app_traders_pkey | yes | btree | id | — |

## Constraints

- `app_traders_email_key`: UNIQUE (email)
- `app_traders_phone_key`: UNIQUE (phone)

<!-- END GENERATED: schema -->

## Relationships

See the generated foreign keys above, `database/relationships.md`, or run
`./db-knowledge relationships app_traders`.

## Data Flow

Unknown — needs verification.

## Important Invariants

Unknown — needs verification. See `database/invariants.md`.

## Common Queries

```sql
SELECT *
FROM app_traders
LIMIT 20;
```

## Debugging Notes

None recorded yet.

## Related Tables

Run `./db-knowledge relationships app_traders` or `./db-knowledge impact app_traders`.

## Last Verified

Structural: 2026-09-18 (generated) · Semantic: never — needs verification.

## Confidence

- structural facts: generated from the live database
- semantic facts: needs verification
