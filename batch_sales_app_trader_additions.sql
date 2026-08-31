-- =============================================================================
-- Batch sales to app traders (web app direct sales)
-- Apply AFTER trader_schema_additions.sql
-- =============================================================================

-- Attribution of a batch sale to a mobile-app trader (app_traders).
-- batch_sales.trader_id still references the legacy `traders` table via the
-- app trader's linked_trader_id; this column records the app trader directly.
ALTER TABLE batch_sales ADD COLUMN IF NOT EXISTS app_trader_id integer;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_batch_sales_app_trader_id'
    ) THEN
        ALTER TABLE batch_sales
            ADD CONSTRAINT fk_batch_sales_app_trader_id
            FOREIGN KEY (app_trader_id) REFERENCES app_traders(id)
            ON DELETE SET NULL;
    END IF;
END $$;