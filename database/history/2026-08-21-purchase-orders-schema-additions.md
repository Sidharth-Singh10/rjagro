# 2026-08-21 — purchase_orders_schema_additions.sql

## Change

- Added table `purchase_orders`
- Added index `idx_purchase_orders_supplier_id`
- Added column `purchases.purchase_order_id`
- Added index `idx_purchases_purchase_order_id`

## Reason

Unknown — see `purchase_orders_schema_additions.sql` and git history.

## Impact

Documentation generated during bootstrap; verify against the live database.

## Migration

`purchase_orders_schema_additions.sql`
