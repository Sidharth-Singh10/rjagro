---
table: metric_snapshots
schema_hash: fnv1a64:10e822153fb8a426
last_schema_verified: 2026-09-18
semantic_confidence: needs-verification
---

# metric_snapshots

## Purpose

Unknown — needs verification.

## Database

PostgreSQL · schema `public`

## Owner

Unknown — needs verification.

Candidate code (inferred — needs verification): `src/handlers/metrics.rs` (20 refs), `entity/src/metric_snapshots.rs` (1 refs), `entity/src/mod.rs` (1 refs)

## Consumers

Unknown — needs verification.

<!-- BEGIN GENERATED: schema -->
## Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| computed_at | timestamp with time zone | no | now() |
| id | integer | no | nextval('metric_snapshots_id_seq'::regclass) |
| metric_key | character varying(64) | no | — |
| period_key | character varying(10) | no | — |
| period_type | character varying(8) | no | — |
| value | numeric(18,4) | no | 0 |

## Primary Key

`id`

## Foreign Keys

_None._

## Indexes

| Index | Unique | Method | Columns | Predicate |
|---|---|---|---|---|
| idx_metric_snapshots_lookup | no | btree | period_type, metric_key, period_key | — |
| metric_snapshots_pkey | yes | btree | id | — |
| uq_metric_snapshots | yes | btree | period_type, period_key, metric_key | — |

## Constraints

- `uq_metric_snapshots`: UNIQUE (period_type, period_key, metric_key)

<!-- END GENERATED: schema -->

## Relationships

See the generated foreign keys above, `database/relationships.md`, or run
`./db-knowledge relationships metric_snapshots`.

## Data Flow

Unknown — needs verification.

## Important Invariants

Unknown — needs verification. See `database/invariants.md`.

## Common Queries

```sql
SELECT *
FROM metric_snapshots
LIMIT 20;
```

## Debugging Notes

None recorded yet.

## Related Tables

Run `./db-knowledge relationships metric_snapshots` or `./db-knowledge impact metric_snapshots`.

## Last Verified

Structural: 2026-09-18 (generated) · Semantic: never — needs verification.

## Confidence

- structural facts: generated from the live database
- semantic facts: needs verification
