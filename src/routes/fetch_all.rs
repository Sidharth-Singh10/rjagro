use axum::{middleware, routing::get, Router};
use sea_orm::DatabaseConnection;

use crate::{
    auth::middleware::{require_roles_middleware, RequireRoles},
    handlers::aggregates::{
        allocation_batch_costs_handler, allocation_category_totals_handler, allocation_fcr_handler,
        batch_feed_lines_handler, feed_summary_handler,
    },
    handlers::fetch_all::{
        get_all_farmer_commission_history_handler, get_batch_allocation_lines_handler,
        get_batch_allocation_lines_paginated_handler, get_batch_allocations_handler,
        get_batch_allocations_paginated_handler, get_batch_closure_summary_handler,
        get_batch_requirements_handler, get_batch_sales_handler, get_batches_handler,
        get_bird_count_history_handler, get_bird_sell_history_handler, get_farmers_handler,
        get_farms_handler, get_inventory_handler, get_inventory_movements_handler,
        get_inventory_movements_paginated_handler, get_items_handler, get_ledger_accounts_handler,
        get_ledger_entries_handler, get_ledger_entries_paginated_handler,
        get_ledger_entries_summary_handler, get_loan_payments_handler, get_loans_handler,
        get_paginated_returns_handler, get_production_lines_handler,
        get_purchase_order_lines_handler, get_purchases_handler, get_purchases_paginated_handler,
        get_stock_receipts_handler, get_stock_receipts_paginated_handler,
        get_supervisors_handler, get_supplier_payment_totals_handler, get_suppliers_handler,
        get_trader_payment_totals_handler, get_traders_handler, get_users_handler,
    },
    handlers::other_expenses::{
        get_all_other_expenses_handler, get_other_expenses_paginated_handler,
        get_other_expenses_summary_handler,
    },
    handlers::metrics::get_metric_snapshots_handler,
    handlers::purchase_orders::get_purchase_orders,
};
use entity::sea_orm_active_enums::UserRole;

pub fn fetch_all() -> Router<DatabaseConnection> {
    Router::new()
        .route("/users", get(get_users_handler))
        .route("/supervisors", get(get_supervisors_handler))
        .route("/ledger_entries", get(get_ledger_entries_handler))
        .route("/stock_receipts", get(get_stock_receipts_handler))
        .route("/ledger_accounts", get(get_ledger_accounts_handler))
        .route("/batch_sales", get(get_batch_sales_handler))
        .route(
            "/batch_closure_summary",
            get(get_batch_closure_summary_handler),
        )
        .route(
            "/batch_allocation_lines",
            get(get_batch_allocation_lines_handler),
        )
        .layer(middleware::from_fn_with_state(
            RequireRoles::new(&[UserRole::Admin]),
            require_roles_middleware,
        ))
        .route("/production_lines", get(get_production_lines_handler))
        .route("/purchases", get(get_purchases_handler))
        .route("/purchase_orders", get(get_purchase_orders))
        .route("/farms", get(get_farms_handler))
        .route("/batches", get(get_batches_handler))
        .route("/batch_requirements", get(get_batch_requirements_handler))
        .route("/batch_allocations", get(get_batch_allocations_handler))
        .route("/farmers", get(get_farmers_handler))
        .route("/traders", get(get_traders_handler))
        .route("/suppliers", get(get_suppliers_handler))
        .route("/bird_count_history", get(get_bird_count_history_handler))
        .route("/bird_sell_history", get(get_bird_sell_history_handler))
        .route("/items", get(get_items_handler))
        .route("/inventory", get(get_inventory_handler))
        .route("/inventory_movements", get(get_inventory_movements_handler))
        .route(
            "/farmer_commission",
            get(get_all_farmer_commission_history_handler),
        )
        .route("/stock_returns", get(get_paginated_returns_handler))
        .route("/loans", get(get_loans_handler))
        .route("/loan_payments", get(get_loan_payments_handler))
        .route("/other_expenses", get(get_all_other_expenses_handler))
        .route(
            "/other_expenses/paginated",
            get(get_other_expenses_paginated_handler),
        )
        .route(
            "/other_expenses/summary",
            get(get_other_expenses_summary_handler),
        )
        .route(
            "/ledger_entries/paginated",
            get(get_ledger_entries_paginated_handler),
        )
        .route(
            "/ledger_entries/summary",
            get(get_ledger_entries_summary_handler),
        )
        .route(
            "/supplier_payments/totals",
            get(get_supplier_payment_totals_handler),
        )
        .route(
            "/trader_payments/totals",
            get(get_trader_payment_totals_handler),
        )
        .route(
            "/inventory_movements/paginated",
            get(get_inventory_movements_paginated_handler),
        )
        .route(
            "/stock_receipts/paginated",
            get(get_stock_receipts_paginated_handler),
        )
        .route(
            "/purchases/paginated",
            get(get_purchases_paginated_handler),
        )
        .route(
            "/purchases/order/{order_id}",
            get(get_purchase_order_lines_handler),
        )
        .route(
            "/batch_allocation_lines/paginated",
            get(get_batch_allocation_lines_paginated_handler),
        )
        .route(
            "/batch_allocations/paginated",
            get(get_batch_allocations_paginated_handler),
        )
        .route("/inventory/feed_summary", get(feed_summary_handler))
        .route(
            "/allocations/category_totals",
            get(allocation_category_totals_handler),
        )
        .route(
            "/allocations/batch_costs",
            get(allocation_batch_costs_handler),
        )
        .route("/allocations/fcr", get(allocation_fcr_handler))
        .route(
            "/allocations/batch_feed/{batch_id}",
            get(batch_feed_lines_handler),
        )
        .route("/metric_snapshots", get(get_metric_snapshots_handler))
}
