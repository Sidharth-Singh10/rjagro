use axum::{routing::get, Router};
use sea_orm::DatabaseConnection;

use crate::handlers::{
    fetch_by_id::{
        get_farmer_commission_history_by_id_handler, get_stock_return_unit_cost,
        get_stock_returns_by_batch_id_handler,
    },
    suppliers::{get_supplier_ledger_handler, get_supplier_payables, get_supplier_payments_byid_handler},
};

pub fn fetch_by_id() -> Router<DatabaseConnection> {
    Router::new()
        .route(
            "/farmer_commission/{id}",
            get(get_farmer_commission_history_by_id_handler),
        )
        .route(
            "/stock_returns/{id}",
            get(get_stock_returns_by_batch_id_handler),
        )
        .route(
            "/get_stock_return_unit_cost/bid/{id}/{item_code}",
            get(get_stock_return_unit_cost),
        )
        .route("/get_supplier_payables/{id}", get(get_supplier_payables))
        .route(
            "/supplier_payments/{id}",
            get(get_supplier_payments_byid_handler),
        )
        .route("/supplier_ledger/{id}", get(get_supplier_ledger_handler))
}
