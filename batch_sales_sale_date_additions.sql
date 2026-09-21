-- =============================================================================
-- batch_sales.sale_date: remove the placeholder default
-- Apply AFTER running rjagro_schema_backup.sql on a fresh database.
-- This script is idempotent — safe to run multiple times.
-- =============================================================================

-- The column used to default to a hardcoded '2026-01-01', which leaked into
-- every row whose insert path did not set it (all manual sales). The API now
-- always sends the sale date; CURRENT_DATE is the safe fallback for anything
-- that still inserts without one.
ALTER TABLE public.batch_sales
    ALTER COLUMN sale_date SET DEFAULT CURRENT_DATE;
