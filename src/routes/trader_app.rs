use axum::middleware::from_fn_with_state;
use axum::routing::{get, post};
use axum::Router;
use entity::sea_orm_active_enums::UserRole;
use sea_orm::DatabaseConnection;

use crate::auth::middleware::{require_roles_middleware, RequireRoles};
use crate::handlers::trader_app::{
    batch_detail_handler, cancel_order_handler, create_order_handler, credit_summary_handler,
    list_orders_handler, live_batches_handler, me_handler, order_detail_handler,
};

pub fn trader_app_routes() -> Router<DatabaseConnection> {
    Router::new()
        .route("/me", get(me_handler))
        .route("/credit-summary", get(credit_summary_handler))
        .route("/batches/live", get(live_batches_handler))
        .route("/batches/{id}", get(batch_detail_handler))
        .route("/orders", get(list_orders_handler))
        .route("/orders", post(create_order_handler))
        .route("/orders/{id}", get(order_detail_handler))
        .route("/orders/{id}/cancel", post(cancel_order_handler))
        .layer(from_fn_with_state(
            RequireRoles::new(&[UserRole::Trader]),
            require_roles_middleware,
        ))
}
