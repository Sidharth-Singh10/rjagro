use axum::middleware::from_fn_with_state;
use axum::{routing::delete, Router};
use entity::sea_orm_active_enums::UserRole;
use sea_orm::DatabaseConnection;

use crate::auth::middleware::{require_roles_middleware, RequireRoles};
use crate::handlers::batch_sales::delete_batch_sale;
use crate::handlers::bird_count_history::delete_bird_count_history;
use crate::handlers::loans::{delete_loan, delete_loan_payment};
use crate::handlers::purchases::delete_purchase;
use crate::handlers::purchase_orders::delete_purchase_order;

pub fn delete_routes() -> Router<DatabaseConnection> {
    Router::new()
        .route("/purchases/{id}", delete(delete_purchase))
        .route("/purchase_orders/{id}", delete(delete_purchase_order))
        .route("/batch_sales/{id}", delete(delete_batch_sale))
        .route(
            "/bird_count_history/{id}",
            delete(delete_bird_count_history),
        )
        .route("/loans/{id}", delete(delete_loan))
        .route("/loan_payments/{id}", delete(delete_loan_payment))
        .layer(from_fn_with_state(
            RequireRoles::new(&[UserRole::Admin]),
            require_roles_middleware,
        ))
}
