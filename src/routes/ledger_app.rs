use axum::middleware::from_fn_with_state;
use axum::routing::{get, post};
use axum::Router;
use entity::sea_orm_active_enums::UserRole;
use sea_orm::DatabaseConnection;

use crate::auth::middleware::{require_roles_middleware, RequireRoles};
use crate::handlers::trader_ledger::{
    create_trader_payment_handler, trader_ledger_handler, trader_statement_handler,
};

pub fn ledger_routes() -> Router<DatabaseConnection> {
    Router::new()
        .route("/traders/{id}", get(trader_ledger_handler))
        .route(
            "/traders/{id}/payments",
            post(create_trader_payment_handler),
        )
        .route("/traders/{id}/statement", get(trader_statement_handler))
        .layer(from_fn_with_state(
            RequireRoles::new(&[UserRole::Admin, UserRole::Accountant, UserRole::Trader]),
            require_roles_middleware,
        ))
}
