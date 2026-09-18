# 2026-08-05 — trader_schema_additions.sql

## Change

- Added enum `ledger_entry_type`
- Added enum `payment_mode`
- Added table `trader_ledger_entries`
- Added index `idx_trader_ledger_entries_trader_id`
- Added column `users.phone`

## Reason

Unknown — see `trader_schema_additions.sql` and git history.

## Impact

Documentation generated during bootstrap; verify against the live database.

## Migration

`trader_schema_additions.sql`
