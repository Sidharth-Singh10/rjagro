---
table: loans
schema_hash: fnv1a64:a6156de23558b850
last_schema_verified: 2026-09-18
semantic_confidence: needs-verification
---

# loans

## Purpose

Unknown — needs verification.

## Database

PostgreSQL · schema `public`

## Owner

Unknown — needs verification.

Candidate code (inferred — needs verification): `src/handlers/loans.rs` (15 refs), `entity/src/loan_payments.rs` (3 refs), `src/handlers/fetch_all.rs` (3 refs)

## Consumers

Unknown — needs verification.

<!-- BEGIN GENERATED: schema -->
## Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| created_at | timestamp with time zone | yes | CURRENT_TIMESTAMP |
| created_by | integer | yes | — |
| due_date | date | yes | — |
| interest_rate | numeric(5,2) | yes | — |
| lender_name | character varying(100) | no | — |
| loan_date | date | no | — |
| loan_id | integer | no | nextval('loans_loan_id_seq'::regclass) |
| notes | text | yes | — |
| outstanding_balance | numeric(18,2) | no | 0 |
| principal_amount | numeric(18,2) | no | — |
| status | loan_status | no | 'active'::loan_status |
| txn_group_id | uuid | yes | — |

## Primary Key

`loan_id`

## Foreign Keys

| Constraint | Columns | References | On Update | On Delete |
|---|---|---|---|---|
| loans_created_by_fkey | created_by | public.users(user_id) | NO ACTION | SET NULL |

## Indexes

| Index | Unique | Method | Columns | Predicate |
|---|---|---|---|---|
| idx_loans_status | no | btree | status | — |
| loans_pkey | yes | btree | loan_id | — |

## Constraints

_None._

<!-- END GENERATED: schema -->

## Relationships

See the generated foreign keys above, `database/relationships.md`, or run
`./db-knowledge relationships loans`.

## Data Flow

Unknown — needs verification.

## Important Invariants

Unknown — needs verification. See `database/invariants.md`.

## Common Queries

```sql
SELECT *
FROM loans
LIMIT 20;
```

## Debugging Notes

None recorded yet.

## Related Tables

Run `./db-knowledge relationships loans` or `./db-knowledge impact loans`.

## Last Verified

Structural: 2026-09-18 (generated) · Semantic: never — needs verification.

## Confidence

- structural facts: generated from the live database
- semantic facts: needs verification
