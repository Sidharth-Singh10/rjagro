-- =============================================================================
-- Indexes for the growing ledger / inventory / order tables
-- Apply AFTER running rjagro_schema_backup.sql on a fresh database.
-- This script is idempotent — safe to run multiple times.
-- =============================================================================

-- Ledger screen pagination/sorting and the metrics job's date filters.
CREATE INDEX IF NOT EXISTS idx_ledger_entries_txn_date
    ON public.ledger_entries (txn_date DESC);

-- Source-document lookups (expenses, purchases, sales, payments ...).
CREATE INDEX IF NOT EXISTS idx_ledger_entries_reference
    ON public.ledger_entries (reference_table, reference_id);

-- Inventory screen lookups by item over time.
CREATE INDEX IF NOT EXISTS idx_inventory_movements_item_date
    ON public.inventory_movements (item_code, movement_date);

-- Batch daily bird counts.
CREATE INDEX IF NOT EXISTS idx_bird_count_history_batch_date
    ON public.bird_count_history (batch_id, record_date);

-- Metrics job (created_at range scan) and per-batch sales lookups.
CREATE INDEX IF NOT EXISTS idx_batch_sales_created_at
    ON public.batch_sales (created_at);
CREATE INDEX IF NOT EXISTS idx_batch_sales_batch_id
    ON public.batch_sales (batch_id);

-- The metrics feed query filters allocations by allocation_date.
CREATE INDEX IF NOT EXISTS idx_batch_allocations_allocation_date
    ON public.batch_allocations (allocation_date);

-- Stock receipt lookups per item.
CREATE INDEX IF NOT EXISTS idx_stock_receipts_item_code
    ON public.stock_receipts (item_code);

-- Order audit log lookups by order.
CREATE INDEX IF NOT EXISTS idx_audit_log_order_id
    ON public.audit_log (order_id);

-- Trader/supervisor app order lists and the pending confirm queue.
CREATE INDEX IF NOT EXISTS idx_orders_trader_created
    ON public.orders (trader_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status_created
    ON public.orders (status, created_at);
