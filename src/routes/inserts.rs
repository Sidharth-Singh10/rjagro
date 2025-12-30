use axum::middleware::from_fn_with_state;
use axum::{routing::post, Router};
use entity::sea_orm_active_enums::UserRole;
use sea_orm::DatabaseConnection;

use crate::handlers::batch_requirements::create_stock_return;
use crate::handlers::batch_sales::create_batch_sale;
use crate::handlers::batches::create_batch;
use crate::handlers::inserts::{
    create_batch_closure_summary, create_farmer_commission, create_ledger_entry,
};
use crate::handlers::suppliers::create_supplier_payment;
use crate::{
    auth::middleware::{require_roles_middleware, RequireRoles},
    handlers::{
        inserts::{
            create_batch_allocation, create_batch_requirement, create_bird_count_history,
            create_bird_sell_history, create_farmer, create_item, create_ledger_account,
            create_production_line, create_supplier, create_trader,
        },
        purchases::create_purchase,
    },
};

pub fn insert_routes() -> Router<DatabaseConnection> {
    Router::new()
        .route("/ledger_account", post(create_ledger_account))
        .route("/batch_closure_summary", post(create_batch_closure_summary))
        .route("/batch_sales", post(create_batch_sale))
        .route("/ledger_entry", post(create_ledger_entry))
        .layer(from_fn_with_state(
            RequireRoles::new(&[UserRole::Admin]),
            require_roles_middleware,
        ))
        .route("/production_lines", post(create_production_line))
        .route("/purchases", post(create_purchase))
        .route("/items", post(create_item))
        .route("/batches", post(create_batch))
        .route("/batch_requirements", post(create_batch_requirement))
        .route("/batch_allocations", post(create_batch_allocation))
        .route("/farmers", post(create_farmer))
        .route("/traders", post(create_trader))
        .route("/suppliers", post(create_supplier))
        .route("/bird_count_history", post(create_bird_count_history))
        .route("/bird_sell_history", post(create_bird_sell_history))
        .route("/farmer_commission", post(create_farmer_commission))
        .route("/stock_returns", post(create_stock_return))
        .route("/supplier_payment", post(create_supplier_payment))
}
