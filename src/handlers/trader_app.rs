use std::collections::HashMap;

use crate::auth::trader_login::TraderPublic;
use crate::models::{
    BatchDetailResponse, CreateOrderPayload, CreditSummary, LiveBatchResponse, OrderResponse,
    TimeslotInfo, TraderOrderQuery,
};
use axum::{
    extract::{Extension, Path, Query, State},
    http::StatusCode,
    Json,
};
use chrono::Utc;
use entity::sea_orm_active_enums::{BatchStatus, LedgerEntryType, OrderStatus};
use entity::{
    app_traders, audit_log, batches, farms, orders, timeslots, trader_ledger_entries, users,
};
use sea_orm::{
    ActiveModelTrait, ColumnTrait, ConnectionTrait, DatabaseConnection, EntityTrait,
    PaginatorTrait, QueryFilter, QueryOrder, Set, TransactionTrait,
};

fn trader_id_from_sub(sub: &str) -> Result<i32, StatusCode> {
    sub.parse::<i32>().map_err(|_| StatusCode::UNAUTHORIZED)
}

/// GET /trader/me
pub async fn me_handler(
    State(db): State<DatabaseConnection>,
    Extension(sub): Extension<String>,
) -> Result<Json<TraderPublic>, StatusCode> {
    let trader_id = trader_id_from_sub(&sub)?;

    let trader = app_traders::Entity::find_by_id(trader_id)
        .one(&db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .ok_or(StatusCode::NOT_FOUND)?;

    Ok(Json(trader.into()))
}

fn parse_order_status(raw: &str) -> Option<OrderStatus> {
    match raw.to_uppercase().as_str() {
        "PENDING" => Some(OrderStatus::Pending),
        "WEIGHT_ENTERED" => Some(OrderStatus::WeightEntered),
        "CONFIRMED" => Some(OrderStatus::Confirmed),
        "CANCELLED_BY_TRADER" => Some(OrderStatus::CancelledByTrader),
        "REJECTED_BY_SUPERVISOR" => Some(OrderStatus::RejectedBySupervisor),
        "EXPIRED" => Some(OrderStatus::Expired),
        _ => None,
    }
}

pub(crate) fn order_status_str(status: OrderStatus) -> String {
    match status {
        OrderStatus::Pending => "PENDING".to_string(),
        OrderStatus::WeightEntered => "WEIGHT_ENTERED".to_string(),
        OrderStatus::Confirmed => "CONFIRMED".to_string(),
        OrderStatus::CancelledByTrader => "CANCELLED_BY_TRADER".to_string(),
        OrderStatus::RejectedBySupervisor => "REJECTED_BY_SUPERVISOR".to_string(),
        OrderStatus::Expired => "EXPIRED".to_string(),
    }
}

/// GET /trader/credit-summary
pub async fn credit_summary_handler(
    State(db): State<DatabaseConnection>,
    Extension(sub): Extension<String>,
) -> Result<Json<CreditSummary>, StatusCode> {
    let trader_id = trader_id_from_sub(&sub)?;

    let trader = app_traders::Entity::find_by_id(trader_id)
        .one(&db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .ok_or(StatusCode::NOT_FOUND)?;

    let dues = orders::Entity::find()
        .filter(orders::Column::TraderId.eq(trader_id))
        .filter(orders::Column::Status.eq(OrderStatus::Confirmed))
        .all(&db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .into_iter()
        .fold(sea_orm::prelude::Decimal::ZERO, |acc, o| {
            acc + o.total_amount.unwrap_or_default()
        });

    // Payments recorded on the per-trader ledger (trader_ledger_entries).
    // NOTE: the legacy `trader_payments` table references the old `traders`
    // table (not `app_traders`), so it must not be used for app traders.
    let paid = trader_ledger_entries::Entity::find()
        .filter(trader_ledger_entries::Column::TraderId.eq(trader_id))
        .filter(trader_ledger_entries::Column::EntryType.eq(LedgerEntryType::Payment))
        .all(&db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .into_iter()
        .fold(sea_orm::prelude::Decimal::ZERO, |acc, e| acc + e.amount);

    let total_dues = dues - paid;
    let remaining_credit = trader.credit_limit.map(|limit| limit - total_dues);

    Ok(Json(CreditSummary {
        trader_id,
        credit_limit: trader.credit_limit,
        credit_terms_days: trader.credit_terms_days,
        total_dues,
        total_paid: paid,
        remaining_credit,
    }))
}

/// GET /trader/batches/live
pub async fn live_batches_handler(
    State(db): State<DatabaseConnection>,
) -> Result<Json<Vec<LiveBatchResponse>>, StatusCode> {
    let live = batches::Entity::find()
        .filter(batches::Column::Status.eq(BatchStatus::Live))
        .all(&db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let farm_ids: Vec<i32> = live.iter().filter_map(|b| b.farm_id).collect();

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

    let mut out = Vec::with_capacity(live.len());
    for b in live {
        if let Some(farm) = b.farm_id.and_then(|fid| farms_map.get(&fid)).cloned() {
            out.push(LiveBatchResponse {
                batch_id: b.batch_id,
                status: b.status,
                avg_body_weight: b.avg_body_weight,
                activated_at: b.activated_at,
                farm: farm.into(),
            });
        }
    }

    Ok(Json(out))
}

/// GET /trader/batches/{id}
pub async fn batch_detail_handler(
    State(db): State<DatabaseConnection>,
    Path(batch_id): Path<i32>,
) -> Result<Json<BatchDetailResponse>, StatusCode> {
    let batch = batches::Entity::find_by_id(batch_id)
        .one(&db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .ok_or(StatusCode::NOT_FOUND)?;

    let farm = match batch.farm_id {
        Some(fid) => farms::Entity::find_by_id(fid)
            .one(&db)
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
            .ok_or(StatusCode::NOT_FOUND)?,
        None => return Err(StatusCode::NOT_FOUND),
    };

    let slots = timeslots::Entity::find()
        .filter(timeslots::Column::BatchId.eq(batch_id))
        .order_by_asc(timeslots::Column::SlotStart)
        .all(&db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .into_iter()
        .map(|s| TimeslotInfo {
            timeslot_id: s.timeslot_id,
            slot_start: s.slot_start,
            slot_end: s.slot_end,
        })
        .collect();

    let supervisor = users::Entity::find_by_id(batch.supervisor_id)
        .one(&db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(BatchDetailResponse {
        batch_id: batch.batch_id,
        status: batch.status,
        avg_body_weight: batch.avg_body_weight,
        activated_at: batch.activated_at,
        closed_at: batch.closed_at,
        created_at: batch.created_at,
        farm: farm.into(),
        timeslots: slots,
        supervisor_name: supervisor.as_ref().map(|s| s.name.clone()),
        supervisor_email: supervisor.as_ref().map(|s| s.email.clone()),
        supervisor_phone: supervisor.as_ref().and_then(|s| s.phone.clone()),
    }))
}

/// POST /trader/orders
pub async fn create_order_handler(
    State(db): State<DatabaseConnection>,
    Extension(sub): Extension<String>,
    Json(payload): Json<CreateOrderPayload>,
) -> Result<Json<OrderResponse>, StatusCode> {
    let trader_id = trader_id_from_sub(&sub)?;

    if payload.requested_weight <= sea_orm::prelude::Decimal::ZERO {
        return Err(StatusCode::BAD_REQUEST);
    }

    let batch = batches::Entity::find_by_id(payload.batch_id)
        .one(&db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .ok_or(StatusCode::NOT_FOUND)?;

    if batch.status.as_ref() != Some(&BatchStatus::Live) {
        return Err(StatusCode::BAD_REQUEST);
    }

    let slot = timeslots::Entity::find_by_id(payload.timeslot_id)
        .one(&db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .ok_or(StatusCode::NOT_FOUND)?;

    if slot.batch_id != payload.batch_id {
        return Err(StatusCode::BAD_REQUEST);
    }

    let order = insert_order_with_inquiry(&db, &payload, trader_id).await?;

    build_order_response(&db, order).await
}

async fn insert_order_with_inquiry(
    db: &DatabaseConnection,
    payload: &CreateOrderPayload,
    trader_id: i32,
) -> Result<orders::Model, StatusCode> {
    for _ in 0..10 {
        let txn = db
            .begin()
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

        let inquiry_number = match generate_inquiry_number(&txn).await {
            Ok(n) => n,
            Err(e) => {
                let _ = txn.rollback().await;
                return Err(e);
            }
        };

        let new_order = orders::ActiveModel {
            inquiry_number: Set(inquiry_number.clone()),
            trader_id: Set(trader_id),
            batch_id: Set(payload.batch_id),
            timeslot_id: Set(payload.timeslot_id),
            requested_weight: Set(payload.requested_weight),
            status: Set(OrderStatus::Pending),
            ..Default::default()
        };

        match new_order.insert(&txn).await {
            Ok(order) => {
                let audit = audit_log::ActiveModel {
                    order_id: Set(order.order_id),
                    actor_type: Set("trader".to_string()),
                    actor_id: Set(trader_id),
                    action: Set("order_created".to_string()),
                    field_changed: Set(None),
                    old_value: Set(None),
                    new_value: Set(Some(format!(
                        "batch={}|timeslot={}",
                        payload.batch_id, payload.timeslot_id
                    ))),
                    ..Default::default()
                };

                if audit.insert(&txn).await.is_err() {
                    let _ = txn.rollback().await;
                    return Err(StatusCode::INTERNAL_SERVER_ERROR);
                }

                match txn.commit().await {
                    Ok(_) => return Ok(order),
                    Err(_) => return Err(StatusCode::INTERNAL_SERVER_ERROR),
                }
            }
            Err(e) => {
                let _ = txn.rollback().await;
                if e.to_string().contains("unique") {
                    continue; // collision on inquiry_number — regenerate and retry
                }
                return Err(StatusCode::INTERNAL_SERVER_ERROR);
            }
        }
    }

    Err(StatusCode::INTERNAL_SERVER_ERROR)
}

async fn generate_inquiry_number<C: ConnectionTrait>(txn: &C) -> Result<String, StatusCode> {
    let date = Utc::now().format("%Y%m%d").to_string();
    let prefix = format!("INQ-{}-", date);
    let count = orders::Entity::find()
        .filter(orders::Column::InquiryNumber.like(format!("{}%", prefix)))
        .count(txn)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    let seq = count + 1;
    Ok(format!("{}{:04}", prefix, seq))
}

/// GET /trader/orders?status=
pub async fn list_orders_handler(
    State(db): State<DatabaseConnection>,
    Extension(sub): Extension<String>,
    Query(params): Query<TraderOrderQuery>,
) -> Result<Json<Vec<OrderResponse>>, StatusCode> {
    let trader_id = trader_id_from_sub(&sub)?;

    let mut query = orders::Entity::find().filter(orders::Column::TraderId.eq(trader_id));

    if let Some(raw) = params.status {
        let status = parse_order_status(&raw).ok_or(StatusCode::BAD_REQUEST)?;
        query = query.filter(orders::Column::Status.eq(status));
    }

    let orders_list = query
        .order_by_desc(orders::Column::CreatedAt)
        .all(&db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(build_order_responses(&db, orders_list).await?))
}

/// GET /trader/orders/{id}
pub async fn order_detail_handler(
    State(db): State<DatabaseConnection>,
    Extension(sub): Extension<String>,
    Path(order_id): Path<i32>,
) -> Result<Json<OrderResponse>, StatusCode> {
    let trader_id = trader_id_from_sub(&sub)?;

    let order = orders::Entity::find()
        .filter(orders::Column::OrderId.eq(order_id))
        .filter(orders::Column::TraderId.eq(trader_id))
        .one(&db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .ok_or(StatusCode::NOT_FOUND)?;

    build_order_response(&db, order).await
}

/// POST /trader/orders/{id}/cancel
pub async fn cancel_order_handler(
    State(db): State<DatabaseConnection>,
    Extension(sub): Extension<String>,
    Path(order_id): Path<i32>,
) -> Result<Json<OrderResponse>, StatusCode> {
    let trader_id = trader_id_from_sub(&sub)?;

    let order = orders::Entity::find()
        .filter(orders::Column::OrderId.eq(order_id))
        .filter(orders::Column::TraderId.eq(trader_id))
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

    let mut active: orders::ActiveModel = order.into();
    active.status = Set(OrderStatus::CancelledByTrader);
    active.cancelled_at = Set(Some(Utc::now().into()));
    let updated = active
        .update(&txn)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let audit = audit_log::ActiveModel {
        order_id: Set(order_id),
        actor_type: Set("trader".to_string()),
        actor_id: Set(trader_id),
        action: Set("status_change".to_string()),
        field_changed: Set(Some("status".to_string())),
        old_value: Set(Some("PENDING".to_string())),
        new_value: Set(Some("CANCELLED_BY_TRADER".to_string())),
        ..Default::default()
    };
    audit
        .insert(&txn)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    txn.commit()
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    build_order_response(&db, updated).await
}

pub(crate) async fn build_order_response(
    db: &DatabaseConnection,
    order: orders::Model,
) -> Result<Json<OrderResponse>, StatusCode> {
    let batch = batches::Entity::find_by_id(order.batch_id)
        .one(db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    let slot = timeslots::Entity::find_by_id(order.timeslot_id)
        .one(db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let supervisor_id = batch.as_ref().map(|b| b.supervisor_id);

    let (farm_name, farm_code) = match batch.as_ref().and_then(|b| b.farm_id) {
        Some(fid) => farms::Entity::find_by_id(fid)
            .one(db)
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
            .map(|f| (Some(f.name), Some(f.code)))
            .unwrap_or((None, None)),
        None => (None, None),
    };

    let trader = app_traders::Entity::find_by_id(order.trader_id)
        .one(db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let supervisor = match supervisor_id {
        Some(uid) => users::Entity::find_by_id(uid)
            .one(db)
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?,
        None => None,
    };

    Ok(Json(OrderResponse {
        order_id: order.order_id,
        inquiry_number: order.inquiry_number,
        trader_id: order.trader_id,
        batch_id: order.batch_id,
        timeslot_id: order.timeslot_id,
        requested_weight: order.requested_weight,
        status: order_status_str(order.status),
        actual_weight: order.actual_weight,
        actual_birds: order.actual_birds,
        entry_rate: order.entry_rate,
        total_amount: order.total_amount,
        rejection_reason: order.rejection_reason,
        created_at: order.created_at,
        weight_entered_at: order.weight_entered_at,
        confirmed_at: order.confirmed_at,
        cancelled_at: order.cancelled_at,
        rejected_at: order.rejected_at,
        expired_at: order.expired_at,
        farm_name,
        farm_code,
        batch_status: batch.map(|b| b.status).flatten(),
        slot_start: slot.as_ref().map(|s| s.slot_start),
        slot_end: slot.as_ref().map(|s| s.slot_end),
        trader_name: trader.as_ref().map(|t| t.name.clone()),
        trader_phone: trader.as_ref().map(|t| t.phone.clone()),
        supervisor_name: supervisor.as_ref().map(|s| s.name.clone()),
        supervisor_email: supervisor.as_ref().map(|s| s.email.clone()),
        supervisor_phone: supervisor.as_ref().and_then(|s| s.phone.clone()),
    }))
}

pub(crate) async fn build_order_responses(
    db: &DatabaseConnection,
    orders_list: Vec<orders::Model>,
) -> Result<Vec<OrderResponse>, StatusCode> {
    if orders_list.is_empty() {
        return Ok(vec![]);
    }

    let batch_ids: Vec<i32> = orders_list.iter().map(|o| o.batch_id).collect();
    let timeslot_ids: Vec<i32> = orders_list.iter().map(|o| o.timeslot_id).collect();

    let batches_map: HashMap<i32, batches::Model> = batches::Entity::find()
        .filter(batches::Column::BatchId.is_in(batch_ids))
        .all(db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .into_iter()
        .map(|b| (b.batch_id, b))
        .collect();

    let timeslots_map: HashMap<i32, timeslots::Model> = timeslots::Entity::find()
        .filter(timeslots::Column::TimeslotId.is_in(timeslot_ids))
        .all(db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .into_iter()
        .map(|s| (s.timeslot_id, s))
        .collect();

    let farm_ids: Vec<i32> = batches_map.values().filter_map(|b| b.farm_id).collect();
    let farms_map: HashMap<i32, farms::Model> = if farm_ids.is_empty() {
        HashMap::new()
    } else {
        farms::Entity::find()
            .filter(farms::Column::FarmId.is_in(farm_ids))
            .all(db)
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
            .into_iter()
            .map(|f| (f.farm_id, f))
            .collect()
    };

    let trader_ids: Vec<i32> = orders_list.iter().map(|o| o.trader_id).collect();
    let traders_map: HashMap<i32, app_traders::Model> = app_traders::Entity::find()
        .filter(app_traders::Column::Id.is_in(trader_ids))
        .all(db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .into_iter()
        .map(|t| (t.id, t))
        .collect();

    let supervisor_ids: Vec<i32> = batches_map.values().map(|b| b.supervisor_id).collect();
    let users_map: HashMap<i32, users::Model> = users::Entity::find()
        .filter(users::Column::UserId.is_in(supervisor_ids))
        .all(db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .into_iter()
        .map(|u| (u.user_id, u))
        .collect();

    let out = orders_list
        .into_iter()
        .map(|o| {
            let batch = batches_map.get(&o.batch_id);
            let slot = timeslots_map.get(&o.timeslot_id);
            let farm = batch
                .and_then(|b| b.farm_id)
                .and_then(|fid| farms_map.get(&fid));
            let trader = traders_map.get(&o.trader_id);
            let supervisor = batch.and_then(|b| users_map.get(&b.supervisor_id));

            OrderResponse {
                order_id: o.order_id,
                inquiry_number: o.inquiry_number,
                trader_id: o.trader_id,
                batch_id: o.batch_id,
                timeslot_id: o.timeslot_id,
                requested_weight: o.requested_weight,
                status: order_status_str(o.status),
                actual_weight: o.actual_weight,
                actual_birds: o.actual_birds,
                entry_rate: o.entry_rate,
                total_amount: o.total_amount,
                rejection_reason: o.rejection_reason,
                created_at: o.created_at,
                weight_entered_at: o.weight_entered_at,
                confirmed_at: o.confirmed_at,
                cancelled_at: o.cancelled_at,
                rejected_at: o.rejected_at,
                expired_at: o.expired_at,
                farm_name: farm.map(|f| f.name.clone()),
                farm_code: farm.map(|f| f.code.clone()),
                batch_status: batch.and_then(|b| b.status.clone()),
                slot_start: slot.map(|s| s.slot_start),
                slot_end: slot.map(|s| s.slot_end),
                trader_name: trader.map(|t| t.name.clone()),
                trader_phone: trader.map(|t| t.phone.clone()),
                supervisor_name: supervisor.map(|s| s.name.clone()),
                supervisor_email: supervisor.map(|s| s.email.clone()),
                supervisor_phone: supervisor.and_then(|s| s.phone.clone()),
            }
        })
        .collect();

    Ok(out)
}
