use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use entity::{
    batch_allocation_lines, batch_allocations, batches, bird_count_history, items, ledger_accounts,
    ledger_entries,
    sea_orm_active_enums::{ItemCategory, RequirementStatus},
    stock_receipts, stock_returns,
};
use entity::{
    batch_requirements, inventory, inventory_movements, sea_orm_active_enums::MovementType,
};
use sea_orm::ColumnTrait;
use sea_orm::{
    prelude::Decimal, ActiveModelTrait, DatabaseConnection, EntityTrait, QueryFilter, QueryOrder,
    Set,
};
use sea_orm::{DatabaseTransaction, IntoActiveModel, TransactionTrait};
use uuid::Uuid;

use crate::models::{ApprovePayload, CreateStockReturn, ResponseMessage};

pub async fn decline_batch_requirement_handler(
    Path(requirement_id): Path<i32>,
    State(db): State<DatabaseConnection>,
) -> impl IntoResponse {
    // Fetch the requirement by primary key
    match batch_requirements::Entity::find_by_id(requirement_id)
        .one(&db)
        .await
    {
        Ok(Some(requirement)) => {
            let mut active_model = requirement.into_active_model();
            active_model.status = Set(RequirementStatus::Decline);

            match active_model.update(&db).await {
                Ok(_) => (
                    StatusCode::OK,
                    Json(ResponseMessage {
                        message: format!("Requirement {} declined successfully", requirement_id),
                    }),
                )
                    .into_response(),
                Err(e) => {
                    eprintln!("Failed to update requirement {}: {}", requirement_id, e);
                    StatusCode::INTERNAL_SERVER_ERROR.into_response()
                }
            }
        }
        Ok(None) => (
            StatusCode::NOT_FOUND,
            Json(ResponseMessage {
                message: format!("Requirement {} not found", requirement_id),
            }),
        )
            .into_response(),
        Err(e) => {
            eprintln!("Failed to fetch requirement {}: {}", requirement_id, e);
            StatusCode::INTERNAL_SERVER_ERROR.into_response()
        }
    }
}

pub async fn approve_batch_requirement_handler(
    State(db): State<DatabaseConnection>,
    Json(payload): Json<ApprovePayload>,
) -> impl IntoResponse {
    // Start transaction
    match db.begin().await {
        Ok(txn) => {
            let result = approve_and_allocate(payload.requirement_id, payload, &txn).await;

            match result {
                Ok(msg) => {
                    if let Err(e) = txn.commit().await {
                        eprintln!("Transaction commit failed: {}", e);
                        return StatusCode::INTERNAL_SERVER_ERROR.into_response();
                    }
                    (StatusCode::OK, Json(ResponseMessage { message: msg })).into_response()
                }
                Err(e) => {
                    eprintln!("Transaction failed: {}", e);
                    // rollback happens automatically when txn is dropped
                    StatusCode::INTERNAL_SERVER_ERROR.into_response()
                }
            }
        }
        Err(e) => {
            eprintln!("Failed to start transaction: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR.into_response()
        }
    }
}

async fn approve_and_allocate(
    requirement_id: i32,
    payload: ApprovePayload,
    txn: &DatabaseTransaction,
) -> Result<String, String> {
    use sea_orm::ActiveValue::Set;

    // 1. Fetch requirement
    let requirement = batch_requirements::Entity::find_by_id(requirement_id)
        .one(txn)
        .await
        .map_err(|e| format!("DB fetch error: {}", e))?
        .ok_or_else(|| format!("Requirement {} not found", requirement_id))?;

    // 2. Update requirement status -> Accept
    let mut active_model = requirement.clone().into_active_model();
    active_model.status = Set(RequirementStatus::Accept);
    active_model
        .update(txn)
        .await
        .map_err(|e| format!("Failed to update requirement: {}", e))?;

    // 3. Insert allocation
    let allocation = batch_allocations::ActiveModel {
        allocation_id: Default::default(),
        requirement_id: Set(Some(payload.requirement_id)),
        allocated_qty: Set(payload.allocated_qty),
        allocation_date: Set(payload.allocation_date),
        allocated_value: Set(Decimal::ZERO), // to be updated after FIFO allocation
        allocated_by: Set(payload.allocated_by),
    };

    let allocation_model = allocation
        .insert(txn)
        .await
        .map_err(|e| format!("Failed to insert allocation: {}", e))?;

    // 4. Update inventory (deduct allocated qty)
    if let Some(inv) = inventory::Entity::find_by_id(requirement.item_code.clone())
        .one(txn)
        .await
        .map_err(|e| format!("Failed to fetch inventory: {}", e))?
    {
        let mut active_inv: inventory::ActiveModel = inv.into();
        let current = active_inv.current_qty.take().unwrap_or_default();

        if current < payload.allocated_qty {
            return Err(format!(
                "Not enough stock for item {}. Required: {}, Available: {}",
                requirement.item_code, payload.allocated_qty, current
            ));
        }

        active_inv.current_qty = Set(current - payload.allocated_qty);
        active_inv.last_updated = Set(chrono::Utc::now().into());

        active_inv
            .update(txn)
            .await
            .map_err(|e| format!("Failed to update inventory: {}", e))?;
    } else {
        return Err(format!(
            "No inventory record found for item {}",
            requirement.item_code
        ));
    }

    // 5. Insert inventory movement (OUT)
    let movement = inventory_movements::ActiveModel {
        movement_id: Default::default(),
        item_code: Set(requirement.item_code.clone()),
        movement_type: Set(MovementType::Allocation),
        qty_change: Set(-payload.allocated_qty),
        reference_id: Set(Some(allocation_model.allocation_id)),
        ..Default::default()
    };

    movement
        .insert(txn)
        .await
        .map_err(|e| format!("Failed to insert inventory movement: {}", e))?;

    // -----------------------------------------------------------
    // 6. FIFO allocation from stock_receipts -> batch_allocation_lines
    // -----------------------------------------------------------
    let mut qty_to_allocate = payload.allocated_qty;
    let mut total_value = Decimal::ZERO;

    // fetch lots in FIFO order
    let receipts = stock_receipts::Entity::find()
        .filter(stock_receipts::Column::ItemCode.eq(requirement.item_code.clone()))
        .filter(stock_receipts::Column::RemainingQty.gt(Decimal::ZERO))
        .order_by_asc(stock_receipts::Column::ReceivedDate)
        .order_by_asc(stock_receipts::Column::LotId)
        .all(txn)
        .await
        .map_err(|e| format!("Failed to fetch stock receipts: {}", e))?;

    for r in receipts {
        if qty_to_allocate <= Decimal::ZERO {
            break;
        }

        let take = std::cmp::min(r.remaining_qty, qty_to_allocate);
        let line_value = take * r.unit_cost;

        // insert allocation line
        let line = batch_allocation_lines::ActiveModel {
            allocation_line_id: Default::default(),
            allocation_id: Set(allocation_model.allocation_id),
            lot_id: Set(r.lot_id),
            qty: Set(take),
            unit_cost: Set(r.unit_cost),
            line_value: Set(line_value),
        };
        line.insert(txn)
            .await
            .map_err(|e| format!("Failed to insert allocation line: {}", e))?;

        // update lot remaining qty
        let mut r_active: stock_receipts::ActiveModel = r.into();
        r_active.remaining_qty = Set(r_active.remaining_qty.take().unwrap() - take);
        r_active
            .update(txn)
            .await
            .map_err(|e| format!("Failed to update stock_receipt: {}", e))?;

        total_value += line_value;
        qty_to_allocate -= take;
    }

    // update allocation with monetary worth
    let mut alloc_update: batch_allocations::ActiveModel = allocation_model.clone().into();
    alloc_update.allocated_value = Set(total_value);
    alloc_update
        .update(txn)
        .await
        .map_err(|e| format!("Failed to update allocation value: {}", e))?;

    if qty_to_allocate > Decimal::ZERO {
        // not enough stock: business decision → error, negative stock, or backorder
        return Err(format!(
            "Partial allocation: shortage of {} units for item {}",
            qty_to_allocate, requirement.item_code
        ));
    }

    let item = items::Entity::find_by_id(requirement.item_code.clone())
        .one(txn)
        .await
        .map_err(|e| {
            tracing::error!("Failed to fetch item {}: {}", requirement.item_code, e);
            format!("Failed to fetch item: {}", e)
        })?
        .ok_or_else(|| {
            tracing::error!("Item {} not found", requirement.item_code);
            format!("Item {} not found", requirement.item_code)
        })?;

    let (asset_account_id, expense_account_id) = match item.item_category {
        ItemCategory::Medicine => (102_i32, 107_i32), // inventory-medicine -> farm-expense
        ItemCategory::Feed => (103_i32, 107_i32),     // inventory-feed -> farm-expense
        ItemCategory::Chicks => (104_i32, 107_i32),   // inventory-chicks -> farm-expense
        ItemCategory::FinishedBirds => (105_i32, 107_i32), // this is wrong
    };

    if let ItemCategory::Chicks = item.item_category {
        // Convert allocated_qty (Decimal) to i32 for bird_count_history.additions
        // (Assumes allocated_qty is a whole number — adjust conversion as needed)
        let additions_i32: i32 = payload
            .allocated_qty
            .to_string()
            .parse::<i32>()
            .unwrap_or_default();

        // Insert bird count history
        let bird_history = bird_count_history::ActiveModel {
            record_id: Default::default(),
            batch_id: Set(requirement.batch_id),
            record_date: Set(payload.allocation_date),
            deaths: Set(0),
            additions: Set(additions_i32),
            notes: Set(format!(
                "{} birds added on {} (Allocation #{})",
                additions_i32, payload.allocation_date, allocation_model.allocation_id
            )),
            created_at: Set(chrono::Utc::now().into()),
        };

        bird_history
            .insert(txn)
            .await
            .map_err(|e| format!("Failed to insert bird_count_history: {}", e))?;

        // Update batches.current_bird_count
        if let Some(batch) = batches::Entity::find_by_id(requirement.batch_id)
            .one(txn)
            .await
            .map_err(|e| format!("Failed to fetch batch {}: {}", requirement.batch_id, e))?
        {
            let current = batch.current_bird_count.unwrap_or(0);
            let mut batch_active: batches::ActiveModel = batch.into();
            batch_active.current_bird_count = Set(Some(current + additions_i32));
            batch_active
                .update(txn)
                .await
                .map_err(|e| format!("Failed to update batch bird count: {}", e))?;
        }
    }

    let txn_group_id = Uuid::new_v4();

    let credit_entry = ledger_entries::ActiveModel {
        entry_id: Default::default(),
        account_id: Set(asset_account_id),
        debit: Set(None),
        credit: Set(Some(total_value)),
        txn_date: Set(chrono::Utc::now().date_naive()),
        reference_table: Set(Some("allocations".into())),
        narration: Set(Some(format!(
            "approve of (requirement {})",
            payload.requirement_id
        ))),
        txn_group_id: Set(txn_group_id),
        reference_id: Set(Some(allocation_model.allocation_id)),
        created_by: Set(Some(payload.allocated_by)),
        created_at: Set(chrono::Utc::now().into()),
        ..Default::default()
    };

    credit_entry.insert(txn).await.map_err(|e| {
        tracing::error!("Failed to insert credit entry: {}", e);
        format!("Failed to insert credit entry: {}", e)
    })?;

    let debit_entry = ledger_entries::ActiveModel {
        entry_id: Default::default(),
        account_id: Set(expense_account_id),
        debit: Set(Some(total_value)),
        credit: Set(None),
        narration: Set(Some(format!(
            "Allocation of - Req #{}",
            payload.requirement_id
        ))),
        txn_date: Set(chrono::Utc::now().date_naive()),
        reference_table: Set(Some("allocations".into())),
        reference_id: Set(Some(allocation_model.allocation_id)),
        created_by: Set(Some(payload.allocated_by)),
        created_at: Set(chrono::Utc::now().into()),
        txn_group_id: Set(txn_group_id),
        ..Default::default()
    };

    debit_entry.insert(txn).await.map_err(|e| {
        tracing::error!("Failed to insert debit entry: {}", e);
        format!("Failed to insert debit entry: {}", e)
    })?;

    if let Some(asset_account) = ledger_accounts::Entity::find_by_id(asset_account_id)
        .one(txn)
        .await
        .map_err(|e| {
            tracing::error!("Failed to fetch asset account {}: {}", asset_account_id, e);
            format!("Failed to fetch asset account: {}", e)
        })?
    {
        let mut asset_active: ledger_accounts::ActiveModel = asset_account.into();
        let current_balance = asset_active.current_balance.take().unwrap_or_default();
        tracing::debug!(
            "Asset account {} current_balance={} total_value={}",
            asset_account_id,
            current_balance,
            total_value
        );

        asset_active.current_balance = Set(current_balance - total_value);

        asset_active.update(txn).await.map_err(|e| {
            tracing::error!(
                "Failed to update asset account {} balance: {}",
                asset_account_id,
                e
            );
            format!("Failed to update asset account balance: {}", e)
        })?;
        tracing::info!(
            "Updated asset account {} balance -> {}",
            asset_account_id,
            current_balance - total_value
        );
    }

    if let Some(expense_account) = ledger_accounts::Entity::find_by_id(expense_account_id)
        .one(txn)
        .await
        .map_err(|e| {
            tracing::error!(
                "Failed to fetch expense account {}: {}",
                expense_account_id,
                e
            );
            format!("Failed to fetch expense account: {}", e)
        })?
    {
        let mut expense_active: ledger_accounts::ActiveModel = expense_account.into();
        let current_balance = expense_active.current_balance.take().unwrap_or_default();
        tracing::debug!(
            "Expense account {} current_balance={} total_value={}",
            expense_account_id,
            current_balance,
            total_value
        );

        expense_active.current_balance = Set(current_balance + total_value);

        expense_active.update(txn).await.map_err(|e| {
            tracing::error!(
                "Failed to update expense account {} balance: {}",
                expense_account_id,
                e
            );
            format!("Failed to update expense account balance: {}", e)
        })?;
        tracing::info!(
            "Updated expense account {} balance -> {}",
            expense_account_id,
            current_balance + total_value
        );
    }

    Ok(format!(
        "Requirement {} approved, allocation created, inventory updated, and movement logged",
        requirement_id
    ))
}

pub async fn create_stock_return(
    State(db): State<DatabaseConnection>,
    Json(payload): Json<CreateStockReturn>,
) -> impl IntoResponse {
    // Start transaction
    match db.begin().await {
        Ok(txn) => {
            let result = process_stock_return(payload, &txn).await;

            match result {
                Ok(msg) => {
                    if let Err(e) = txn.commit().await {
                        eprintln!("Transaction commit failed: {}", e);
                        return StatusCode::INTERNAL_SERVER_ERROR.into_response();
                    }
                    (StatusCode::CREATED, Json(ResponseMessage { message: msg })).into_response()
                }
                Err(e) => {
                    eprintln!("Transaction failed: {}", e);
                    StatusCode::INTERNAL_SERVER_ERROR.into_response()
                }
            }
        }
        Err(e) => {
            eprintln!("Failed to start transaction: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR.into_response()
        }
    }
}

async fn process_stock_return(
    payload: CreateStockReturn,
    txn: &DatabaseTransaction,
) -> Result<String, String> {
    // 1. Fetch the allocation line to verify and get details
    let allocation_line = batch_allocation_lines::Entity::find_by_id(payload.allocation_line_id)
        .one(txn)
        .await
        .map_err(|e| format!("Failed to fetch allocation line: {}", e))?
        .ok_or_else(|| format!("Allocation line {} not found", payload.allocation_line_id))?;

    // Validate return quantity doesn't exceed allocated quantity
    if payload.return_qty > allocation_line.qty {
        return Err(format!(
            "Return quantity {} exceeds allocated quantity {}",
            payload.return_qty, allocation_line.qty
        ));
    }

    // 2. Fetch the allocation to get item details
    let allocation = batch_allocations::Entity::find_by_id(allocation_line.allocation_id)
        .one(txn)
        .await
        .map_err(|e| format!("Failed to fetch allocation: {}", e))?
        .ok_or_else(|| format!("Allocation {} not found", allocation_line.allocation_id))?;

    let requirement = entity::batch_requirements::Entity::find()
        .filter(entity::batch_requirements::Column::RequirementId.eq(allocation.requirement_id))
        .one(txn)
        .await
        .map_err(|e| format!("Failed to fetch requirement: {}", e))?
        .ok_or_else(|| {
            format!(
                "Requirement not found for allocation {}",
                allocation.allocation_id
            )
        })?;

    let item_code = requirement.item_code.clone();

    // 3. Insert stock return record
    let stock_return = stock_returns::ActiveModel {
        return_id: Default::default(),
        allocation_line_id: Set(payload.allocation_line_id),
        batch_id: Set(payload.batch_id),
        return_qty: Set(payload.return_qty),
        unit_cost: Set(payload.unit_cost),
        return_value: Set(payload.return_value),
        return_date: Set(payload.return_date),
        created_at: Set(chrono::Utc::now().into()),
    };

    let return_model = stock_return
        .insert(txn)
        .await
        .map_err(|e| format!("Failed to insert stock return: {}", e))?;

    // 4. Update inventory (add back returned qty)
    if let Some(inv) = inventory::Entity::find_by_id(item_code.clone())
        .one(txn)
        .await
        .map_err(|e| format!("Failed to fetch inventory: {}", e))?
    {
        let mut active_inv: inventory::ActiveModel = inv.into();
        let current = active_inv.current_qty.take().unwrap_or_default();

        active_inv.current_qty = Set(current + payload.return_qty);
        active_inv.last_updated = Set(chrono::Utc::now().into());

        active_inv
            .update(txn)
            .await
            .map_err(|e| format!("Failed to update inventory: {}", e))?;
    } else {
        return Err(format!("No inventory record found for item {}", item_code));
    }

    // 5. Insert inventory movement (IN - return)
    let movement = inventory_movements::ActiveModel {
        movement_id: Default::default(),
        item_code: Set(item_code.clone()),
        movement_type: Set(MovementType::Adjustment),
        qty_change: Set(payload.return_qty),
        reference_id: Set(Some(return_model.return_id)),
        ..Default::default()
    };

    movement
        .insert(txn)
        .await
        .map_err(|e| format!("Failed to insert inventory movement: {}", e))?;

    // 6. Restore stock to the lot (FIFO reversal)
    let receipt = stock_receipts::Entity::find_by_id(allocation_line.lot_id)
        .one(txn)
        .await
        .map_err(|e| format!("Failed to fetch stock receipt: {}", e))?
        .ok_or_else(|| format!("Stock receipt {} not found", allocation_line.lot_id))?;

    let mut receipt_active: stock_receipts::ActiveModel = receipt.clone().into();
    receipt_active.remaining_qty = Set(receipt.remaining_qty + payload.return_qty);
    receipt_active
        .update(txn)
        .await
        .map_err(|e| format!("Failed to update stock receipt: {}", e))?;

    // 7. Fetch item to determine category for ledger accounts
    let item = items::Entity::find_by_id(item_code.clone())
        .one(txn)
        .await
        .map_err(|e| format!("Failed to fetch item: {}", e))?
        .ok_or_else(|| format!("Item {} not found", item_code))?;

    let (asset_account_id, expense_account_id) = match item.item_category {
        ItemCategory::Medicine => (102_i32, 107_i32),
        ItemCategory::Feed => (103_i32, 107_i32),
        ItemCategory::Chicks => (104_i32, 107_i32),
        ItemCategory::FinishedBirds => (105_i32, 107_i32),
    };

    // 8. Handle bird count reversal for Chicks category
    // if let ItemCategory::Chicks = item.item_category {
    //     let return_qty_i32: i32 = payload
    //         .return_qty
    //         .to_string()
    //         .parse::<i32>()
    //         .unwrap_or_default();

    //     // Insert bird count history (negative adjustment)
    //     let bird_history = bird_count_history::ActiveModel {
    //         record_id: Default::default(),
    //         batch_id: Set(payload.batch_id),
    //         record_date: Set(payload.return_date),
    //         deaths: Set(return_qty_i32),
    //         additions: Set(0),
    //         notes: Set(format!(
    //             "{} birds returned on {} (Return #{})",
    //             return_qty_i32, payload.return_date, return_model.return_id
    //         )),
    //         created_at: Set(chrono::Utc::now().into()),
    //     };

    //     bird_history
    //         .insert(txn)
    //         .await
    //         .map_err(|e| format!("Failed to insert bird_count_history: {}", e))?;

    //     // Update batches.current_bird_count (decrease)
    //     if let Some(batch) = batches::Entity::find_by_id(payload.batch_id)
    //         .one(txn)
    //         .await
    //         .map_err(|e| format!("Failed to fetch batch {}: {}", payload.batch_id, e))?
    //     {
    //         let current = batch.current_bird_count.unwrap_or(0);
    //         let mut batch_active: batches::ActiveModel = batch.into();
    //         batch_active.current_bird_count = Set(Some(current - return_qty_i32));
    //         batch_active
    //             .update(txn)
    //             .await
    //             .map_err(|e| format!("Failed to update batch bird count: {}", e))?;
    //     }
    // }

    // 9. Create ledger entries (reverse the allocation entries)
    let txn_group_id = Uuid::new_v4();

    // Debit asset account (restore inventory value)
    let debit_entry = ledger_entries::ActiveModel {
        entry_id: Default::default(),
        account_id: Set(asset_account_id),
        debit: Set(Some(payload.return_value)),
        credit: Set(None),
        txn_date: Set(chrono::Utc::now().date_naive()),
        reference_table: Set(Some("stock_returns".into())),
        narration: Set(Some(format!(
            "Stock return for allocation line {}",
            payload.allocation_line_id
        ))),
        txn_group_id: Set(txn_group_id),
        reference_id: Set(Some(return_model.return_id)),
        created_at: Set(chrono::Utc::now().into()),
        ..Default::default()
    };

    debit_entry
        .insert(txn)
        .await
        .map_err(|e| format!("Failed to insert debit entry: {}", e))?;

    // Credit expense account (reverse the expense)
    let credit_entry = ledger_entries::ActiveModel {
        entry_id: Default::default(),
        account_id: Set(expense_account_id),
        debit: Set(None),
        credit: Set(Some(payload.return_value)),
        txn_date: Set(chrono::Utc::now().date_naive()),
        reference_table: Set(Some("stock_returns".into())),
        narration: Set(Some(format!(
            "Return reversal for allocation line {}",
            payload.allocation_line_id
        ))),
        txn_group_id: Set(txn_group_id),
        reference_id: Set(Some(return_model.return_id)),
        created_at: Set(chrono::Utc::now().into()),
        ..Default::default()
    };

    credit_entry
        .insert(txn)
        .await
        .map_err(|e| format!("Failed to insert credit entry: {}", e))?;

    // 10. Update ledger account balances
    if let Some(asset_account) = ledger_accounts::Entity::find_by_id(asset_account_id)
        .one(txn)
        .await
        .map_err(|e| format!("Failed to fetch asset account: {}", e))?
    {
        let mut asset_active: ledger_accounts::ActiveModel = asset_account.into();
        let current_balance = asset_active.current_balance.take().unwrap_or_default();
        asset_active.current_balance = Set(current_balance + payload.return_value);

        asset_active
            .update(txn)
            .await
            .map_err(|e| format!("Failed to update asset account balance: {}", e))?;
    }

    if let Some(expense_account) = ledger_accounts::Entity::find_by_id(expense_account_id)
        .one(txn)
        .await
        .map_err(|e| format!("Failed to fetch expense account: {}", e))?
    {
        let mut expense_active: ledger_accounts::ActiveModel = expense_account.into();
        let current_balance = expense_active.current_balance.take().unwrap_or_default();
        expense_active.current_balance = Set(current_balance - payload.return_value);

        expense_active
            .update(txn)
            .await
            .map_err(|e| format!("Failed to update expense account balance: {}", e))?;
    }

    Ok(format!(
        "Stock return {} created successfully. Inventory restored, ledger entries reversed, and movements logged.",
        return_model.return_id
    ))
}
