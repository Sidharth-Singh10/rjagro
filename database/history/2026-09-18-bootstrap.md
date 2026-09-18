# 2026-09-18 — Knowledge base bootstrapped

## Change

Created the persistent database knowledge base from the live `rjagro` database
(PostgreSQL 16.11): 38 tables, 299 columns, 64 indexes.

## Reason

Agents were rediscovering the same schema, relationships and invariants in every
session. This knowledge base records them once and is refreshed with
`./db-knowledge sync`.

## Impact

Documentation only; no application or schema changes.

## Migration

None — initial bootstrap.
