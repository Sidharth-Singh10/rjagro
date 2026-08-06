use crate::models::{ActivateBatchPayload, CreateBatch, CreateFarmBatch};
use axum::{
    extract::{Extension, Path, State},
    http::StatusCode,
    Json,
};
use chrono::Utc;
use entity::audit_log;
use entity::batch_allocation_lines;
use entity::batch_allocations;
use entity::batch_requirements;
use entity::batches;
use entity::farms;
use entity::inventory;
use entity::inventory_movements;
use entity::items;
use entity::ledger_accounts;
use entity::ledger_entries;
use entity::orders;
use entity::production_lines;
use entity::sea_orm_active_enums::BatchStatus;
use entity::sea_orm_active_enums::ItemCategory;
use entity::sea_orm_active_enums::MovementType;
use entity::sea_orm_active_enums::OrderStatus;
use entity::sea_orm_active_enums::RequirementStatus;
use entity::stock_receipts;
use num_traits::cast::ToPrimitive;
use sea_orm::prelude::Decimal;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, DatabaseConnection, DatabaseTransaction, EntityTrait,
    QueryFilter, QueryOrder, Set, TransactionTrait,
};
use uuid::Uuid;

pub async fn create_batch(
    State(db): State<DatabaseConnection>,
    Json(payload): Json<CreateBatch>,
) -> Result<Json<batches::Model>, StatusCode> {
    // Use transaction for data consistency
    let txn = db
        .begin()
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    match create_batch_with_transaction(&txn, payload).await {
        Ok(batch) => {
            txn.commit()
                .await
                .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
            Ok(Json(batch))
        }
        Err(err) => {
            let _ = txn.rollback().await;
            eprintln!("Failed to create batch: {}", err);
            Err(StatusCode::BAD_REQUEST)
        }
    }
}

async fn create_batch_with_transaction(
    txn: &DatabaseTransaction,
    payload: CreateBatch,
) -> Result<batches::Model, String> {
    // 1. Validate chick item exists and is actually a chick
    let item = items::Entity::find_by_id(&payload.chick_item_code[0])
        .one(txn)
        .await
        .map_err(|e| format!("Failed to fetch item {}: {}", payload.chick_item_code[0], e))?
        .ok_or_else(|| format!("Item {} not found", payload.chick_item_code[0]))?;

    if item.item_category != ItemCategory::Chicks {
        return Err(format!(
            "Item {} is not a chick item",
            payload.chick_item_code[0]
        ));
    }

    // 2. Check total inventory availability
    let inventory = inventory::Entity::find_by_id(&payload.chick_item_code[0])
        .one(txn)
        .await
        .map_err(|e| {
            format!(
                "Failed to fetch inventory for {}: {}",
                payload.chick_item_code[0], e
            )
        })?
        .ok_or_else(|| format!("No inventory found for item {}", payload.chick_item_code[0]))?;

    if inventory.current_qty.to_i32().unwrap_or(0) < payload.initial_bird_count {
        return Err(format!(
            "Insufficient stock for {}. Required: {}, Available: {}",
            payload.chick_item_code[0], payload.initial_bird_count, inventory.current_qty
        ));
    }

    // 3. Create the batch
    let new_batch = batches::ActiveModel {
        line_id: Set(payload.line_id),
        supervisor_id: Set(payload.supervisor_id),
        farmer_id: Set(payload.farmer_id),
        start_date: Set(payload.start_date),
        end_date: Set(payload.end_date),
        initial_bird_count: Set(payload.initial_bird_count),
        current_bird_count: Set(payload.initial_bird_count),
        ..Default::default()
    };

    let batch_model = new_batch
        .insert(txn)
        .await
        .map_err(|e| format!("Failed to create batch: {}", e))?;

    let requirement = batch_requirements::ActiveModel {
        requirement_id: Default::default(),
        batch_id: Set(batch_model.batch_id),
        line_id: Set(payload.line_id),
        supervisor_id: Set(payload.supervisor_id),
        item_code: Set(payload.chick_item_code[0].clone()),
        quantity: Set(Decimal::from(payload.initial_bird_count)),
        status: Set(RequirementStatus::Accept),
        request_date: Set(Utc::now().date_naive()),
    };

    let requirement_model = requirement
        .insert(txn)
        .await
        .map_err(|e| format!("Failed to create batch requirement: {}", e))?;

    // 4. Create allocation record for the batch
    let allocation = batch_allocations::ActiveModel {
        allocation_id: Default::default(),
        requirement_id: Set(Some(requirement_model.requirement_id)),
        allocated_qty: Set(payload.initial_bird_count.into()),
        allocation_date: Set(Utc::now().date_naive()),
        allocated_value: Set(Decimal::ZERO), // Will be updated after FIFO allocation
        allocated_by: Set(payload.created_by),
    };

    let allocation_model = allocation
        .insert(txn)
        .await
        .map_err(|e| format!("Failed to create allocation: {}", e))?;

    // 5. Update inventory (deduct allocated qty)
    let mut active_inv: inventory::ActiveModel = inventory.into();
    let current = active_inv.current_qty.take().unwrap_or_default();
    active_inv.current_qty = Set(current - Decimal::from(payload.initial_bird_count));
    active_inv.last_updated = Set(Utc::now().into());

    active_inv
        .update(txn)
        .await
        .map_err(|e| format!("Failed to update inventory: {}", e))?;

    // 6. Insert inventory movement (OUT)
    let movement = inventory_movements::ActiveModel {
        movement_id: Default::default(),
        item_code: Set(payload.chick_item_code[0].clone()),
        movement_type: Set(MovementType::Allocation),
        qty_change: Set(Decimal::from(payload.initial_bird_count) * Decimal::from(-1)),
        reference_id: Set(Some(batch_model.batch_id)),
        movement_date: Set(Utc::now().into()),
    };

    movement
        .insert(txn)
        .await
        .map_err(|e| format!("Failed to insert inventory movement: {}", e))?;

    // 7. FIFO allocation from stock_receipts -> batch_allocation_lines
    let mut qty_to_allocate = payload.initial_bird_count;
    let mut total_value = Decimal::ZERO;

    // Fetch lots in FIFO order (oldest first)
    let receipts = stock_receipts::Entity::find()
        .filter(stock_receipts::Column::ItemCode.eq(&payload.chick_item_code[0]))
        .filter(stock_receipts::Column::RemainingQty.gt(Decimal::ZERO))
        .order_by_asc(stock_receipts::Column::ReceivedDate)
        .order_by_asc(stock_receipts::Column::LotId)
        .all(txn)
        .await
        .map_err(|e| format!("Failed to fetch stock receipts: {}", e))?;

    for receipt in receipts {
        if qty_to_allocate <= 0 {
            break;
        }

        let take: Decimal = std::cmp::min(receipt.remaining_qty, Decimal::from(qty_to_allocate));
        let line_value = take * receipt.unit_cost;

        // Insert allocation line
        let line = batch_allocation_lines::ActiveModel {
            allocation_line_id: Default::default(),
            allocation_id: Set(allocation_model.allocation_id),
            batch_id: Set(Some(batch_model.batch_id)),
            lot_id: Set(receipt.lot_id),
            qty: Set(take),
            unit_cost: Set(receipt.unit_cost),
            line_value: Set(line_value),
        };
        line.insert(txn)
            .await
            .map_err(|e| format!("Failed to insert allocation line: {}", e))?;

        // Update lot remaining qty
        let mut receipt_active: stock_receipts::ActiveModel = receipt.into();
        receipt_active.remaining_qty = Set(receipt_active.remaining_qty.take().unwrap() - take);
        receipt_active
            .update(txn)
            .await
            .map_err(|e| format!("Failed to update stock receipt: {}", e))?;

        total_value += line_value;
        qty_to_allocate -= take.to_i32().unwrap_or(0);
    }

    // Update allocation with total monetary worth
    let mut alloc_update: batch_allocations::ActiveModel = allocation_model.clone().into();
    alloc_update.allocated_value = Set(total_value);
    alloc_update
        .update(txn)
        .await
        .map_err(|e| format!("Failed to update allocation value: {}", e))?;

    // Check if we have shortage (like in approve_and_allocate)
    if qty_to_allocate > 0 {
        return Err(format!(
            "Partial allocation: shortage of {} units for item {}",
            qty_to_allocate, payload.chick_item_code[0]
        ));
    }

    // 8. Create ledger entries
    let txn_group_id = Uuid::new_v4();

    // For chicks: inventory-chicks (104) -> farm-expense (107)
    let asset_account_id = 104i32; // inventory-chicks
    let expense_account_id = 107i32; // farm-expense

    // Credit entry (reduce asset)
    let credit_entry = ledger_entries::ActiveModel {
        entry_id: Default::default(),
        account_id: Set(asset_account_id),
        debit: Set(None),
        credit: Set(Some(total_value)),
        txn_date: Set(Utc::now().date_naive()),
        reference_table: Set(Some("batches".into())),
        reference_id: Set(Some(batch_model.batch_id)),
        narration: Set(Some(format!(
            "Chick allocation for batch {} - Item: {}",
            batch_model.batch_id, payload.chick_item_code[0]
        ))),
        txn_group_id: Set(txn_group_id),
        created_by: Set(Some(payload.created_by)),
        created_at: Set(Utc::now().into()),
    };

    credit_entry
        .insert(txn)
        .await
        .map_err(|e| format!("Failed to insert credit entry: {}", e))?;

    // Debit entry (increase expense)
    let debit_entry = ledger_entries::ActiveModel {
        entry_id: Default::default(),
        account_id: Set(expense_account_id),
        debit: Set(Some(total_value)),
        credit: Set(None),
        txn_date: Set(Utc::now().date_naive()),
        reference_table: Set(Some("batches".into())),
        reference_id: Set(Some(batch_model.batch_id)),
        narration: Set(Some(format!(
            "Chick expense for batch {} - Item: {}",
            batch_model.batch_id, payload.chick_item_code[0]
        ))),
        txn_group_id: Set(txn_group_id),
        created_by: Set(Some(payload.created_by)),
        created_at: Set(Utc::now().into()),
    };

    debit_entry
        .insert(txn)
        .await
        .map_err(|e| format!("Failed to insert debit entry: {}", e))?;

    // 9. Update ledger account balances
    // Update asset account (decrease balance)
    if let Some(asset_account) = ledger_accounts::Entity::find_by_id(asset_account_id)
        .one(txn)
        .await
        .map_err(|e| format!("Failed to fetch asset account {}: {}", asset_account_id, e))?
    {
        let mut asset_active: ledger_accounts::ActiveModel = asset_account.into();
        let current_balance = asset_active.current_balance.take().unwrap_or_default();
        asset_active.current_balance = Set(current_balance - total_value);

        asset_active.update(txn).await.map_err(|e| {
            format!(
                "Failed to update asset account {} balance: {}",
                asset_account_id, e
            )
        })?;
    }

    // Update expense account (increase balance)
    if let Some(expense_account) = ledger_accounts::Entity::find_by_id(expense_account_id)
        .one(txn)
        .await
        .map_err(|e| {
            format!(
                "Failed to fetch expense account {}: {}",
                expense_account_id, e
            )
        })?
    {
        let mut expense_active: ledger_accounts::ActiveModel = expense_account.into();
        let current_balance = expense_active.current_balance.take().unwrap_or_default();
        expense_active.current_balance = Set(current_balance + total_value);

        expense_active.update(txn).await.map_err(|e| {
            format!(
                "Failed to update expense account {} balance: {}",
                expense_account_id, e
            )
        })?;
    }

    Ok(batch_model)
}

/// POST /insert/batches/{farm_id}
/// Creates a live-selling batch for the given farm (status=open).
/// Legacy growing-cycle fields are filled with defaults.
pub async fn create_farm_batch_handler(
    State(db): State<DatabaseConnection>,
    Path(farm_id): Path<i32>,
    Extension(actor_id): Extension<String>,
    Json(payload): Json<CreateFarmBatch>,
) -> Result<Json<batches::Model>, StatusCode> {
    let farm = farms::Entity::find_by_id(farm_id)
        .one(&db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .ok_or(StatusCode::NOT_FOUND)?;

    let supervisor_id = actor_id
        .parse::<i32>()
        .map_err(|_| StatusCode::BAD_REQUEST)?;

    // line_id has a NOT NULL FK to production_lines; default to the first one
    let line_id = match payload.line_id {
        Some(line_id) => line_id,
        None => {
            production_lines::Entity::find()
                .order_by_asc(production_lines::Column::LineId)
                .one(&db)
                .await
                .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
                .ok_or(StatusCode::INTERNAL_SERVER_ERROR)?
                .line_id
        }
    };

    let new_batch = batches::ActiveModel {
        line_id: Set(line_id),
        supervisor_id: Set(supervisor_id),
        farmer_id: Set(farm.farmer_id),
        start_date: Set(payload.start_date),
        end_date: Set(payload.start_date),
        initial_bird_count: Set(0),
        current_bird_count: Set(0),
        status: Set(Some(BatchStatus::Open)),
        farm_id: Set(Some(farm_id)),
        ..Default::default()
    };

    new_batch.insert(&db).await.map(Json).map_err(|e| {
        eprintln!("Failed to create batch: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })
}

/// POST /insert/batches/{id}/activate
/// Sets avg_body_weight and moves status open -> live.
pub async fn activate_batch_handler(
    State(db): State<DatabaseConnection>,
    Path(batch_id): Path<i32>,
    Json(payload): Json<ActivateBatchPayload>,
) -> Result<Json<batches::Model>, StatusCode> {
    let batch = batches::Entity::find_by_id(batch_id)
        .one(&db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .ok_or(StatusCode::NOT_FOUND)?;

    if batch.status.as_ref() != Some(&BatchStatus::Open) {
        return Err(StatusCode::BAD_REQUEST);
    }

    let mut active: batches::ActiveModel = batch.into();
    active.status = Set(Some(BatchStatus::Live));
    active.avg_body_weight = Set(Some(payload.avg_body_weight));
    active.activated_at = Set(Some(Utc::now().into()));

    active
        .update(&db)
        .await
        .map(Json)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

/// POST /insert/batches/{id}/close
/// Moves status -> closed and auto-expires any still-PENDING orders on the batch.
pub async fn close_batch_handler(
    State(db): State<DatabaseConnection>,
    Path(batch_id): Path<i32>,
) -> Result<Json<batches::Model>, StatusCode> {
    let txn = db
        .begin()
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let batch = batches::Entity::find_by_id(batch_id)
        .one(&txn)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .ok_or(StatusCode::NOT_FOUND)?;

    if batch.status.as_ref() == Some(&BatchStatus::Closed) {
        return Err(StatusCode::BAD_REQUEST);
    }

    let mut active: batches::ActiveModel = batch.into();
    active.status = Set(Some(BatchStatus::Closed));
    active.closed_at = Set(Some(Utc::now().into()));
    let updated = active
        .update(&txn)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Auto-expire any still-PENDING orders on this batch
    let pending_orders = orders::Entity::find()
        .filter(orders::Column::BatchId.eq(batch_id))
        .filter(orders::Column::Status.eq(OrderStatus::Pending))
        .all(&txn)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let expired_at = Utc::now().into();
    for order in pending_orders {
        let mut order_active: orders::ActiveModel = order.clone().into();
        order_active.status = Set(OrderStatus::Expired);
        order_active.expired_at = Set(Some(expired_at));
        order_active
            .update(&txn)
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

        let audit = audit_log::ActiveModel {
            order_id: Set(order.order_id),
            actor_type: Set("system".to_string()),
            actor_id: Set(0),
            action: Set("status_change".to_string()),
            field_changed: Set(Some("status".to_string())),
            old_value: Set(Some("PENDING".to_string())),
            new_value: Set(Some("EXPIRED".to_string())),
            ..Default::default()
        };
        audit
            .insert(&txn)
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    }

    txn.commit()
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(updated))
}
