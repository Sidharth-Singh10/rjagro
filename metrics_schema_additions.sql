-- =============================================================================
-- Stored metrics history (financial + operational trend snapshots)
-- Apply AFTER running rjagro_schema_backup.sql on a fresh database.
-- This script is idempotent — safe to run multiple times.
-- =============================================================================

-- One row per (period, metric). period_type is 'month' or 'day';
-- period_key is 'YYYY-MM' or 'YYYY-MM-DD' respectively.
CREATE TABLE IF NOT EXISTS public.metric_snapshots (
    id          integer NOT NULL,
    period_type varchar(8) NOT NULL,
    period_key  varchar(10) NOT NULL,
    metric_key  varchar(64) NOT NULL,
    value       numeric(18,4) NOT NULL DEFAULT 0,
    computed_at timestamptz NOT NULL DEFAULT now()
);

CREATE SEQUENCE IF NOT EXISTS metric_snapshots_id_seq
    AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE metric_snapshots_id_seq OWNED BY metric_snapshots.id;

ALTER TABLE metric_snapshots
    ALTER COLUMN id SET DEFAULT nextval('metric_snapshots_id_seq'::regclass);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'metric_snapshots_pkey'
    ) THEN
        ALTER TABLE ONLY metric_snapshots
            ADD CONSTRAINT metric_snapshots_pkey PRIMARY KEY (id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_metric_snapshots'
    ) THEN
        ALTER TABLE ONLY metric_snapshots
            ADD CONSTRAINT uq_metric_snapshots
            UNIQUE (period_type, period_key, metric_key);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_metric_snapshots_lookup
    ON metric_snapshots (period_type, metric_key, period_key);
