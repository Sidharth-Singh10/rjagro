use axum::{middleware, routing::get, Router};
use sea_orm::DatabaseConnection;

use crate::{
    auth::middleware::{require_roles_middleware, RequireRoles},
    handlers::fetch_all::{
        get_all_farmer_commission_history_handler, get_batch_allocation_lines_handler,
        get_batch_allocations_handler, get_batch_closure_summary_handler,
        get_batch_requirements_handler, get_batch_sales_handler, get_batches_handler,
        get_bird_count_history_handler, get_bird_sell_history_handler, get_farmers_handler,
        get_inventory_handler, get_inventory_movements_handler, get_items_handler,
        get_ledger_accounts_handler, get_ledger_entries_handler, get_paginated_returns_handler,
        get_production_lines_handler, get_purchases_handler, get_stock_receipts_handler,
        get_supervisors_handler, get_suppliers_handler, get_traders_handler, get_users_handler,
    },
    pdf::draw_header::generate_pdf_handler,
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
        .route("/growing_charges", get(generate_pdf_handler))
}
