---
table: other_expenses
schema_hash: fnv1a64:0d0d6b0d22dac633
last_schema_verified: 2026-09-18
semantic_confidence: needs-verification
---

# other_expenses

## Purpose

Unknown — needs verification.

## Database

PostgreSQL · schema `public`

## Owner

Unknown — needs verification.

Candidate code (inferred — needs verification): `src/handlers/metrics.rs` (7 refs), `src/handlers/other_expenses.rs` (7 refs), `src/routes/fetch_all.rs` (2 refs)

## Consumers

Unknown — needs verification.

<!-- BEGIN GENERATED: schema -->
## Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| amount | numeric(18,2) | no | — |
| category | other_expense_category | no | — |
| created_at | timestamp with time zone | no | CURRENT_TIMESTAMP |
| created_by | integer | no | — |
| description | text | yes | — |
| expense_date | date | no | — |
| id | integer | no | nextval('other_expenses_id_seq'::regclass) |

## Primary Key

`id`

## Foreign Keys

| Constraint | Columns | References | On Update | On Delete |
|---|---|---|---|---|
| other_expenses_created_by_fkey | created_by | public.users(user_id) | NO ACTION | SET NULL |

## Indexes

| Index | Unique | Method | Columns | Predicate |
|---|---|---|---|---|
| other_expenses_pkey | yes | btree | id | — |

## Constraints

_None._

<!-- END GENERATED: schema -->

## Relationships

See the generated foreign keys above, `database/relationships.md`, or run
`./db-knowledge relationships other_expenses`.

## Data Flow

Unknown — needs verification.

## Important Invariants

Unknown — needs verification. See `database/invariants.md`.

## Common Queries

```sql
SELECT *
FROM other_expenses
LIMIT 20;
```

## Debugging Notes

None recorded yet.

## Related Tables

Run `./db-knowledge relationships other_expenses` or `./db-knowledge impact other_expenses`.

## Last Verified

Structural: 2026-09-18 (generated) · Semantic: never — needs verification.

## Confidence

- structural facts: generated from the live database
- semantic facts: needs verification
