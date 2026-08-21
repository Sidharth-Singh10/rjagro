use axum::middleware::from_fn_with_state;
use axum::{routing::patch, Router};
use entity::sea_orm_active_enums::UserRole;
use sea_orm::DatabaseConnection;

use crate::auth::middleware::{require_roles_middleware, RequireRoles};
use crate::handlers::purchase_orders::update_purchase_order;

pub fn update_routes() -> Router<DatabaseConnection> {
    Router::new()
        .route("/purchase_orders/{id}", patch(update_purchase_order))
        .layer(from_fn_with_state(
            RequireRoles::new(&[UserRole::Admin]),
            require_roles_middleware,
        ))
}