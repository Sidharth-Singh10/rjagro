# Relationships

> The foreign-key list is generated; refresh it with `./db-knowledge sync`.
> Add curated, non-FK relationships below the generated block.

<!-- BEGIN GENERATED: fk-list -->
- **app_supervisors**
- **app_traders**
  - → traders
  - ← batch_sales, orders, trader_ledger_entries
- **audit_log**
  - → orders
- **batch_allocation_lines**
  - → batch_allocations, batches, stock_receipts
  - ← stock_returns
- **batch_allocations**
  - → batch_requirements, users
  - ← batch_allocation_lines
- **batch_closure_summary**
  - → batches
- **batch_requirements**
  - → batches, items, production_lines, users
  - ← batch_allocations
- **batch_sales**
  - → app_traders, batches, items, traders
- **batches**
  - → farmers, farms, production_lines, users
  - ← batch_allocation_lines, batch_closure_summary, batch_requirements, batch_sales, bird_count_history, bird_sell_history, orders, stock_returns, timeslots
- **bird_count_history**
  - → batches
- **bird_sell_history**
  - → batches, traders
- **farmer_commission_history**
  - → farmers
- **farmers**
  - ← batches, farmer_commission_history, farms
- **farms**
  - → farmers
  - ← batches
- **inventory**
  - → items
- **inventory_movements**
  - → items
- **items**
  - ← batch_requirements, batch_sales, inventory, inventory_movements, purchases, stock_receipts
- **ledger_accounts**
  - ← ledger_entries
- **ledger_entries**
  - → ledger_accounts, users
- **loan_payments**
  - → loans, users
- **loans**
  - → users
  - ← loan_payments
- **metric_snapshots**
- **orders**
  - → app_traders, batches, timeslots
  - ← audit_log, trader_ledger_entries
- **other_expenses**
  - → users
- **post**
- **production_lines**
  - → users
  - ← batch_requirements, batches
- **purchase_orders**
  - ← purchases
- **purchases**
  - → items, purchase_orders, suppliers, users
  - ← stock_receipts
- **seaql_migrations**
- **stock_receipts**
  - → items, purchases
  - ← batch_allocation_lines
- **stock_returns**
  - → batch_allocation_lines, batches
- **supplier_payments**
  - → suppliers
- **suppliers**
  - ← purchases, supplier_payments
- **timeslots**
  - → batches
  - ← orders
- **trader_ledger_entries**
  - → app_traders, orders
- **trader_payments**
  - → traders, users
- **traders**
  - ← app_traders, batch_sales, bird_sell_history, trader_payments
- **users**
  - ← batch_allocations, batch_requirements, batches, ledger_entries, loan_payments, loans, other_expenses, production_lines, purchases, trader_payments
<!-- END GENERATED: fk-list -->

## Curated relationships

Document logical (non-FK) links here, for example ledger entries that point
at source rows through `reference_table` / `reference_id`, or payments that
are recorded in separate tables for legacy and app traders.
