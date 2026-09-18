# Database Architecture

> Structural facts are generated from the live database; refresh with
> `./db-knowledge sync`. Domains are curated in `domains.json`.

<!-- BEGIN GENERATED: stats -->
## Database

- Database: `rjagro`
- Server: PostgreSQL 16.11
- Schemas: public
- Tables: 38 · Columns: 299 · Indexes: 64
- Snapshot format: 1 · Generated: 2026-09-18
<!-- END GENERATED: stats -->

## Purpose

PostgreSQL relational state for the RJ Agro poultry operations platform:
farms and batches, inventory and allocations, purchases, sales, trader and
supplier accounts, double-entry ledger, loans, expenses and stored metrics.
The live database is the source of truth for structural facts; this
knowledge base records their meaning (curate the sections below).

## Domains

Domains group tables by business area and are curated in `domains.json`.
List them with `./db-knowledge domain <name>`.

## Key tables (generated — verify)

Most connected tables by foreign keys:

- `batches` (13 FK connections)
- `users` (10 FK connections)
- `items` (6 FK connections)
- `batch_requirements` (5 FK connections)
- `orders` (5 FK connections)
- `purchases` (5 FK connections)
- `app_traders` (4 FK connections)
- `batch_allocation_lines` (4 FK connections)
- `batch_sales` (4 FK connections)
- `traders` (4 FK connections)

## Important relationships

See `database/relationships.md` (human view) and `database/relationships.json` (machine-readable).

## For Agents

1. Run `./db-knowledge overview` for this page.
2. `./db-knowledge search <term>` to find candidate tables.
3. `./db-knowledge table <name>` for one table's doc.
4. `./db-knowledge relationships <name>` / `impact <name>` for blast radius.
5. Verify structural facts against the live database before acting.
