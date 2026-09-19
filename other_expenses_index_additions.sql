-- =============================================================================
-- Indexes for the paginated / summarized other-expenses endpoints
-- Apply AFTER running rjagro_schema_backup.sql on a fresh database.
-- This script is idempotent — safe to run multiple times.
-- =============================================================================

-- Serves GET /getall/other_expenses/paginated (ORDER BY created_at DESC LIMIT n)
-- and keeps the aggregate COUNT/SUM cheap for the table badge.
CREATE INDEX IF NOT EXISTS idx_other_expenses_created_at
    ON public.other_expenses (created_at DESC);

-- Serves GET /getall/other_expenses/summary (expense_date range + month grouping).
CREATE INDEX IF NOT EXISTS idx_other_expenses_expense_date
    ON public.other_expenses (expense_date);
