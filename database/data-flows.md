# Data Flows

> Candidate flows detected from files that touch more than one table.
> These are **inferred — needs verification**; curate them with real
> reasoning and evidence in the section below the generated block.

<!-- BEGIN GENERATED: flows -->
## Candidate flows (generated)

- `src/auth/trader_login.rs` touches: app_traders, traders
- `src/handlers/audit.rs` touches: app_traders, audit_log, orders, users
- `src/handlers/batch_requirements.rs` touches: batch_allocation_lines, batch_allocations, batch_requirements, batches, bird_count_history, inventory, inventory_movements, items, ledger_accounts, ledger_entries, stock_receipts, stock_returns
- `src/handlers/batch_sales.rs` touches: app_traders, batch_allocation_lines, batch_closure_summary, batch_sales, ledger_entries, post, purchases, stock_returns, trader_ledger_entries, traders
- `src/handlers/batches.rs` touches: audit_log, batch_allocation_lines, batch_allocations, batch_requirements, batches, farms, inventory, inventory_movements, items, ledger_accounts, ledger_entries, orders, production_lines, stock_receipts
- `src/handlers/bird_count_history.rs` touches: batches, bird_count_history, purchases
- `src/handlers/fetch_all.rs` touches: batch_allocation_lines, batch_allocations, batch_closure_summary, batch_requirements, batch_sales, batches, bird_count_history, bird_sell_history, farmer_commission_history, farmers, farms, inventory, inventory_movements, items, ledger_accounts, ledger_entries, loan_payments, loans, production_lines, purchases, stock_receipts, stock_returns, supplier_payments, suppliers, trader_payments, traders, users
- `src/handlers/fetch_by_id.rs` touches: batch_allocation_lines, batch_allocations, batch_requirements, batch_sales, batches, bird_count_history, farmer_commission_history, farmers, farms, stock_receipts, stock_returns, users
- `src/handlers/inserts.rs` touches: batch_allocations, batch_closure_summary, batch_requirements, batch_sales, batches, bird_count_history, bird_sell_history, farmer_commission_history, farmers, items, ledger_accounts, ledger_entries, production_lines, suppliers, traders
- `src/handlers/loans.rs` touches: ledger_entries, loan_payments, loans, purchases
- `src/handlers/metrics.rs` touches: batch_allocation_lines, batch_allocations, batch_closure_summary, batch_sales, batches, inventory, items, ledger_accounts, ledger_entries, metric_snapshots, other_expenses, stock_receipts
- `src/handlers/mod.rs` touches: batch_requirements, batch_sales, batches, bird_count_history, farms, loans, other_expenses, purchase_orders, purchases, suppliers, timeslots, traders
- `src/handlers/other_expenses.rs` touches: ledger_accounts, ledger_entries, other_expenses
- `src/handlers/purchase_orders.rs` touches: batch_allocation_lines, batches, inventory, inventory_movements, items, ledger_entries, orders, purchase_orders, purchases, stock_receipts, suppliers
- `src/handlers/purchases.rs` touches: inventory, inventory_movements, ledger_accounts, ledger_entries, purchases, stock_receipts
- `src/handlers/supervisor_app.rs` touches: app_traders, audit_log, batch_sales, batches, farms, orders, traders
- `src/handlers/suppliers.rs` touches: ledger_entries, purchases, supplier_payments, suppliers
- `src/handlers/timeslots.rs` touches: batches, timeslots
- `src/handlers/trader_app.rs` touches: app_traders, audit_log, batches, farms, orders, timeslots, trader_ledger_entries, trader_payments, traders, users
- `src/handlers/trader_ledger.rs` touches: app_traders, orders, trader_ledger_entries, traders
- `src/handlers/traders.rs` touches: batch_sales, ledger_entries, purchases, trader_payments
- `src/handlers/visibility.rs` touches: batch_allocations, batch_requirements, batches, bird_count_history, bird_sell_history, farmers, items, production_lines, purchases, suppliers, traders, users
- `src/models.rs` touches: farms, items, timeslots
- `src/pdf/batch_info.rs` touches: batch_sales, items
- `src/pdf/builder.rs` touches: batch_closure_summary, batch_sales, batches, bird_count_history, farmers
- `src/pdf/contexts.rs` touches: batch_allocation_lines, batches, bird_count_history, items, stock_receipts, stock_returns
- `src/routes/admin/admin.rs` touches: batch_requirements, post
- `src/routes/deletes.rs` touches: batch_sales, bird_count_history, loan_payments, loans, purchases
- `src/routes/fetch_all.rs` touches: batch_allocation_lines, batch_allocations, batch_closure_summary, batch_requirements, batch_sales, batches, bird_count_history, bird_sell_history, farmers, farms, inventory, inventory_movements, items, ledger_accounts, ledger_entries, loan_payments, loans, metric_snapshots, other_expenses, production_lines, purchase_orders, purchases, stock_receipts, stock_returns, suppliers, traders, users
- `src/routes/fetch_by_id.rs` touches: batches, bird_count_history, farms, post, stock_returns, supplier_payments, suppliers, timeslots, trader_payments, traders
- `src/routes/inserts.rs` touches: batch_allocations, batch_closure_summary, batch_requirements, batch_sales, batches, bird_count_history, bird_sell_history, farmers, farms, items, loans, other_expenses, post, production_lines, purchase_orders, purchases, stock_returns, suppliers, timeslots, traders
- `src/routes/ledger_app.rs` touches: post, traders
- `src/routes/supervisor_app.rs` touches: batches, orders, post, traders
- `src/routes/trader_app.rs` touches: batches, orders, post
<!-- END GENERATED: flows -->

## Curated flows

Describe the end-to-end flows with table names and evidence, for example:

```text
purchase (purchases) → stock_receipts → batch_allocation_lines → batches
```
