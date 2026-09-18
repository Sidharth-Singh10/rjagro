---
table: audit_log
schema_hash: fnv1a64:57b35003efc83cb6
last_schema_verified: 2026-09-18
semantic_confidence: needs-verification
---

# audit_log

## Purpose

Unknown — needs verification.

## Database

PostgreSQL · schema `public`

## Owner

Unknown — needs verification.

Candidate code (inferred — needs verification): `src/handlers/audit.rs` (4 refs), `src/handlers/trader_app.rs` (3 refs), `entity/src/audit_log.rs` (2 refs)

## Consumers

Unknown — needs verification.

<!-- BEGIN GENERATED: schema -->
## Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| action | character varying(100) | no | — |
| actor_id | integer | no | — |
| actor_type | character varying(20) | no | — |
| audit_id | integer | no | nextval('audit_log_audit_id_seq'::regclass) |
| created_at | timestamp with time zone | no | CURRENT_TIMESTAMP |
| field_changed | character varying(100) | yes | — |
| new_value | text | yes | — |
| old_value | text | yes | — |
| order_id | integer | no | — |

## Primary Key

`audit_id`

## Foreign Keys

| Constraint | Columns | References | On Update | On Delete |
|---|---|---|---|---|
| audit_log_order_id_fkey | order_id | public.orders(order_id) | NO ACTION | NO ACTION |

## Indexes

| Index | Unique | Method | Columns | Predicate |
|---|---|---|---|---|
| audit_log_pkey | yes | btree | audit_id | — |

## Constraints

_None._

<!-- END GENERATED: schema -->

## Relationships

See the generated foreign keys above, `database/relationships.md`, or run
`./db-knowledge relationships audit_log`.

## Data Flow

Unknown — needs verification.

## Important Invariants

Unknown — needs verification. See `database/invariants.md`.

## Common Queries

```sql
SELECT *
FROM audit_log
LIMIT 20;
```

## Debugging Notes

None recorded yet.

## Related Tables

Run `./db-knowledge relationships audit_log` or `./db-knowledge impact audit_log`.

## Last Verified

Structural: 2026-09-18 (generated) · Semantic: never — needs verification.

## Confidence

- structural facts: generated from the live database
- semantic facts: needs verification
