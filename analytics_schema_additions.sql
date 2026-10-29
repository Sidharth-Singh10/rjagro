-- Analytics: editable price history and versioned pipeline runs.
--
-- The price table becomes the source of truth for the tracker; the audit table
-- is what makes a correction explainable; a run row is one execution of the
-- Python pipeline and carries the whole payload the Analytics tab renders.
--
-- Apply with:  psql "$DATABASE_URL" -f analytics_schema_additions.sql

CREATE TABLE IF NOT EXISTS public.chicken_prices (
    price_date   date NOT NULL,
    price        numeric(10,2) NOT NULL CHECK (price > 0 AND price < 10000),
    quote_source text NOT NULL DEFAULT 'manual',
    note         text,
    updated_at   timestamptz NOT NULL DEFAULT now(),
    updated_by   integer REFERENCES public.users(user_id) ON DELETE SET NULL,
    CONSTRAINT chicken_prices_pkey PRIMARY KEY (price_date)
);

COMMENT ON TABLE public.chicken_prices IS
    'Daily wholesale chicken rate, INR per kg live weight. One row per quoted day; a missing row means no quote, never zero.';

CREATE TABLE IF NOT EXISTS public.chicken_price_audit (
    id         bigserial PRIMARY KEY,
    price_date date NOT NULL,
    old_price  numeric(10,2),
    new_price  numeric(10,2),
    action     text NOT NULL CHECK (action IN ('insert', 'update', 'delete', 'import')),
    changed_at timestamptz NOT NULL DEFAULT now(),
    changed_by integer REFERENCES public.users(user_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS chicken_price_audit_date_idx
    ON public.chicken_price_audit (price_date, changed_at DESC);

CREATE TABLE IF NOT EXISTS public.analytics_runs (
    id           uuid NOT NULL DEFAULT gen_random_uuid(),
    status       text NOT NULL CHECK (status IN ('queued', 'running', 'succeeded', 'failed')),
    requested_at timestamptz NOT NULL DEFAULT now(),
    started_at   timestamptz,
    finished_at  timestamptz,
    requested_by integer REFERENCES public.users(user_id) ON DELETE SET NULL,
    dataset_hash text,
    model        text,
    config_hash  text,
    trigger      text NOT NULL DEFAULT 'edit',
    error        text,
    payload      jsonb,
    report_md    text,
    CONSTRAINT analytics_runs_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS analytics_runs_status_idx
    ON public.analytics_runs (status, requested_at DESC);

CREATE INDEX IF NOT EXISTS analytics_runs_finished_idx
    ON public.analytics_runs (finished_at DESC)
    WHERE status = 'succeeded';

-- At most one queued run: a burst of edits coalesces instead of queueing fifty
-- jobs. The API inserts with ON CONFLICT DO NOTHING and reads the existing row.
CREATE UNIQUE INDEX IF NOT EXISTS analytics_runs_one_queued
    ON public.analytics_runs ((true))
    WHERE status = 'queued';

CREATE TABLE IF NOT EXISTS public.analytics_settings (
    key        text PRIMARY KEY,
    value      jsonb NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.analytics_settings (key, value)
VALUES ('models', '{"selector": "best_1_28", "candidates": ["anchor_events", "anchor", "ma7", "ma7_events", "ets_weekly"]}'::jsonb)
ON CONFLICT (key) DO NOTHING;
