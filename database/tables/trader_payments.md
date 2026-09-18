---
table: trader_payments
schema_hash: fnv1a64:adf5ad58904dd55e
last_schema_verified: 2026-09-18
semantic_confidence: documented
---

# trader_payments

## Purpose

Payments received from legacy traders against receivable bird sales. Each row
is one receipt (amount, date, mode, reference).

## Database

PostgreSQL · schema `public`

## Owner

Backend: `src/handlers/traders.rs` (`create_trader_payment`), which also writes
the paired ledger entries and updates account balances in the same transaction.

## Consumers

Traders list `amount_due` (`src/handlers/fetch_all.rs`), trader details modal
(Entities → Traders), Overview payables/receivables, trader ledger/receivables
endpoints.

<!-- BEGIN GENERATED: schema -->
## Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| amount | numeric(18,2) | no | — |
| created_at | timestamp with time zone | no | now() |
| created_by | integer | yes | — |
| notes | text | yes | — |
| payment_date | date | no | — |
| payment_id | integer | no | nextval('trader_payments_payment_id_seq'::regclass) |
| payment_mode | character varying(50) | yes | — |
| reference_number | character varying(100) | yes | — |
| trader_id | integer | no | — |
| txn_group_id | uuid | yes | — |

## Primary Key

`payment_id`

## Foreign Keys

| Constraint | Columns | References | On Update | On Delete |
|---|---|---|---|---|
| trader_payments_created_by_fkey | created_by | public.users(user_id) | NO ACTION | NO ACTION |
| trader_payments_trader_id_fkey | trader_id | public.traders(trader_id) | NO ACTION | NO ACTION |

## Indexes

| Index | Unique | Method | Columns | Predicate |
|---|---|---|---|---|
| idx_trader_payments_trader_id | no | btree | trader_id | — |
| trader_payments_pkey | yes | btree | payment_id | — |

## Constraints

_None._

<!-- END GENERATED: schema -->

## Relationships

See the generated foreign keys above, `database/relationships.md`, or run
`./db-knowledge relationships trader_payments`.

## Data Flow

Payment recorded → `trader_payments` row + balanced `ledger_entries`
(receivables credit, cash/bank debit) → `ledger_accounts` balances updated.
The trader's outstanding balance is the sum of receivable sales minus payments.

## Important Invariants

- Every payment's ledger entries balance per `txn_group_id` (INV-1).
- `amount_due` may legitimately go negative when payments exceed sales
  (overpayment/advance) — see `database/debugging.md`.

## Common Queries

```sql
SELECT *
FROM trader_payments
LIMIT 20;
```

## Debugging Notes

None recorded yet.

## Related Tables

Run `./db-knowledge relationships trader_payments` or `./db-knowledge impact trader_payments`.

## Last Verified

Structural: 2026-09-18 (generated) · Semantic: never — needs verification.

## Confidence

- structural facts: generated from the live database
- semantic facts: needs verification
