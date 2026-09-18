---
table: suppliers
schema_hash: fnv1a64:dc36a5e441b9e8ef
last_schema_verified: 2026-09-18
semantic_confidence: needs-verification
---

# suppliers

## Purpose

Unknown — needs verification.

## Database

PostgreSQL · schema `public`

## Owner

Unknown — needs verification.

Candidate code (inferred — needs verification): `src/handlers/purchase_orders.rs` (6 refs), `entity/src/purchases.rs` (4 refs), `entity/src/purchase_orders.rs` (3 refs)

## Consumers

Unknown — needs verification.

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
| supplier_id | integer | no | nextval('suppliers_supplier_id_seq'::regclass) |
| supplier_type | supplier_type | no | — |

## Primary Key

`supplier_id`

## Foreign Keys

_None._

## Indexes

| Index | Unique | Method | Columns | Predicate |
|---|---|---|---|---|
| suppliers_phone_number_key | yes | btree | phone_number | — |
| suppliers_pkey | yes | btree | supplier_id | — |
| uq_suppliers_name | yes | btree | name | — |

## Constraints

- `suppliers_phone_number_key`: UNIQUE (phone_number)
- `uq_suppliers_name`: UNIQUE (name)

<!-- END GENERATED: schema -->

## Relationships

See the generated foreign keys above, `database/relationships.md`, or run
`./db-knowledge relationships suppliers`.

## Data Flow

Unknown — needs verification.

## Important Invariants

Unknown — needs verification. See `database/invariants.md`.

## Common Queries

```sql
SELECT *
FROM suppliers
LIMIT 20;
```

## Debugging Notes

None recorded yet.

## Related Tables

Run `./db-knowledge relationships suppliers` or `./db-knowledge impact suppliers`.

## Last Verified

Structural: 2026-09-18 (generated) · Semantic: never — needs verification.

## Confidence

- structural facts: generated from the live database
- semantic facts: needs verification
