use axum::{
    routing::{get, post},
    Router,
};
use sea_orm::DatabaseConnection;

use crate::{
    handlers::{
        fetch_by_id::{
            get_accepted_allocations_handler, get_batch_by_id_handler,
            get_farmer_commission_history_by_id_handler, get_sales_by_batch_id_handler,
            get_stock_return_unit_cost, get_stock_returns_by_batch_id_handler,
        },
        suppliers::{
            get_supplier_ledger_handler, get_supplier_payables, get_supplier_payments_byid_handler,
        },
        traders::{get_trader_ledger_handler, get_trader_payments, get_trader_receivables},
    },
    pdf::draw_header::generate_pdf_handler,
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
        .route("/trader_receivables/{id}", get(get_trader_receivables))
        .route("/trader_payments/{id}", get(get_trader_payments))
        .route("/trader_ledger/{id}", get(get_trader_ledger_handler))
        .route("/batches/{id}", get(get_batch_by_id_handler))
        .route("/sales/{id}", get(get_sales_by_batch_id_handler))
        .route(
            "/accepted_allocations/{id}",
            get(get_accepted_allocations_handler),
        )
        .route("/growing_charges", post(generate_pdf_handler))
}
