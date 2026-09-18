---
table: loan_payments
schema_hash: fnv1a64:e05ebeb5e946cff1
last_schema_verified: 2026-09-18
semantic_confidence: needs-verification
---

# loan_payments

## Purpose

Unknown — needs verification.

## Database

PostgreSQL · schema `public`

## Owner

Unknown — needs verification.

Candidate code (inferred — needs verification): `src/handlers/loans.rs` (11 refs), `entity/src/loans.rs` (2 refs), `src/handlers/fetch_all.rs` (2 refs)

## Consumers

Unknown — needs verification.

<!-- BEGIN GENERATED: schema -->
## Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| created_at | timestamp with time zone | yes | CURRENT_TIMESTAMP |
| created_by | integer | yes | — |
| interest_amount | numeric(18,2) | no | 0 |
| loan_id | integer | no | — |
| notes | text | yes | — |
| payment_date | date | no | — |
| payment_id | integer | no | nextval('loan_payments_payment_id_seq'::regclass) |
| payment_mode | character varying(50) | yes | — |
| principal_amount | numeric(18,2) | no | 0 |
| reference_number | character varying(100) | yes | — |
| total_amount | numeric(18,2) | no | — |
| txn_group_id | uuid | yes | — |

## Primary Key

`payment_id`

## Foreign Keys

| Constraint | Columns | References | On Update | On Delete |
|---|---|---|---|---|
| loan_payments_created_by_fkey | created_by | public.users(user_id) | NO ACTION | SET NULL |
| loan_payments_loan_id_fkey | loan_id | public.loans(loan_id) | NO ACTION | RESTRICT |

## Indexes

| Index | Unique | Method | Columns | Predicate |
|---|---|---|---|---|
| idx_loan_payments_loan_id | no | btree | loan_id | — |
| loan_payments_pkey | yes | btree | payment_id | — |

## Constraints

_None._

<!-- END GENERATED: schema -->

## Relationships

See the generated foreign keys above, `database/relationships.md`, or run
`./db-knowledge relationships loan_payments`.

## Data Flow

Unknown — needs verification.

## Important Invariants

Unknown — needs verification. See `database/invariants.md`.

## Common Queries

```sql
SELECT *
FROM loan_payments
LIMIT 20;
```

## Debugging Notes

None recorded yet.

## Related Tables

Run `./db-knowledge relationships loan_payments` or `./db-knowledge impact loan_payments`.

## Last Verified

Structural: 2026-09-18 (generated) · Semantic: never — needs verification.

## Confidence

- structural facts: generated from the live database
- semantic facts: needs verification
