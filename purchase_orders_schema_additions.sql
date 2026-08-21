-- =============================================================================
-- Multi-item Purchase Orders schema additions
-- Apply AFTER running rjagro_schema_backup.sql on a fresh database.
-- This script is idempotent — safe to run multiple times.
-- =============================================================================

-- Purchase order header. A single purchase order groups one or more line items
-- (each line remains a row in the existing `purchases` table).
CREATE TABLE IF NOT EXISTS purchase_orders (
    purchase_order_id  integer NOT NULL,
    supplier_id        integer NOT NULL,
    purchase_date      date NOT NULL,
    payment_type       public.payment_type,
    created_by         integer NOT NULL,
    total_cost         numeric(12,2) NOT NULL DEFAULT 0
);

CREATE SEQUENCE IF NOT EXISTS purchase_orders_purchase_order_id_seq
    AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE purchase_orders_purchase_order_id_seq OWNED BY purchase_orders.purchase_order_id;

ALTER TABLE purchase_orders
    ALTER COLUMN purchase_order_id SET DEFAULT nextval('purchase_orders_purchase_order_id_seq'::regclass);

ALTER TABLE ONLY purchase_orders
    ADD CONSTRAINT purchase_orders_pkey PRIMARY KEY (purchase_order_id);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier_id ON purchase_orders(supplier_id);

-- Link existing line-items table to the order header (nullable for legacy rows).
ALTER TABLE purchases
    ADD COLUMN IF NOT EXISTS purchase_order_id integer;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_purchases_purchase_order'
    ) THEN
        ALTER TABLE purchases
            ADD CONSTRAINT fk_purchases_purchase_order
            FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(purchase_order_id)
            ON UPDATE CASCADE ON DELETE RESTRICT;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_purchases_purchase_order_id ON purchases(purchase_order_id);
