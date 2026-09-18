---
table: farmer_commission_history
schema_hash: fnv1a64:ee527bc3b854c49a
last_schema_verified: 2026-09-18
semantic_confidence: needs-verification
---

# farmer_commission_history

## Purpose

Unknown — needs verification.

## Database

PostgreSQL · schema `public`

## Owner

Unknown — needs verification.

Candidate code (inferred — needs verification): `src/handlers/fetch_by_id.rs` (5 refs), `src/handlers/inserts.rs` (4 refs), `src/handlers/fetch_all.rs` (3 refs)

## Consumers

Unknown — needs verification.

<!-- BEGIN GENERATED: schema -->
## Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| commission_amount | numeric(10,2) | no | — |
| created_at | timestamp with time zone | no | — |
| description | character varying | yes | — |
| farmer_id | integer | no | — |
| id | integer | no | nextval('farmer_commission_history_id_seq'::regclass) |

## Primary Key

`id`

## Foreign Keys

| Constraint | Columns | References | On Update | On Delete |
|---|---|---|---|---|
| farmer_commission_history_farmer_id_fkey | farmer_id | public.farmers(farmer_id) | NO ACTION | CASCADE |

## Indexes

| Index | Unique | Method | Columns | Predicate |
|---|---|---|---|---|
| farmer_commission_history_pkey | yes | btree | id | — |

## Constraints

_None._

<!-- END GENERATED: schema -->

## Relationships

See the generated foreign keys above, `database/relationships.md`, or run
`./db-knowledge relationships farmer_commission_history`.

## Data Flow

Unknown — needs verification.

## Important Invariants

Unknown — needs verification. See `database/invariants.md`.

## Common Queries

```sql
SELECT *
FROM farmer_commission_history
LIMIT 20;
```

## Debugging Notes

None recorded yet.

## Related Tables

Run `./db-knowledge relationships farmer_commission_history` or `./db-knowledge impact farmer_commission_history`.

## Last Verified

Structural: 2026-09-18 (generated) · Semantic: never — needs verification.

## Confidence

- structural facts: generated from the live database
- semantic facts: needs verification
