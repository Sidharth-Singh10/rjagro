use axum::middleware::from_fn_with_state;
use axum::routing::get;
use axum::Router;
use entity::sea_orm_active_enums::UserRole;
use sea_orm::DatabaseConnection;

use crate::auth::middleware::{require_roles_middleware, RequireRoles};
use crate::handlers::backups::list_backups;

/// Backup history is operational data: admins only.
/// The dashboard page that renders it is already admin-gated, this keeps the
/// API from being readable by every authenticated trader.
pub fn backups_routes() -> Router<DatabaseConnection> {
    Router::new()
        .route("/", get(list_backups))
        .route("/runs", get(list_backups))
        .layer(from_fn_with_state(
            RequireRoles::new(&[UserRole::Admin]),
            require_roles_middleware,
        ))
}
