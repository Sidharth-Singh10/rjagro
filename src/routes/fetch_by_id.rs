use axum::{routing::get, Router};
use sea_orm::DatabaseConnection;

use crate::handlers::fetch_by_id::{
    get_stock_return_unit_cost, get_farmer_commission_history_by_id_handler,
    get_stock_returns_by_batch_id_handler,
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
}
