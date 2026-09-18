---
table: orders
schema_hash: fnv1a64:2faf560dac578284
last_schema_verified: 2026-09-18
semantic_confidence: needs-verification
---

# orders

## Purpose

Unknown — needs verification.

## Database

PostgreSQL · schema `public`

## Owner

Unknown — needs verification.

Candidate code (inferred — needs verification): `src/handlers/supervisor_app.rs` (32 refs), `src/handlers/trader_app.rs` (25 refs), `src/routes/supervisor_app.rs` (8 refs)

## Consumers

Unknown — needs verification.

<!-- BEGIN GENERATED: schema -->
## Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| actual_birds | integer | yes | — |
| actual_weight | numeric(12,2) | yes | — |
| batch_id | integer | no | — |
| cancelled_at | timestamp with time zone | yes | — |
| confirmed_at | timestamp with time zone | yes | — |
| created_at | timestamp with time zone | no | CURRENT_TIMESTAMP |
| entry_rate | numeric(12,2) | yes | — |
| expired_at | timestamp with time zone | yes | — |
| inquiry_number | character varying(30) | no | — |
| order_id | integer | no | nextval('orders_order_id_seq'::regclass) |
| rejected_at | timestamp with time zone | yes | — |
| rejection_reason | text | yes | — |
| requested_weight | numeric(12,2) | no | — |
| status | order_status | no | 'PENDING'::order_status |
| timeslot_id | integer | no | — |
| total_amount | numeric(18,2) | yes | — |
| trader_id | integer | no | — |
| weight_entered_at | timestamp with time zone | yes | — |

## Primary Key

`order_id`

## Foreign Keys

| Constraint | Columns | References | On Update | On Delete |
|---|---|---|---|---|
| orders_batch_id_fkey | batch_id | public.batches(batch_id) | NO ACTION | NO ACTION |
| orders_timeslot_id_fkey | timeslot_id | public.timeslots(timeslot_id) | NO ACTION | NO ACTION |
| orders_trader_id_fkey | trader_id | public.app_traders(id) | NO ACTION | NO ACTION |

## Indexes

| Index | Unique | Method | Columns | Predicate |
|---|---|---|---|---|
| orders_inquiry_number_key | yes | btree | inquiry_number | — |
| orders_pkey | yes | btree | order_id | — |

## Constraints

- `orders_inquiry_number_key`: UNIQUE (inquiry_number)

<!-- END GENERATED: schema -->

## Relationships

See the generated foreign keys above, `database/relationships.md`, or run
`./db-knowledge relationships orders`.

## Data Flow

Unknown — needs verification.

## Important Invariants

Unknown — needs verification. See `database/invariants.md`.

## Common Queries

```sql
SELECT *
FROM orders
LIMIT 20;
```

## Debugging Notes

None recorded yet.

## Related Tables

Run `./db-knowledge relationships orders` or `./db-knowledge impact orders`.

## Last Verified

Structural: 2026-09-18 (generated) · Semantic: never — needs verification.

## Confidence

- structural facts: generated from the live database
- semantic facts: needs verification
