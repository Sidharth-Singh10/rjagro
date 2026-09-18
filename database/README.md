# Database Knowledge

Persistent, version-controlled understanding of the `rjagro` PostgreSQL database.
It complements — never replaces — the live database.

- **Live database** = source of truth for structural facts (tables, columns, keys, indexes).
- **This directory** = accumulated semantic knowledge: meaning, ownership, flows, invariants, debugging notes and change history.

Generated 2026-09-18 from `rjagro` (PostgreSQL 16.11, 38 tables).

## Structure

| Path | Contents |
|---|---|
| `schema.md` | Concise database/domain map — start here |
| `relationships.md` / `relationships.json` | Foreign-key graph (human + machine) |
| `services.md` | Which code owns/reads which tables (inferred, needs verification) |
| `data-flows.md` | How data moves through tables |
| `invariants.md` | Rules that should always hold, with verification SQL |
| `debugging.md` | Playbooks and known failure modes |
| `domains.json` | Curated domain → tables mapping |
| `tables/<table>.md` | One document per table |
| `schema-snapshot/current.json` | Deterministic schema snapshot |
| `history/` | Meaningful schema/architecture changes |

## Commands

```bash
./db-knowledge overview              # database + domain map
./db-knowledge search <term>         # find tables (low-context output)
./db-knowledge table <name>          # one table's doc
./db-knowledge relationships <name>  # FK parents/children
./db-knowledge impact <name>         # reverse FKs + code references
./db-knowledge domain <name>         # tables in a domain
./db-knowledge diff                  # live schema vs snapshot
./db-knowledge sync                  # refresh snapshot, flag stale docs
./db-knowledge changed               # uncommitted schema changes + recent history
./db-knowledge verify <name>         # mark a table doc reviewed
./db-knowledge bootstrap             # initial generation (or --force to re-run)
```

All commands are read-only against the application database. `bootstrap`,
`sync` and `verify` only write inside this directory.

## Source of truth

1. Structural facts come from the live database via `sync` — never hand-edit
   `schema-snapshot/current.json` or the `GENERATED` block in a table doc.
2. Semantic prose is hand-written and never overwritten by tooling.
3. If documentation conflicts with the database or runtime behavior, trust the
   database/behavior and update the docs.

## Staleness

Every table doc front matter records `schema_hash` + `last_schema_verified`.
When `sync` detects a structural change it refreshes the generated block and
reports the doc as **requires review**. After reviewing the semantics, run
`./db-knowledge verify <table>` (add `--documented` once the prose is confirmed).

## Schema changes

There is no migration framework in this repo: changes are applied with SQL
files (`*_schema_additions.sql`, `backup.sql` for fresh installs) and recorded
in `seaql_migrations`. Workflow:

```text
write/apply SQL  →  ./db-knowledge sync  →  review flagged docs  →  update semantics  →  git commit (SQL + database/)
```

Add a `history/YYYY-MM-DD-<slug>.md` entry for meaningful changes.

## For Agents

1. Read `schema.md` first; do not load every table doc.
2. `search` → read 2–5 relevant table docs → query the live DB to verify.
3. Follow `relationships`/`impact` for blast radius and `invariants` for rules.
4. After any schema change, run `sync`, review the flagged docs and update the
   semantic sections; mark them with `verify`.
5. Never invent business meaning — write `Unknown — needs verification` instead.
