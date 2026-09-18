---
table: ledger_entries
schema_hash: fnv1a64:d5ddbe0458f305a6
last_schema_verified: 2026-09-18
semantic_confidence: documented
---

# ledger_entries

## Purpose

Double-entry ledger lines for every financial event (purchases, sales, trader
and supplier payments, loans, expenses). Debits and credits are stored as
separate rows that share a `txn_group_id`.

## Database

PostgreSQL · schema `public`

## Owner

Multiple backend handlers write paired entries: `src/handlers/purchases.rs`,
`src/handlers/batch_sales.rs`, `src/handlers/traders.rs`,
`src/handlers/suppliers.rs`, `src/handlers/loans.rs`.

## Consumers

Ledger module (Finance & Ledger), metrics snapshots, Overview financial charts,
account balances via `ledger_accounts`.

<!-- BEGIN GENERATED: schema -->
## Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| account_id | integer | no | — |
| created_at | timestamp with time zone | no | CURRENT_TIMESTAMP |
| created_by | integer | no | — |
| credit | numeric(18,2) | yes | — |
| debit | numeric(18,2) | yes | — |
| entry_id | integer | no | nextval('ledger_entries_entry_id_seq'::regclass) |
| narration | text | yes | — |
| reference_id | integer | yes | — |
| reference_table | character varying(100) | yes | — |
| txn_date | date | no | — |
| txn_group_id | uuid | no | — |

## Primary Key

`entry_id`

## Foreign Keys

| Constraint | Columns | References | On Update | On Delete |
|---|---|---|---|---|
| fk_ledger_entries_account | account_id | public.ledger_accounts(account_id) | CASCADE | CASCADE |
| fk_ledger_entries_created_by | created_by | public.users(user_id) | CASCADE | SET NULL |

## Indexes

| Index | Unique | Method | Columns | Predicate |
|---|---|---|---|---|
| idx_ledger_entries_account_id | no | btree | account_id | — |
| idx_ledger_entries_txn_group_id | no | btree | txn_group_id | — |
| ledger_entries_pkey | yes | btree | entry_id | — |

## Constraints

_None._

<!-- END GENERATED: schema -->

## Relationships

See the generated foreign keys above, `database/relationships.md`, or run
`./db-knowledge relationships ledger_entries`.

## Data Flow

A business event (purchase, sale, payment, loan) writes two or more ledger
entries with a shared `txn_group_id`; `reference_table`/`reference_id` point at
the source row; `ledger_accounts.current_balance` is updated by
`update_account_balance`.

## Important Invariants

- Debits equal credits per `txn_group_id` (INV-1, verified 2026-09-18).

## Common Queries

```sql
SELECT *
FROM ledger_entries
LIMIT 20;
```

## Debugging Notes

None recorded yet.

## Related Tables

Run `./db-knowledge relationships ledger_entries` or `./db-knowledge impact ledger_entries`.

## Last Verified

Structural: 2026-09-18 (generated) · Semantic: never — needs verification.

## Confidence

- structural facts: generated from the live database
- semantic facts: needs verification
