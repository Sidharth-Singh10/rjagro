---
table: batch_sales
schema_hash: fnv1a64:dfb5d3d49363044d
last_schema_verified: 2026-09-18
semantic_confidence: documented
---

# batch_sales

## Purpose

Records sales of birds (typically `DC101`) to legacy traders and app traders:
weight, rate, quantity, value and payment type. `value` equals
`avg_weight × rate` (total weight × ₹/kg).

## Database

PostgreSQL · schema `public`

## Owner

Backend: `src/handlers/batch_sales.rs` (`create_batch_sale`, `delete_batch_sale`,
ledger posting) and `src/handlers/supervisor_app.rs` (rows appended when a live
order is closed).

## Consumers

Overview dashboard, batch sales tab, trader receivables, metrics snapshots
(`src/handlers/metrics.rs`), and ledger postings.

<!-- BEGIN GENERATED: schema -->
## Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| app_trader_id | integer | yes | — |
| avg_weight | numeric | no | — |
| batch_id | integer | no | — |
| created_at | timestamp with time zone | no | now() |
| id | integer | no | nextval('batch_sales_id_seq'::regclass) |
| item_code | character varying | no | — |
| payment_type | payment_type | no | 'CASH'::payment_type |
| quantity | numeric | no | — |
| rate | numeric | no | — |
| sale_date | date | no | '2026-01-01'::date |
| trader_id | integer | no | — |
| value | numeric | no | — |

## Primary Key

`id`

## Foreign Keys

| Constraint | Columns | References | On Update | On Delete |
|---|---|---|---|---|
| fk-batch_sales-batch_id | batch_id | public.batches(batch_id) | NO ACTION | CASCADE |
| fk-batch_sales-item_code | item_code | public.items(item_code) | NO ACTION | CASCADE |
| fk-batch_sales-trader_id | trader_id | public.traders(trader_id) | NO ACTION | CASCADE |
| fk_batch_sales_app_trader_id | app_trader_id | public.app_traders(id) | NO ACTION | SET NULL |

## Indexes

| Index | Unique | Method | Columns | Predicate |
|---|---|---|---|---|
| batch_sales_pkey | yes | btree | id | — |

## Constraints

_None._

<!-- END GENERATED: schema -->

## Relationships

See the generated foreign keys above, `database/relationships.md`, or run
`./db-knowledge relationships batch_sales`.

## Data Flow

A sale is recorded (direct form or supervisor order closure) → a `batch_sales`
row → paired `ledger_entries` (debit receivables, credit bird-sales) → batch
closure revenue. Trader payments later reduce the outstanding balance through
`trader_payments`.

## Important Invariants

- `value = avg_weight × rate`.
- `sale_date` defaults to `2026-01-01`; use `created_at` for real timing.
- Closure revenue equals the sum of sales per batch (INV-3).

## Common Queries

```sql
SELECT *
FROM batch_sales
LIMIT 20;
```

## Debugging Notes

None recorded yet.

## Related Tables

Run `./db-knowledge relationships batch_sales` or `./db-knowledge impact batch_sales`.

## Last Verified

Structural: 2026-09-18 (generated) · Semantic: never — needs verification.

## Confidence

- structural facts: generated from the live database
- semantic facts: needs verification
