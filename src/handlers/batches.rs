use crate::models::CreateBatch;
use axum::{extract::State, http::StatusCode, Json};
use chrono::Utc;
use entity::batch_allocation_lines;
use entity::batch_allocations;
use entity::batch_requirements;
use entity::batches;
use entity::inventory;
use entity::inventory_movements;
use entity::items;
use entity::ledger_accounts;
use entity::ledger_entries;
use entity::sea_orm_active_enums::ItemCategory;
use entity::sea_orm_active_enums::MovementType;
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
        current_bird_count: Set(Some(payload.initial_bird_count)),
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
        ..Default::default()
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
        ..Default::default()
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
