use axum::{
    routing::{get, post, put},
    Router,
};
use sea_orm::DatabaseConnection;

use crate::handlers::analytics::{
    delete_price_handler, get_forecast_handler, get_prices_handler, get_report_handler,
    get_status_handler, import_prices_handler, post_recompute_handler, put_price_handler,
};

pub fn analytics_routes() -> Router<DatabaseConnection> {
    Router::new()
        .route("/prices", get(get_prices_handler))
        .route("/prices/import", post(import_prices_handler))
        .route(
            "/prices/{date}",
            put(put_price_handler).delete(delete_price_handler),
        )
        .route("/status", get(get_status_handler))
        .route("/forecast", get(get_forecast_handler))
        .route("/report", get(get_report_handler))
        .route("/recompute", post(post_recompute_handler))
}
