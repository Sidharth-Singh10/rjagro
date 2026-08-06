use axum::middleware::from_fn_with_state;
use axum::routing::{delete, get, patch, post};
use axum::Router;
use entity::sea_orm_active_enums::UserRole;
use sea_orm::DatabaseConnection;

use crate::auth::middleware::{require_roles_middleware, RequireRoles};
use crate::handlers::supervisor_app::{
    all_app_traders_handler, all_orders_handler, clear_weight_handler, close_order_handler,
    confirm_queue_handler, enter_weight_handler, order_detail_handler, pending_orders_handler,
    reject_order_handler, supervisor_batches_handler,
};

pub fn supervisor_app_routes() -> Router<DatabaseConnection> {
    Router::new()
        .route("/batches", get(supervisor_batches_handler))
        .route("/batches/{id}/pending-orders", get(pending_orders_handler))
        .route("/traders", get(all_app_traders_handler))
        .route("/orders", get(all_orders_handler))
        .route("/orders/confirm-queue", get(confirm_queue_handler))
        .route("/orders/{id}", get(order_detail_handler))
        .route("/orders/{id}/weight", patch(enter_weight_handler))
        .route("/orders/{id}/weight", delete(clear_weight_handler))
        .route("/orders/{id}/close", patch(close_order_handler))
        .route("/orders/{id}/reject", post(reject_order_handler))
        .layer(from_fn_with_state(
            RequireRoles::new(&[UserRole::Supervisor, UserRole::Admin]),
            require_roles_middleware,
        ))
}
