-- =============================================================================
-- Backup run log (one row per db_backup.sh execution)
-- Apply AFTER running rjagro_schema_backup.sql on a fresh database.
-- This script is idempotent — safe to run multiple times.
-- =============================================================================
--
-- Written by /home/asuna/rjagro/db_backup.sh on the host via `psql` inside the
-- rjagro_postgres container. The "Backups" tab in the admin dashboard reads it
-- to show which days backups were taken, and — just as important — which days
-- should have been taken but were not.
--
-- status:  success  → dump written, verified, and landed on the remote host
--          partial  → dump written and verified locally, remote copy missing
--          failed   → dump or transfer failed (see error)
--          running  → row opened at start, not closed yet (stale = crash)
--
-- triggered_by: scheduled (systemd timer) | manual (run by hand)

CREATE TABLE IF NOT EXISTS public.backup_runs (
    id           integer NOT NULL,
    started_at   timestamptz NOT NULL,
    finished_at  timestamptz,
    status       varchar(16) NOT NULL DEFAULT 'running',
    triggered_by varchar(16) NOT NULL DEFAULT 'scheduled',
    dump_bytes   bigint,
    filename     varchar(160),
    remote_host  varchar(64),
    remote_ok    boolean NOT NULL DEFAULT false,
    error        text,
    duration_ms  integer,
    created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE SEQUENCE IF NOT EXISTS backup_runs_id_seq
    AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE backup_runs_id_seq OWNED BY backup_runs.id;

ALTER TABLE backup_runs
    ALTER COLUMN id SET DEFAULT nextval('backup_runs_id_seq'::regclass);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'backup_runs_pkey'
    ) THEN
        ALTER TABLE ONLY backup_runs
            ADD CONSTRAINT backup_runs_pkey PRIMARY KEY (id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'backup_runs_status_check'
    ) THEN
        ALTER TABLE ONLY backup_runs
            ADD CONSTRAINT backup_runs_status_check
            CHECK (status IN ('running', 'success', 'partial', 'failed'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'backup_runs_triggered_by_check'
    ) THEN
        ALTER TABLE ONLY backup_runs
            ADD CONSTRAINT backup_runs_triggered_by_check
            CHECK (triggered_by IN ('scheduled', 'manual'));
    END IF;
END
$$;

CREATE INDEX IF NOT EXISTS backup_runs_started_at_idx
    ON public.backup_runs USING btree (started_at DESC);

-- One row per dump filename: the log is a diary, not a ledger of duplicates.
CREATE UNIQUE INDEX IF NOT EXISTS backup_runs_filename_key
    ON public.backup_runs USING btree (filename)
    WHERE filename IS NOT NULL;
