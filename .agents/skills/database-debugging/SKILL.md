---
name: Database Debugging
description: Investigate database-related issues using the persistent database knowledge base in database/. Use when debugging data problems, tracing tables and relationships, checking invariants, answering "where is X stored", or after any schema change. Covers the db-knowledge commands and the sync workflow.
---

# Database Debugging

Use the persistent knowledge base in `database/` instead of rediscovering the
schema in every session. Load information progressively — never read all table
docs.

## Source of truth

- **Live database** — authoritative for structural facts (tables, columns, keys,
  indexes, constraints). Verify with the postgres MCP tools or SQL before acting.
- **`database/` knowledge base** — authoritative for documented semantic
  context (meaning, ownership, flows, invariants, debugging notes). If it
  conflicts with code or runtime behavior, trust the code/behavior and update
  the docs.

## Before investigating

1. Read `database/schema.md` (concise map; ~50 lines).
2. Identify the domain; list it with `./db-knowledge domain <name>`.
3. Find candidate tables:
   `./db-knowledge search "<term>"`.
4. Read only the relevant docs (2–5):
   `./db-knowledge table <name>`.
5. Get blast radius:
   `./db-knowledge relationships <name>` and `./db-knowledge impact <name>`.
6. Check `database/invariants.md` for rules that should hold and their
   verification SQL.
7. Check `database/debugging.md` for known failure modes.

## While investigating

- Query the live database to confirm structural assumptions (the snapshot can
  lag if a change was applied without `sync`).
- Follow documented data flows in `database/data-flows.md`.
- When you discover a **verified** debugging fact, record it in the relevant
  table doc under "Debugging Notes" or in `database/debugging.md` — with
  evidence (file path, query, or commit). Do not persist hypotheses.

## After any schema change

Schema changes in this repo are applied with SQL (`*_schema_additions.sql` or
direct SQL); there is no migration framework.

1. Apply the change.
2. Run `./db-knowledge sync`.
3. Read the diff; it lists added/removed tables, columns, types, keys, indexes
   and constraints.
4. Review every doc reported as "requires review" and update the semantic
   sections (Purpose, Owner, Consumers, Data Flow, Invariants, Debugging).
5. Run `./db-knowledge verify <table>` (add `--documented` when the prose is
   confirmed).
6. Add a `database/history/YYYY-MM-DD-<slug>.md` entry for meaningful changes.
7. Commit the SQL change together with the `database/` updates.

Never hand-edit `schema-snapshot/current.json` or the content between
`BEGIN GENERATED` / `END GENERATED` markers — `sync` owns those.

## Command reference

```bash
./db-knowledge overview              # database + domain map
./db-knowledge search <term>         # find tables (low-context output)
./db-knowledge table <name>          # one table's doc
./db-knowledge relationships <name>  # FK parents/children
./db-knowledge impact <name>         # reverse FKs + code references
./db-knowledge domain <name>         # tables in a domain
./db-knowledge diff [--json]         # live schema vs snapshot
./db-knowledge sync [--check]        # refresh snapshot, flag stale docs
./db-knowledge changed               # uncommitted schema drift + recent history
./db-knowledge verify <name>         # mark a table doc reviewed
./db-knowledge bootstrap             # initial generation (--force to re-run)
```

All commands are read-only against the application database. `bootstrap`,
`sync` and `verify` only write inside `database/`.

## Rules

- Do not rediscover the whole database — search first, read few docs.
- Do not invent business meaning: write `Unknown — needs verification` when the
  codebase does not establish it.
- Do not treat this documentation as more authoritative than the live database
  for structural facts.
