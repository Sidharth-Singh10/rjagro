---
table: bird_sell_history
schema_hash: fnv1a64:6a79ad919b8df659
last_schema_verified: 2026-09-18
semantic_confidence: needs-verification
---

# bird_sell_history

## Purpose

Unknown — needs verification.

## Database

PostgreSQL · schema `public`

## Owner

Unknown — needs verification.

Candidate code (inferred — needs verification): `entity/src/batches.rs` (2 refs), `entity/src/traders.rs` (2 refs), `src/handlers/inserts.rs` (2 refs)

## Consumers

Unknown — needs verification.

<!-- BEGIN GENERATED: schema -->
## Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| batch_id | integer | no | — |
| created_at | timestamp with time zone | no | CURRENT_TIMESTAMP |
| notes | text | no | — |
| price_per_bird | numeric(12,2) | no | — |
| quantity_sold | integer | no | — |
| sale_date | date | no | — |
| sale_id | integer | no | nextval('bird_sell_history_sale_id_seq'::regclass) |
| total_amount | numeric(12,2) | no | — |
| trader_id | integer | no | — |

## Primary Key

`sale_id`

## Foreign Keys

| Constraint | Columns | References | On Update | On Delete |
|---|---|---|---|---|
| fk_bird_sell_history_batch | batch_id | public.batches(batch_id) | NO ACTION | CASCADE |
| fk_bird_sell_history_trader | trader_id | public.traders(trader_id) | NO ACTION | NO ACTION |

## Indexes

| Index | Unique | Method | Columns | Predicate |
|---|---|---|---|---|
| bird_sell_history_pkey | yes | btree | sale_id | — |

## Constraints

_None._

<!-- END GENERATED: schema -->

## Relationships

See the generated foreign keys above, `database/relationships.md`, or run
`./db-knowledge relationships bird_sell_history`.

## Data Flow

Unknown — needs verification.

## Important Invariants

Unknown — needs verification. See `database/invariants.md`.

## Common Queries

```sql
SELECT *
FROM bird_sell_history
LIMIT 20;
```

## Debugging Notes

None recorded yet.

## Related Tables

Run `./db-knowledge relationships bird_sell_history` or `./db-knowledge impact bird_sell_history`.

## Last Verified

Structural: 2026-09-18 (generated) · Semantic: never — needs verification.

## Confidence

- structural facts: generated from the live database
- semantic facts: needs verification
