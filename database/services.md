# Service → Database Ownership

> This repo is a Rust monolith (`src/handlers/*`, `src/routes/*`) plus a
> Next.js admin frontend and two out-of-repo apps (`rjagro_traders`,
> `rjagro_supervisor`). Ownership below is inferred from actual code
> references (entity imports and raw SQL) and is marked
> **needs verification** until confirmed by a human or agent.

<!-- BEGIN GENERATED: services -->
## Reference index (generated — needs verification)

| File | Tables referenced |
|---|---|
| `src/auth/login.rs` | `users` (r? 4) |
| `src/auth/trader_login.rs` | `app_traders` (rw? 11), `traders` (w? 1) |
| `src/handlers/audit.rs` | `app_traders` (r? 3), `audit_log` (r? 4), `orders` (r? 4), `users` (r? 3) |
| `src/handlers/batch_requirements.rs` | `batch_allocation_lines` (rw? 4), `batch_allocations` (rw? 4), `batch_requirements` (rw? 5), `batches` (rw? 7), `bird_count_history` (rw? 5), `inventory` (rw? 22), `inventory_movements` (w? 3), `items` (rw? 3), `ledger_accounts` (rw? 9), `ledger_entries` (w? 5), `stock_receipts` (rw? 6), `stock_returns` (w? 4) |
| `src/handlers/batch_sales.rs` | `app_traders` (rw? 2), `batch_allocation_lines` (rw? 3), `batch_closure_summary` (rw? 9), `batch_sales` (rw? 11), `ledger_entries` (rw? 10), `post` (w? 1), `purchases` (w? 2), `stock_returns` (rw? 3), `trader_ledger_entries` (w? 2), `traders` (ref 1) |
| `src/handlers/batches.rs` | `audit_log` (w? 2), `batch_allocation_lines` (rw? 3), `batch_allocations` (w? 3), `batch_requirements` (w? 2), `batches` (rw? 17), `farms` (r? 2), `inventory` (rw? 16), `inventory_movements` (w? 2), `items` (r? 2), `ledger_accounts` (rw? 5), `ledger_entries` (w? 3), `orders` (rw? 7), `production_lines` (r? 4), `stock_receipts` (rw? 8) |
| `src/handlers/bird_count_history.rs` | `batches` (rw? 3), `bird_count_history` (rw? 5), `purchases` (w? 1) |
| `src/handlers/farms.rs` | `farms` (rw? 5) |
| `src/handlers/fetch_all.rs` | `batch_allocation_lines` (r? 1), `batch_allocations` (r? 1), `batch_closure_summary` (r? 1), `batch_requirements` (r? 1), `batch_sales` (r? 2), `batches` (rw? 9), `bird_count_history` (r? 1), `bird_sell_history` (r? 1), `farmer_commission_history` (r? 3), `farmers` (r? 7), `farms` (r? 7), `inventory` (r? 3), `inventory_movements` (r? 1), `items` (r? 5), `ledger_accounts` (r? 2), `ledger_entries` (r? 1), `loan_payments` (r? 2), `loans` (r? 3), `production_lines` (r? 2), `purchases` (r? 5), `stock_receipts` (r? 3), `stock_returns` (r? 3), `supplier_payments` (r? 1), `suppliers` (r? 3), `trader_payments` (r? 1), `traders` (r? 3), `users` (rw? 10) |
| `src/handlers/fetch_by_id.rs` | `batch_allocation_lines` (r? 7), `batch_allocations` (ref 5), `batch_requirements` (r? 8), `batch_sales` (r? 4), `batches` (r? 2), `bird_count_history` (r? 3), `farmer_commission_history` (r? 5), `farmers` (r? 2), `farms` (r? 2), `stock_receipts` (r? 2), `stock_returns` (r? 5), `users` (r? 2) |
| `src/handlers/inserts.rs` | `batch_allocations` (w? 2), `batch_closure_summary` (rw? 5), `batch_requirements` (w? 2), `batch_sales` (r? 3), `batches` (rw? 6), `bird_count_history` (w? 3), `bird_sell_history` (w? 2), `farmer_commission_history` (w? 4), `farmers` (w? 2), `items` (w? 2), `ledger_accounts` (rw? 8), `ledger_entries` (w? 4), `production_lines` (w? 2), `suppliers` (w? 2), `traders` (w? 2) |
| `src/handlers/loans.rs` | `ledger_entries` (rw? 18), `loan_payments` (rw? 11), `loans` (rw? 15), `purchases` (w? 1) |
| `src/handlers/metrics.rs` | `batch_allocation_lines` (ref 1), `batch_allocations` (r? 2), `batch_closure_summary` (r? 6), `batch_sales` (r? 8), `batches` (r? 7), `inventory` (ref 1), `items` (ref 2), `ledger_accounts` (r? 3), `ledger_entries` (r? 7), `metric_snapshots` (rw? 20), `other_expenses` (r? 7), `stock_receipts` (ref 1) |
| `src/handlers/mod.rs` | `batch_requirements` (ref 1), `batch_sales` (ref 1), `batches` (ref 1), `bird_count_history` (ref 1), `farms` (ref 1), `loans` (ref 1), `other_expenses` (ref 1), `purchase_orders` (ref 1), `purchases` (ref 1), `suppliers` (ref 1), `timeslots` (ref 1), `traders` (ref 1) |
| `src/handlers/other_expenses.rs` | `ledger_accounts` (rw? 4), `ledger_entries` (w? 2), `other_expenses` (rw? 7) |
| `src/handlers/purchase_orders.rs` | `batch_allocation_lines` (r? 4), `batches` (ref 2), `inventory` (rw? 9), `inventory_movements` (rw? 3), `items` (rw? 16), `ledger_entries` (rw? 7), `orders` (r? 5), `purchase_orders` (rw? 7), `purchases` (rw? 10), `stock_receipts` (rw? 6), `suppliers` (rw? 6) |
| `src/handlers/purchases.rs` | `inventory` (rw? 18), `inventory_movements` (rw? 4), `ledger_accounts` (rw? 3), `ledger_entries` (rw? 9), `purchases` (rw? 12), `stock_receipts` (rw? 4) |
| `src/handlers/supervisor_app.rs` | `app_traders` (rw? 4), `audit_log` (w? 2), `batch_sales` (rw? 4), `batches` (rw? 7), `farms` (rw? 4), `orders` (rw? 32), `traders` (r? 3) |
| `src/handlers/suppliers.rs` | `ledger_entries` (w? 3), `purchases` (rw? 7), `supplier_payments` (rw? 11), `suppliers` (r? 1) |
| `src/handlers/timeslots.rs` | `batches` (rw? 2), `timeslots` (rw? 8) |
| `src/handlers/trader_app.rs` | `app_traders` (rw? 8), `audit_log` (w? 3), `batches` (rw? 11), `farms` (rw? 9), `orders` (rw? 25), `timeslots` (rw? 10), `trader_ledger_entries` (rw? 9), `trader_payments` (r? 1), `traders` (r? 2), `users` (rw? 6) |
| `src/handlers/trader_ledger.rs` | `app_traders` (rw? 2), `orders` (rw? 6), `trader_ledger_entries` (rw? 10), `traders` (ref 3) |
| `src/handlers/traders.rs` | `batch_sales` (rw? 8), `ledger_entries` (w? 3), `purchases` (w? 1), `trader_payments` (rw? 11) |
| `src/handlers/visibility.rs` | `batch_allocations` (w? 2), `batch_requirements` (w? 2), `batches` (w? 2), `bird_count_history` (w? 2), `bird_sell_history` (w? 2), `farmers` (w? 2), `items` (w? 2), `production_lines` (w? 2), `purchases` (w? 2), `suppliers` (w? 2), `traders` (w? 2), `users` (w? 1) |
| `src/main.rs` | `post` (ref 5) |
| `src/models.rs` | `farms` (ref 2), `items` (ref 1), `timeslots` (ref 1) |
| `src/pdf/bank_details.rs` | `items` (ref 1) |
| `src/pdf/basic_details.rs` | `items` (ref 1) |
| `src/pdf/batch_info.rs` | `batch_sales` (ref 7), `items` (ref 2) |
| `src/pdf/builder.rs` | `batch_closure_summary` (r? 3), `batch_sales` (r? 6), `batches` (r? 4), `bird_count_history` (r? 5), `farmers` (r? 3) |
| `src/pdf/contexts.rs` | `batch_allocation_lines` (r? 8), `batches` (r? 4), `bird_count_history` (r? 5), `items` (ref 3), `stock_receipts` (ref 3), `stock_returns` (r? 7) |
| `src/pdf/draw_header.rs` | `items` (ref 2) |
| `src/pdf/expanded_details.rs` | `items` (ref 2) |
| `src/pdf/footer.rs` | `items` (ref 2) |
| `src/routes/admin/admin.rs` | `batch_requirements` (ref 1), `post` (ref 2) |
| `src/routes/audit_app.rs` | `orders` (ref 1) |
| `src/routes/deletes.rs` | `batch_sales` (w? 2), `bird_count_history` (w? 2), `loan_payments` (w? 1), `loans` (w? 2), `purchases` (w? 2) |
| `src/routes/fetch_all.rs` | `batch_allocation_lines` (ref 1), `batch_allocations` (ref 1), `batch_closure_summary` (ref 1), `batch_requirements` (ref 1), `batch_sales` (ref 1), `batches` (ref 1), `bird_count_history` (ref 1), `bird_sell_history` (ref 1), `farmers` (ref 1), `farms` (ref 1), `inventory` (ref 1), `inventory_movements` (ref 1), `items` (ref 1), `ledger_accounts` (ref 1), `ledger_entries` (ref 1), `loan_payments` (ref 1), `loans` (ref 1), `metric_snapshots` (ref 1), `other_expenses` (ref 2), `production_lines` (ref 1), `purchase_orders` (ref 2), `purchases` (ref 1), `stock_receipts` (ref 1), `stock_returns` (ref 1), `suppliers` (ref 1), `traders` (ref 1), `users` (ref 1) |
| `src/routes/fetch_by_id.rs` | `batches` (ref 2), `bird_count_history` (ref 1), `farms` (ref 2), `post` (ref 2), `stock_returns` (ref 1), `supplier_payments` (ref 1), `suppliers` (ref 1), `timeslots` (ref 2), `trader_payments` (ref 1), `traders` (ref 1) |
| `src/routes/inserts.rs` | `batch_allocations` (ref 1), `batch_closure_summary` (ref 1), `batch_requirements` (ref 2), `batch_sales` (ref 2), `batches` (ref 6), `bird_count_history` (ref 1), `bird_sell_history` (ref 1), `farmers` (ref 1), `farms` (ref 2), `items` (ref 1), `loans` (ref 1), `other_expenses` (ref 2), `post` (ref 30), `production_lines` (ref 1), `purchase_orders` (ref 2), `purchases` (ref 2), `stock_returns` (ref 1), `suppliers` (ref 2), `timeslots` (ref 2), `traders` (ref 2) |
| `src/routes/ledger_app.rs` | `post` (ref 2), `traders` (ref 3) |
| `src/routes/supervisor_app.rs` | `batches` (ref 2), `orders` (w? 8), `post` (w? 2), `traders` (ref 1) |
| `src/routes/trader_app.rs` | `batches` (ref 2), `orders` (ref 4), `post` (ref 3) |
| `src/routes/updates.rs` | `purchase_orders` (ref 2) |
<!-- END GENERATED: services -->

## Curated ownership

Confirm the writer(s) and reader(s) for each table here, with evidence:

```text
## <module or app>
Writes: <table> (<evidence file>)
Reads:  <table> (<evidence file>)
```
