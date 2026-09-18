---
table: trader_ledger_entries
schema_hash: fnv1a64:9fa1d10d563e64e9
last_schema_verified: 2026-09-18
semantic_confidence: needs-verification
---

# trader_ledger_entries

## Purpose

Unknown — needs verification.

## Database

PostgreSQL · schema `public`

## Owner

Unknown — needs verification.

Candidate code (inferred — needs verification): `src/handlers/trader_ledger.rs` (10 refs), `src/handlers/trader_app.rs` (9 refs), `entity/src/trader_ledger_entries.rs` (2 refs)

## Consumers

Unknown — needs verification.

<!-- BEGIN GENERATED: schema -->
## Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| amount | numeric(18,2) | no | — |
| created_at | timestamp with time zone | no | CURRENT_TIMESTAMP |
| id | integer | no | nextval('trader_ledger_entries_id_seq'::regclass) |
| order_id | integer | yes | — |
| payment_mode | payment_mode | yes | — |
| screenshot_url | text | yes | — |
| trader_id | integer | no | — |
| type | ledger_entry_type | no | — |

## Primary Key

`id`

## Foreign Keys

| Constraint | Columns | References | On Update | On Delete |
|---|---|---|---|---|
| trader_ledger_entries_order_id_fkey | order_id | public.orders(order_id) | NO ACTION | NO ACTION |
| trader_ledger_entries_trader_id_fkey | trader_id | public.app_traders(id) | NO ACTION | NO ACTION |

## Indexes

| Index | Unique | Method | Columns | Predicate |
|---|---|---|---|---|
| idx_trader_ledger_entries_trader_id | no | btree | trader_id | — |
| trader_ledger_entries_pkey | yes | btree | id | — |

## Constraints

_None._

<!-- END GENERATED: schema -->

## Relationships

See the generated foreign keys above, `database/relationships.md`, or run
`./db-knowledge relationships trader_ledger_entries`.

## Data Flow

Unknown — needs verification.

## Important Invariants

Unknown — needs verification. See `database/invariants.md`.

## Common Queries

```sql
SELECT *
FROM trader_ledger_entries
LIMIT 20;
```

## Debugging Notes

None recorded yet.

## Related Tables

Run `./db-knowledge relationships trader_ledger_entries` or `./db-knowledge impact trader_ledger_entries`.

## Last Verified

Structural: 2026-09-18 (generated) · Semantic: never — needs verification.

## Confidence

- structural facts: generated from the live database
- semantic facts: needs verification
