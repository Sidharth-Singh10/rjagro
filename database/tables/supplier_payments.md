---
table: supplier_payments
schema_hash: fnv1a64:b6c6958bba865cc1
last_schema_verified: 2026-09-18
semantic_confidence: needs-verification
---

# supplier_payments

## Purpose

Unknown — needs verification.

## Database

PostgreSQL · schema `public`

## Owner

Unknown — needs verification.

Candidate code (inferred — needs verification): `src/handlers/suppliers.rs` (11 refs), `entity/src/mod.rs` (1 refs), `entity/src/supplier_payments.rs` (1 refs)

## Consumers

Unknown — needs verification.

<!-- BEGIN GENERATED: schema -->
## Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| amount | numeric(18,2) | no | — |
| created_at | timestamp with time zone | no | now() |
| notes | text | yes | — |
| payment_date | date | no | — |
| payment_id | integer | no | nextval('supplier_payments_payment_id_seq'::regclass) |
| payment_mode | character varying(50) | yes | — |
| reference_number | character varying(100) | yes | — |
| supplier_id | integer | no | — |
| txn_group_id | uuid | yes | — |

## Primary Key

`payment_id`

## Foreign Keys

| Constraint | Columns | References | On Update | On Delete |
|---|---|---|---|---|
| supplier_payments_supplier_id_fkey | supplier_id | public.suppliers(supplier_id) | NO ACTION | NO ACTION |

## Indexes

| Index | Unique | Method | Columns | Predicate |
|---|---|---|---|---|
| idx_supplier_payments_trader_id | no | btree | supplier_id | — |
| supplier_payments_pkey | yes | btree | payment_id | — |

## Constraints

_None._

<!-- END GENERATED: schema -->

## Relationships

See the generated foreign keys above, `database/relationships.md`, or run
`./db-knowledge relationships supplier_payments`.

## Data Flow

Unknown — needs verification.

## Important Invariants

Unknown — needs verification. See `database/invariants.md`.

## Common Queries

```sql
SELECT *
FROM supplier_payments
LIMIT 20;
```

## Debugging Notes

None recorded yet.

## Related Tables

Run `./db-knowledge relationships supplier_payments` or `./db-knowledge impact supplier_payments`.

## Last Verified

Structural: 2026-09-18 (generated) · Semantic: never — needs verification.

## Confidence

- structural facts: generated from the live database
- semantic facts: needs verification
