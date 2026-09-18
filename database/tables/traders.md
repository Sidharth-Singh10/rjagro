---
table: traders
schema_hash: fnv1a64:45f0a796edb42c31
last_schema_verified: 2026-09-18
semantic_confidence: documented
---

# traders

## Purpose

Legacy trader master data (name, phone, address, bank details). App traders
(`app_traders.linked_trader_id`) link to these rows so app-created sales land on
the same account.

## Database

PostgreSQL · schema `public`

## Owner

Backend: `src/handlers/inserts.rs` (`create_trader`); managed from the Entities
tab in the admin frontend.

## Consumers

`batch_sales`, `trader_payments`, `bird_sell_history`, trader ledger/receivables
endpoints, Entities → Traders list (with computed `amount_due`).

<!-- BEGIN GENERATED: schema -->
## Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| address | text | no | — |
| bank_account_no | character varying(30) | no | — |
| bank_name | character varying(100) | no | — |
| created_at | timestamp with time zone | no | CURRENT_TIMESTAMP |
| ifsc_code | character varying(15) | no | — |
| name | character varying(100) | no | — |
| phone_number | character varying(15) | no | — |
| trader_id | integer | no | nextval('traders_trader_id_seq'::regclass) |

## Primary Key

`trader_id`

## Foreign Keys

_None._

## Indexes

| Index | Unique | Method | Columns | Predicate |
|---|---|---|---|---|
| traders_phone_number_key | yes | btree | phone_number | — |
| traders_pkey | yes | btree | trader_id | — |

## Constraints

- `traders_phone_number_key`: UNIQUE (phone_number)

<!-- END GENERATED: schema -->

## Relationships

See the generated foreign keys above, `database/relationships.md`, or run
`./db-knowledge relationships traders`.

## Data Flow

Created in Entities → Traders. Sales (`batch_sales.trader_id`) and payments
(`trader_payments.trader_id`) reference this row; the outstanding balance is
computed as receivable sales minus payments (`get_traders_handler`).

## Important Invariants

- `amount_due` formula (INV-4); negative values mean the trader overpaid.

## Common Queries

```sql
SELECT *
FROM traders
LIMIT 20;
```

## Debugging Notes

None recorded yet.

## Related Tables

Run `./db-knowledge relationships traders` or `./db-knowledge impact traders`.

## Last Verified

Structural: 2026-09-18 (generated) · Semantic: never — needs verification.

## Confidence

- structural facts: generated from the live database
- semantic facts: needs verification
