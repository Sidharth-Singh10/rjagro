use std::collections::HashMap;

use crate::models::AuditLogView;
use axum::{
    extract::{Extension, Path, State},
    http::StatusCode,
    Json,
};
use entity::sea_orm_active_enums::UserRole;
use entity::{app_traders, audit_log, orders, users};
use sea_orm::{ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter, QueryOrder};

fn authorize(role: &UserRole, sub: &str, order: &orders::Model) -> Result<(), StatusCode> {
    match role {
        UserRole::Admin | UserRole::Accountant | UserRole::Supervisor => Ok(()),
        UserRole::Trader => {
            let uid = sub.parse::<i32>().map_err(|_| StatusCode::UNAUTHORIZED)?;
            if uid == order.trader_id {
                Ok(())
            } else {
                Err(StatusCode::FORBIDDEN)
            }
        }
    }
}

/// GET /orders/{id}/audit-log
pub async fn get_order_audit_log_handler(
    State(db): State<DatabaseConnection>,
    Path(order_id): Path<i32>,
    Extension(sub): Extension<String>,
    Extension(role): Extension<UserRole>,
) -> Result<Json<Vec<AuditLogView>>, StatusCode> {
    let order = orders::Entity::find_by_id(order_id)
        .one(&db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .ok_or(StatusCode::NOT_FOUND)?;

    authorize(&role, &sub, &order)?;

    let logs = audit_log::Entity::find()
        .filter(audit_log::Column::OrderId.eq(order_id))
        .order_by_asc(audit_log::Column::CreatedAt)
        .all(&db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let trader_ids: Vec<i32> = logs
        .iter()
        .filter(|l| l.actor_type == "trader")
        .map(|l| l.actor_id)
        .collect();
    let user_ids: Vec<i32> = logs
        .iter()
        .filter(|l| l.actor_type != "trader" && l.actor_type != "system")
        .map(|l| l.actor_id)
        .collect();

    let trader_names: HashMap<i32, String> = if trader_ids.is_empty() {
        HashMap::new()
    } else {
        app_traders::Entity::find()
            .filter(app_traders::Column::Id.is_in(trader_ids))
            .all(&db)
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
            .into_iter()
            .map(|t| (t.id, t.name))
            .collect()
    };

    let user_names: HashMap<i32, String> = if user_ids.is_empty() {
        HashMap::new()
    } else {
        users::Entity::find()
            .filter(users::Column::UserId.is_in(user_ids))
            .all(&db)
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
            .into_iter()
            .map(|u| (u.user_id, u.name))
            .collect()
    };

    let response = logs
        .into_iter()
        .map(|l| {
            let actor_name = match l.actor_type.as_str() {
                "trader" => trader_names.get(&l.actor_id).cloned(),
                "system" => None,
                _ => user_names.get(&l.actor_id).cloned(),
            };
            AuditLogView {
                audit_id: l.audit_id,
                order_id: l.order_id,
                actor_type: l.actor_type,
                actor_id: l.actor_id,
                actor_name,
                action: l.action,
                field_changed: l.field_changed,
                old_value: l.old_value,
                new_value: l.new_value,
                created_at: l.created_at,
            }
        })
        .collect();

    Ok(Json(response))
}
