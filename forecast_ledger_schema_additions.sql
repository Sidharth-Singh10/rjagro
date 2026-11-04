-- Prospective ledger. Additive and independent of analytics_runs retention.
-- No changes to observed prices or the existing forecast payload.
BEGIN;

CREATE TABLE IF NOT EXISTS public.forecast_protocols (
    id text PRIMARY KEY,
    definition jsonb NOT NULL,
    initial_known_dates jsonb NOT NULL DEFAULT '[]',
    created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS public.forecast_batches (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    protocol_id text NOT NULL REFERENCES public.forecast_protocols(id),
    intent_key text NOT NULL UNIQUE,
    kind text NOT NULL CHECK (kind IN ('official', 'ad_hoc')),
    origin_date date NOT NULL,
    scheduled_for timestamptz,
    snapshot_at timestamptz NOT NULL,
    snapshot jsonb NOT NULL,
    dataset_hash text NOT NULL,
    source_watermark bigint NOT NULL,
    status text NOT NULL CHECK (status IN ('queued', 'running', 'published', 'failed', 'blocked', 'missed')),
    requested_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    started_at timestamptz,
    published_at timestamptz,
    attempts integer NOT NULL DEFAULT 0,
    error text,
    metadata jsonb NOT NULL DEFAULT '{}',
    CHECK ((status = 'published') = (published_at IS NOT NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS forecast_official_day
    ON public.forecast_batches (protocol_id, origin_date) WHERE kind = 'official';
CREATE INDEX IF NOT EXISTS forecast_batch_history
    ON public.forecast_batches (requested_at DESC, id);
CREATE INDEX IF NOT EXISTS forecast_batch_pending
    ON public.forecast_batches (status, requested_at) WHERE published_at IS NULL;

CREATE TABLE IF NOT EXISTS public.forecast_predictions (
    batch_id uuid NOT NULL REFERENCES public.forecast_batches(id),
    model text NOT NULL CHECK (model IN ('existing', 'hybrid', 'ar1', 'naive')),
    target_date date NOT NULL,
    horizon integer NOT NULL CHECK (horizon > 0),
    prediction double precision NOT NULL CHECK (prediction > 0 AND prediction < 'Infinity'::float8),
    lo80 double precision, hi80 double precision,
    lo95 double precision, hi95 double precision,
    interval_status text NOT NULL,
    events jsonb NOT NULL DEFAULT '[]',
    PRIMARY KEY (batch_id, model, target_date),
    CHECK ((lo80 IS NULL) = (hi80 IS NULL)),
    CHECK ((lo95 IS NULL) = (hi95 IS NULL)),
    CHECK ((lo80 IS NULL AND hi80 IS NULL) OR (lo80 > 0 AND lo80 <= prediction AND prediction <= hi80 AND hi80 < 'Infinity'::float8)),
    CHECK ((lo95 IS NULL AND hi95 IS NULL) OR (lo95 > 0 AND lo95 <= prediction AND prediction <= hi95 AND hi95 < 'Infinity'::float8)),
    CHECK (lo80 IS NULL OR lo95 IS NULL OR (lo95 <= lo80 AND hi95 >= hi80))
);
CREATE INDEX IF NOT EXISTS forecast_prediction_target ON public.forecast_predictions(target_date);

CREATE TABLE IF NOT EXISTS public.forecast_evaluations (
    id bigserial PRIMARY KEY,
    batch_id uuid NOT NULL,
    model text NOT NULL,
    target_date date NOT NULL,
    actual_revision text NOT NULL,
    actual double precision,
    actual_available_at timestamptz,
    evaluated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    status text NOT NULL CHECK (status IN ('scored', 'known_before_publication', 'unavailable')),
    error double precision,
    absolute_error double precision,
    squared_error double precision,
    smape double precision,
    covered80 boolean, covered95 boolean,
    width80 double precision, width95 double precision,
    interval_score80 double precision, interval_score95 double precision,
    UNIQUE (batch_id, model, target_date, actual_revision),
    FOREIGN KEY (batch_id, model, target_date)
        REFERENCES public.forecast_predictions(batch_id, model, target_date),
    CHECK (actual IS NULL OR (actual > 0 AND actual < 'Infinity'::float8))
);
CREATE INDEX IF NOT EXISTS forecast_evaluation_latest
    ON public.forecast_evaluations (batch_id, model, target_date, id DESC);

CREATE OR REPLACE FUNCTION public.forecast_append_only() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'Forecast evidence is append-only; create a new version instead';
END;
$$;
DROP TRIGGER IF EXISTS forecast_protocol_immutable ON public.forecast_protocols;
CREATE TRIGGER forecast_protocol_immutable BEFORE UPDATE OR DELETE ON public.forecast_protocols
    FOR EACH ROW EXECUTE FUNCTION public.forecast_append_only();
DROP TRIGGER IF EXISTS forecast_prediction_immutable ON public.forecast_predictions;
CREATE TRIGGER forecast_prediction_immutable BEFORE UPDATE OR DELETE ON public.forecast_predictions
    FOR EACH ROW EXECUTE FUNCTION public.forecast_append_only();
DROP TRIGGER IF EXISTS forecast_evaluation_immutable ON public.forecast_evaluations;
CREATE TRIGGER forecast_evaluation_immutable BEFORE UPDATE OR DELETE ON public.forecast_evaluations
    FOR EACH ROW EXECUTE FUNCTION public.forecast_append_only();

CREATE OR REPLACE FUNCTION public.forecast_batch_guard() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'Forecast batches are permanent';
    END IF;
    IF OLD.published_at IS NOT NULL OR
       ROW(OLD.protocol_id, OLD.intent_key, OLD.kind, OLD.origin_date, OLD.snapshot_at,
           OLD.snapshot, OLD.dataset_hash, OLD.source_watermark, OLD.scheduled_for)
       IS DISTINCT FROM
       ROW(NEW.protocol_id, NEW.intent_key, NEW.kind, NEW.origin_date, NEW.snapshot_at,
           NEW.snapshot, NEW.dataset_hash, NEW.source_watermark, NEW.scheduled_for) THEN
        RAISE EXCEPTION 'Published batches and input snapshots are immutable';
    END IF;
    IF NEW.status = 'published' AND (
        SELECT count(*) <> 4 * count(DISTINCT target_date)
            OR count(DISTINCT model) <> 4 OR count(*) = 0
        FROM public.forecast_predictions WHERE batch_id = NEW.id
    ) THEN
        RAISE EXCEPTION 'Publish a complete four-model cohort atomically';
    END IF;
    RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS forecast_batch_immutable ON public.forecast_batches;
CREATE TRIGGER forecast_batch_immutable BEFORE UPDATE OR DELETE ON public.forecast_batches
    FOR EACH ROW EXECUTE FUNCTION public.forecast_batch_guard();

CREATE OR REPLACE FUNCTION public.forecast_prediction_guard() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE b public.forecast_batches;
BEGIN
    SELECT * INTO b FROM public.forecast_batches WHERE id = NEW.batch_id FOR UPDATE;
    IF b.status <> 'running' OR b.published_at IS NOT NULL OR
       NEW.target_date <> b.origin_date + NEW.horizon THEN
        RAISE EXCEPTION 'Prediction must belong to an unpublished running batch with aligned target';
    END IF;
    RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS forecast_prediction_insert_guard ON public.forecast_predictions;
CREATE TRIGGER forecast_prediction_insert_guard BEFORE INSERT ON public.forecast_predictions
    FOR EACH ROW EXECUTE FUNCTION public.forecast_prediction_guard();

CREATE OR REPLACE VIEW public.forecast_evaluation_current AS
SELECT DISTINCT ON (batch_id, model, target_date) *
FROM public.forecast_evaluations
ORDER BY batch_id, model, target_date, id DESC;

CREATE OR REPLACE VIEW public.forecast_score_rows AS
WITH paired AS (
    SELECT batch_id, target_date
    FROM public.forecast_evaluation_current
    GROUP BY batch_id, target_date
    HAVING count(*) = 4 AND bool_and(status = 'scored')
        AND count(DISTINCT actual_revision) = 1
)
SELECT e.*, p.horizon, p.events, b.kind, b.protocol_id, b.origin_date, b.published_at,
    CASE WHEN p.horizon <= 7 THEN '1-7' WHEN p.horizon <= 30 THEN '8-30'
         WHEN p.horizon <= 90 THEN '31-90' WHEN p.horizon <= 180 THEN '91-180'
         WHEN p.horizon <= 365 THEN '181-365' ELSE '>365' END AS bucket,
    jsonb_array_length(p.events) > 0 AS event_active,
    EXISTS (SELECT FROM jsonb_array_elements(p.events) AS ev
        WHERE b.published_at < ((ev->>'leadStart')::date::timestamp AT TIME ZONE 'Asia/Kolkata')) AS advance_event
FROM public.forecast_evaluation_current e
JOIN paired USING (batch_id, target_date)
JOIN public.forecast_predictions p USING (batch_id, model, target_date)
JOIN public.forecast_batches b ON b.id = e.batch_id
WHERE b.status = 'published';

COMMIT;
