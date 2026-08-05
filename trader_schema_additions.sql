-- =============================================================================
-- Live-selling platform schema additions
-- Apply AFTER running rjagro_schema_backup.sql on a fresh database.
-- This script is idempotent — safe to run multiple times.
-- =============================================================================

-- Per-trader ledger (separate from the main double-entry ledger_entries table)
-- Debits are derived from CONFIRMED orders.total_amount on read;
-- this table stores only manual payment entries.

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ledger_entry_type') THEN
        CREATE TYPE ledger_entry_type AS ENUM ('debit', 'payment');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_mode') THEN
        CREATE TYPE payment_mode AS ENUM ('cash', 'bank');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS trader_ledger_entries (
    id              integer NOT NULL,
    trader_id       integer NOT NULL,
    order_id        integer,
    type            ledger_entry_type NOT NULL,
    amount          numeric(18,2) NOT NULL,
    payment_mode    payment_mode,
    screenshot_url  text,
    created_at      timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE SEQUENCE IF NOT EXISTS trader_ledger_entries_id_seq
    AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE trader_ledger_entries_id_seq OWNED BY trader_ledger_entries.id;

ALTER TABLE trader_ledger_entries
    ALTER COLUMN id SET DEFAULT nextval('trader_ledger_entries_id_seq'::regclass);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'trader_ledger_entries_pkey'
    ) THEN
        ALTER TABLE ONLY trader_ledger_entries
            ADD CONSTRAINT trader_ledger_entries_pkey PRIMARY KEY (id);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'trader_ledger_entries_trader_id_fkey'
    ) THEN
        ALTER TABLE ONLY trader_ledger_entries
            ADD CONSTRAINT trader_ledger_entries_trader_id_fkey FOREIGN KEY (trader_id)
            REFERENCES app_traders(id);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'trader_ledger_entries_order_id_fkey'
    ) THEN
        ALTER TABLE ONLY trader_ledger_entries
            ADD CONSTRAINT trader_ledger_entries_order_id_fkey FOREIGN KEY (order_id)
            REFERENCES orders(order_id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_trader_ledger_entries_trader_id
    ON trader_ledger_entries(trader_id);

-- Supervisor phone (users table)
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone varchar(15) NULL;
