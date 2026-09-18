---
table: ledger_accounts
schema_hash: fnv1a64:1616a9348d0a5b51
last_schema_verified: 2026-09-18
semantic_confidence: needs-verification
---

# ledger_accounts

## Purpose

Unknown — needs verification.

## Database

PostgreSQL · schema `public`

## Owner

Unknown — needs verification.

Candidate code (inferred — needs verification): `src/handlers/batch_requirements.rs` (9 refs), `src/handlers/inserts.rs` (8 refs), `src/handlers/batches.rs` (5 refs)

## Consumers

Unknown — needs verification.

<!-- BEGIN GENERATED: schema -->
## Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| account_id | integer | no | nextval('ledger_accounts_account_id_seq'::regclass) |
| account_type | ledger_account_type | no | — |
| created_at | timestamp with time zone | no | CURRENT_TIMESTAMP |
| current_balance | numeric(18,2) | no | 0.00 |
| name | character varying(150) | no | — |

## Primary Key

`account_id`

## Foreign Keys

_None._

## Indexes

| Index | Unique | Method | Columns | Predicate |
|---|---|---|---|---|
| idx_unique_ledger_accounts_name | yes | btree | name | — |
| ledger_accounts_pkey | yes | btree | account_id | — |

## Constraints

_None._

<!-- END GENERATED: schema -->

## Relationships

See the generated foreign keys above, `database/relationships.md`, or run
`./db-knowledge relationships ledger_accounts`.

## Data Flow

Unknown — needs verification.

## Important Invariants

Unknown — needs verification. See `database/invariants.md`.

## Common Queries

```sql
SELECT *
FROM ledger_accounts
LIMIT 20;
```

## Debugging Notes

None recorded yet.

## Related Tables

Run `./db-knowledge relationships ledger_accounts` or `./db-knowledge impact ledger_accounts`.

## Last Verified

Structural: 2026-09-18 (generated) · Semantic: never — needs verification.

## Confidence

- structural facts: generated from the live database
- semantic facts: needs verification
