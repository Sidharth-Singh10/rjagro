---
table: backup_runs
last_schema_verified: 2026-11-04
semantic_confidence: needs-verification
---

# backup_runs

## Purpose

One row per `db_backup.sh` execution: the diary behind the admin dashboard's
**Backups** tab. It answers two questions — which days a dump was taken, and
which scheduled days were missed.

The table is written by the host script (`/home/asuna/rjagro/db_backup.sh`) via
`psql` inside the `rjagro_postgres` container, not by the API. The API only
reads it.

## Database

PostgreSQL · schema `public`

## Columns

| Column | Type | Notes |
|---|---|---|
| `id` | integer | PK, `backup_runs_id_seq` |
| `started_at` | timestamptz | UTC, written at the start of the run |
| `finished_at` | timestamptz | null while `running` |
| `status` | varchar(16) | `running` · `success` · `partial` · `failed` |
| `triggered_by` | varchar(16) | `scheduled` (systemd timer) · `manual` |
| `dump_bytes` | bigint | size of the gzipped dump on disk |
| `filename` | varchar(160) | `pg_rjagro_<UTC timestamp>.sql.gz`, unique |
| `remote_host` | varchar(64) | Tailscale IP of the offsite target (paradis) |
| `remote_ok` | boolean | file confirmed present on the remote after rsync |
| `error` | text | failure detail, null on clean runs |
| `duration_ms` | integer | wall time of the whole run |
| `created_at` | timestamptz | insert time |

Status semantics:

- `success` — dump verified locally **and** confirmed on the remote host.
- `partial` — dump is good locally, remote copy missing/unverified.
- `failed` — dump or transfer failed; see `error`.
- `running` — row opened but never closed (killed run); the API flags it stale
  after 60 minutes.

## Owner

`/home/asuna/rjagro/db_backup.sh` (host, outside the repo).

## Consumers

- `src/handlers/backups.rs` — `GET /backups` (admin-only, via `RequireRoles`)
- `app/components/v2/backups_module.tsx` — the Backups tab

## Related

- `backup_runs_schema_additions.sql` — idempotent DDL
- `/etc/systemd/system/db-backup.{service,timer}` — the schedule the API reports
