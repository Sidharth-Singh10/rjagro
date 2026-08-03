use axum::middleware::from_fn_with_state;
use axum::routing::get;
use axum::Router;
use entity::sea_orm_active_enums::UserRole;
use sea_orm::DatabaseConnection;

use crate::auth::middleware::{require_roles_middleware, RequireRoles};
use crate::handlers::audit::get_order_audit_log_handler;

pub fn audit_routes() -> Router<DatabaseConnection> {
    Router::new()
        .route("/orders/{id}/audit-log", get(get_order_audit_log_handler))
        .layer(from_fn_with_state(
            RequireRoles::new(&[
                UserRole::Admin,
                UserRole::Accountant,
                UserRole::Supervisor,
                UserRole::Trader,
            ]),
            require_roles_middleware,
        ))
}
