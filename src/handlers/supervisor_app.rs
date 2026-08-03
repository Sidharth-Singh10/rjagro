use std::collections::HashMap;

use crate::handlers::trader_app::{
    build_order_response, build_order_responses, order_status_str,
};
use crate::models::{
    CloseOrderPayload, OrderResponse, RejectOrderPayload, SupervisorBatchResponse, TraderOrderQuery,
    WeightPayload,
};
use axum::{
    extract::{Extension, Path, Query, State},
    http::StatusCode,
    Json,
};
use chrono::Utc;
use entity::sea_orm_active_enums::{BatchStatus, OrderStatus};
use entity::{audit_log, batches, farms, orders};
use sea_orm::prelude::Decimal;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, ConnectionTrait, DatabaseConnection, EntityTrait, QueryFilter,
    QueryOrder, Set, TransactionTrait,
};

fn parse_batch_status(raw: &str) -> Option<BatchStatus> {
    match raw.to_lowercase().as_str() {
        "open" => Some(BatchStatus::Open),
        "live" => Some(BatchStatus::Live),
        "closed" => Some(BatchStatus::Closed),
        _ => None,
    }
}

fn supervisor_id_from_sub(sub: &str) -> Result<i32, StatusCode> {
    sub.parse::<i32>().map_err(|_| StatusCode::UNAUTHORIZED)
}

async fn write_audit<C: ConnectionTrait>(
    txn: &C,
    order_id: i32,
    actor_id: i32,
    action: &str,
    field: Option<&str>,
    old: Option<&str>,
    new: Option<&str>,
) -> Result<(), StatusCode> {
    let row = audit_log::ActiveModel {
        order_id: Set(order_id),
        actor_type: Set("supervisor".to_string()),
        actor_id: Set(actor_id),
        action: Set(action.to_string()),
        field_changed: Set(field.map(String::from)),
        old_value: Set(old.map(String::from)),
        new_value: Set(new.map(String::from)),
        ..Default::default()
    };
    row.insert(txn)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    Ok(())
}

/// GET /supervisor/batches?status=
pub async fn supervisor_batches_handler(
    State(db): State<DatabaseConnection>,
    Query(params): Query<TraderOrderQuery>,
) -> Result<Json<Vec<SupervisorBatchResponse>>, StatusCode> {
    let mut query = batches::Entity::find();
    if let Some(raw) = params.status {
        let status = parse_batch_status(&raw).ok_or(StatusCode::BAD_REQUEST)?;
        query = query.filter(batches::Column::Status.eq(status));
    }

    let batch_list = query
        .order_by_desc(batches::Column::CreatedAt)
        .all(&db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let farm_ids: Vec<i32> = batch_list.iter().filter_map(|b| b.farm_id).collect();
    let farms_map: HashMap<i32, farms::Model> = if farm_ids.is_empty() {
        HashMap::new()
    } else {
        farms::Entity::find()
            .filter(farms::Column::FarmId.is_in(farm_ids))
            .all(&db)
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
            .into_iter()
            .map(|f| (f.farm_id, f))
            .collect()
    };

    let batch_ids: Vec<i32> = batch_list.iter().map(|b| b.batch_id).collect();
    let mut pending_count: HashMap<i32, i32> = HashMap::new();
    if !batch_ids.is_empty() {
        let pending = orders::Entity::find()
            .filter(orders::Column::BatchId.is_in(batch_ids))
            .filter(orders::Column::Status.eq(OrderStatus::Pending))
            .all(&db)
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
        for o in pending {
            *pending_count.entry(o.batch_id).or_insert(0) += 1;
        }
    }

    let out = batch_list
        .into_iter()
        .filter_map(|b| {
            let farm = b.farm_id.and_then(|fid| farms_map.get(&fid)).cloned();
            if let Some(farm) = farm {
                Some(SupervisorBatchResponse {
                    batch_id: b.batch_id,
                    status: b.status,
                    avg_body_weight: b.avg_body_weight,
                    activated_at: b.activated_at,
                    closed_at: b.closed_at,
                    farm: farm.into(),
                    pending_orders: pending_count.get(&b.batch_id).copied().unwrap_or(0),
                })
            } else {
                None
            }
        })
        .collect();

    Ok(Json(out))
}

/// GET /supervisor/batches/{id}/pending-orders
pub async fn pending_orders_handler(
    State(db): State<DatabaseConnection>,
    Path(batch_id): Path<i32>,
) -> Result<Json<Vec<OrderResponse>>, StatusCode> {
    batches::Entity::find_by_id(batch_id)
        .one(&db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .ok_or(StatusCode::NOT_FOUND)?;

    let orders_list = orders::Entity::find()
        .filter(orders::Column::BatchId.eq(batch_id))
        .filter(orders::Column::Status.eq(OrderStatus::Pending))
        .order_by_asc(orders::Column::CreatedAt)
        .all(&db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(build_order_responses(&db, orders_list).await?))
}

/// PATCH /supervisor/orders/{id}/weight
pub async fn enter_weight_handler(
    State(db): State<DatabaseConnection>,
    Path(order_id): Path<i32>,
    Extension(sub): Extension<String>,
    Json(payload): Json<WeightPayload>,
) -> Result<Json<OrderResponse>, StatusCode> {
    let actor_id = supervisor_id_from_sub(&sub)?;
    if payload.actual_weight <= Decimal::ZERO || payload.actual_birds <= 0 {
        return Err(StatusCode::BAD_REQUEST);
    }

    let order = orders::Entity::find_by_id(order_id)
        .one(&db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .ok_or(StatusCode::NOT_FOUND)?;

    if order.status != OrderStatus::Pending {
        return Err(StatusCode::BAD_REQUEST);
    }

    let txn = db
        .begin()
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let mut active: orders::ActiveModel = order.clone().into();
    active.actual_weight = Set(Some(payload.actual_weight));
    active.actual_birds = Set(Some(payload.actual_birds));
    active.status = Set(OrderStatus::WeightEntered);
    active.weight_entered_at = Set(Some(Utc::now().into()));
    let updated = active
        .update(&txn)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    write_audit(
        &txn,
        order_id,
        actor_id,
        "weight_entered",
        Some("weight"),
        None,
        Some(&payload.actual_weight.to_string()),
    )
    .await?;
    write_audit(
        &txn,
        order_id,
        actor_id,
        "birds_entered",
        Some("birds"),
        None,
        Some(&payload.actual_birds.to_string()),
    )
    .await?;

    txn.commit()
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    build_order_response(&db, updated).await
}

/// DELETE /supervisor/orders/{id}/weight
pub async fn clear_weight_handler(
    State(db): State<DatabaseConnection>,
    Path(order_id): Path<i32>,
    Extension(sub): Extension<String>,
) -> Result<Json<OrderResponse>, StatusCode> {
    let actor_id = supervisor_id_from_sub(&sub)?;

    let order = orders::Entity::find_by_id(order_id)
        .one(&db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .ok_or(StatusCode::NOT_FOUND)?;

    if order.status != OrderStatus::WeightEntered {
        return Err(StatusCode::BAD_REQUEST);
    }

    let old_weight = order.actual_weight.map(|w| w.to_string());

    let txn = db
        .begin()
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let mut active: orders::ActiveModel = order.clone().into();
    active.actual_weight = Set(None);
    active.actual_birds = Set(None);
    active.status = Set(OrderStatus::Pending);
    active.weight_entered_at = Set(None);
    let updated = active
        .update(&txn)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    write_audit(
        &txn,
        order_id,
        actor_id,
        "weight_cleared",
        Some("weight"),
        old_weight.as_deref(),
        None,
    )
    .await?;

    txn.commit()
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    build_order_response(&db, updated).await
}

/// GET /supervisor/orders/confirm-queue
pub async fn confirm_queue_handler(
    State(db): State<DatabaseConnection>,
) -> Result<Json<Vec<OrderResponse>>, StatusCode> {
    let orders_list = orders::Entity::find()
        .filter(orders::Column::Status.eq(OrderStatus::WeightEntered))
        .order_by_asc(orders::Column::CreatedAt)
        .all(&db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(build_order_responses(&db, orders_list).await?))
}

/// PATCH /supervisor/orders/{id}/close
pub async fn close_order_handler(
    State(db): State<DatabaseConnection>,
    Path(order_id): Path<i32>,
    Extension(sub): Extension<String>,
    Json(payload): Json<CloseOrderPayload>,
) -> Result<Json<OrderResponse>, StatusCode> {
    let actor_id = supervisor_id_from_sub(&sub)?;
    if payload.actual_weight <= Decimal::ZERO
        || payload.actual_birds <= 0
        || payload.entry_rate < Decimal::ZERO
    {
        return Err(StatusCode::BAD_REQUEST);
    }

    let order = orders::Entity::find_by_id(order_id)
        .one(&db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .ok_or(StatusCode::NOT_FOUND)?;

    if order.status != OrderStatus::WeightEntered {
        return Err(StatusCode::BAD_REQUEST);
    }

    let total_amount = payload.actual_weight * payload.entry_rate;

    let txn = db
        .begin()
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let mut active: orders::ActiveModel = order.clone().into();
    active.actual_weight = Set(Some(payload.actual_weight));
    active.actual_birds = Set(Some(payload.actual_birds));
    active.entry_rate = Set(Some(payload.entry_rate));
    active.total_amount = Set(Some(total_amount));
    active.status = Set(OrderStatus::Confirmed);
    active.confirmed_at = Set(Some(Utc::now().into()));
    let updated = active
        .update(&txn)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    write_audit(
        &txn,
        order_id,
        actor_id,
        "rate_set",
        Some("entry_rate"),
        None,
        Some(&payload.entry_rate.to_string()),
    )
    .await?;
    write_audit(
        &txn,
        order_id,
        actor_id,
        "order_closed",
        Some("status"),
        Some(&order_status_str(OrderStatus::WeightEntered)),
        Some(&order_status_str(OrderStatus::Confirmed)),
    )
    .await?;

    txn.commit()
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    build_order_response(&db, updated).await
}

/// POST /supervisor/orders/{id}/reject
pub async fn reject_order_handler(
    State(db): State<DatabaseConnection>,
    Path(order_id): Path<i32>,
    Extension(sub): Extension<String>,
    Json(payload): Json<RejectOrderPayload>,
) -> Result<Json<OrderResponse>, StatusCode> {
    let actor_id = supervisor_id_from_sub(&sub)?;
    if payload.reason.trim().is_empty() {
        return Err(StatusCode::BAD_REQUEST);
    }

    let order = orders::Entity::find_by_id(order_id)
        .one(&db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .ok_or(StatusCode::NOT_FOUND)?;

    if order.status != OrderStatus::Pending && order.status != OrderStatus::WeightEntered {
        return Err(StatusCode::BAD_REQUEST);
    }

    let old_status = order_status_str(order.status.clone());

    let txn = db
        .begin()
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let mut active: orders::ActiveModel = order.clone().into();
    active.status = Set(OrderStatus::RejectedBySupervisor);
    active.rejected_at = Set(Some(Utc::now().into()));
    active.rejection_reason = Set(Some(payload.reason.clone()));
    let updated = active
        .update(&txn)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    write_audit(
        &txn,
        order_id,
        actor_id,
        "order_rejected",
        Some("status"),
        Some(&old_status),
        Some(&order_status_str(OrderStatus::RejectedBySupervisor)),
    )
    .await?;

    txn.commit()
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    build_order_response(&db, updated).await
}
