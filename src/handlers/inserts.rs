use crate::handlers::batch_sales::compute_total_expenses;
use crate::models::*;
use axum::{extract::State, http::StatusCode, Json};
use chrono::Utc;
use entity::sea_orm_active_enums::{BatchStatus, LedgerAccountType};
use entity::{sea_orm_active_enums::RequirementStatus, *};
use sea_orm::prelude::Decimal;
use sea_orm::EntityTrait;
use sea_orm::TransactionTrait;
use sea_orm::{ActiveModelTrait, DatabaseConnection, Set};
use tracing::error;
use uuid::Uuid;

/// Production Lines
pub async fn create_production_line(
    State(db): State<DatabaseConnection>,
    Json(payload): Json<CreateProductionLine>,
) -> Result<Json<production_lines::Model>, StatusCode> {
    let new_line = production_lines::ActiveModel {
        line_name: Set(payload.line_name),
        supervisor_id: Set(payload.supervisor_id),
        ..Default::default()
    };
    new_line
        .insert(&db)
        .await
        .map(Json)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

pub async fn create_item(
    State(db): State<DatabaseConnection>,
    Json(payload): Json<CreateItem>,
) -> Result<Json<items::Model>, StatusCode> {
    let new_item = items::ActiveModel {
        item_code: Set(payload.item_code),
        item_name: Set(payload.item_name),
        item_category: Set(payload.item_category),
        unit: Set(payload.unit),
    };

    new_item
        .insert(&db)
        .await
        .map(Json)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

pub async fn create_batch_requirement(
    State(db): State<DatabaseConnection>,
    Json(payload): Json<CreateBatchRequirement>,
) -> Result<Json<batch_requirements::Model>, StatusCode> {
    let new_req = batch_requirements::ActiveModel {
        batch_id: Set(payload.batch_id),
        line_id: Set(payload.line_id),
        supervisor_id: Set(payload.supervisor_id),
        item_code: Set(payload.item_code.clone()),
        quantity: Set(payload.quantity),
        request_date: Set(payload.request_date),
        // 👇 ensure status is always set
        status: Set(RequirementStatus::Pending),
        ..Default::default()
    };

    match new_req.insert(&db).await {
        Ok(model) => Ok(Json(model)),

        Err(e) => {
            eprintln!("❌ Failed to insert batch requirement: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

/// Batch Allocations
pub async fn create_batch_allocation(
    State(db): State<DatabaseConnection>,
    Json(payload): Json<CreateBatchAllocation>,
) -> Result<Json<batch_allocations::Model>, StatusCode> {
    let new_alloc = batch_allocations::ActiveModel {
        requirement_id: Set(Some(payload.requirement_id)),
        allocated_qty: Set(payload.allocated_qty),
        allocation_date: Set(payload.allocation_date),
        allocated_by: Set(payload.allocated_by),
        ..Default::default()
    };

    new_alloc
        .insert(&db)
        .await
        .map(Json)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

/// Farmers
pub async fn create_farmer(
    State(db): State<DatabaseConnection>,
    Json(payload): Json<CreateFarmer>,
) -> Result<Json<farmers::Model>, (StatusCode, String)> {
    let new_farmer = farmers::ActiveModel {
        name: Set(payload.name),
        phone_number: Set(payload.phone_number),
        address: Set(payload.address),
        bank_account_no: Set(payload.bank_account_no),
        bank_name: Set(payload.bank_name),
        ifsc_code: Set(payload.ifsc_code),
        area_size: Set(payload.area_size),
        ..Default::default()
    };

    new_farmer
        .insert(&db)
        .await
        .map(Json)
        .map_err(|err| (StatusCode::INTERNAL_SERVER_ERROR, err.to_string()))
}

/// Traders
pub async fn create_trader(
    State(db): State<DatabaseConnection>,
    Json(payload): Json<CreateTrader>,
) -> Result<Json<traders::Model>, StatusCode> {
    let new_trader = traders::ActiveModel {
        name: Set(payload.name),
        phone_number: Set(payload.phone_number),
        address: Set(payload.address),
        bank_account_no: Set(payload.bank_account_no),
        bank_name: Set(payload.bank_name),
        ifsc_code: Set(payload.ifsc_code),
        ..Default::default()
    };
    new_trader
        .insert(&db)
        .await
        .map(Json)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

/// Suppliers
pub async fn create_supplier(
    State(db): State<DatabaseConnection>,
    Json(payload): Json<CreateSupplier>,
) -> Result<Json<suppliers::Model>, StatusCode> {
    let new_supplier = suppliers::ActiveModel {
        supplier_type: Set(payload.supplier_type),
        name: Set(payload.name),
        phone_number: Set(payload.phone_number),
        address: Set(payload.address),
        bank_account_no: Set(payload.bank_account_no),
        bank_name: Set(payload.bank_name),
        ifsc_code: Set(payload.ifsc_code),
        ..Default::default()
    };
    new_supplier
        .insert(&db)
        .await
        .map(Json)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

/// Bird Count History
pub async fn create_bird_count_history(
    State(db): State<DatabaseConnection>,
    Json(payload): Json<CreateBirdCountHistory>,
) -> Result<Json<bird_count_history::Model>, StatusCode> {
    let txn = db
        .begin()
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Insert into bird_count_history
    let new_record = bird_count_history::ActiveModel {
        batch_id: Set(payload.batch_id),
        record_date: Set(payload.record_date),
        deaths: Set(payload.deaths),
        additions: Set(payload.additions),
        notes: Set(payload.notes.unwrap_or_else(|| {
            if payload.additions > 0 {
                format!(
                    "{} birds added on {}",
                    payload.additions, payload.record_date
                )
            } else if payload.deaths > 0 {
                format!("{} birds died on {}", payload.deaths, payload.record_date)
            } else {
                format!("No change on {}", payload.record_date)
            }
        })),
        ..Default::default()
    };

    let record = new_record
        .insert(&txn)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let batch = batches::Entity::find_by_id(payload.batch_id)
        .one(&txn)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .ok_or(StatusCode::NOT_FOUND)?;

    let new_count = batch.current_bird_count + payload.additions - payload.deaths;

    let mut batch_model: batches::ActiveModel = batch.into();
    batch_model.current_bird_count = Set(new_count);

    batch_model
        .update(&txn)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    txn.commit()
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(record))
}

/// Bird Sell History
pub async fn create_bird_sell_history(
    State(db): State<DatabaseConnection>,
    Json(payload): Json<CreateBirdSellHistory>,
) -> Result<Json<bird_sell_history::Model>, StatusCode> {
    let computed_total = Decimal::from(payload.quantity_sold) * payload.price_per_bird;
    let new_sale = bird_sell_history::ActiveModel {
        batch_id: Set(payload.batch_id),
        trader_id: Set(payload.trader_id),
        sale_date: Set(payload.sale_date),
        quantity_sold: Set(payload.quantity_sold),
        price_per_bird: Set(payload.price_per_bird),
        total_amount: Set(computed_total),
        notes: Set(payload.notes),
        ..Default::default()
    };
    new_sale
        .insert(&db)
        .await
        .map(Json)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

pub async fn create_ledger_account(
    State(db): State<DatabaseConnection>,
    Json(payload): Json<CreateLedgerAccount>,
) -> Result<Json<ledger_accounts::Model>, StatusCode> {
    let new_account = ledger_accounts::ActiveModel {
        name: Set((payload.name).to_lowercase()),
        account_type: Set(payload.account_type),
        current_balance: Set(payload.current_balance),
        ..Default::default()
    };

    new_account.insert(&db).await.map(Json).map_err(|err| {
        eprintln!("Failed to insert ledger account: {:?}", err);
        StatusCode::INTERNAL_SERVER_ERROR
    })
}

pub async fn create_farmer_commission(
    State(db): State<DatabaseConnection>,
    Json(payload): Json<CreateFarmerCommission>,
) -> Result<Json<farmer_commission_history::Model>, StatusCode> {
    const CASH_ACCOUNT_ID: i32 = 101;
    const COMMISSION_EXPENSE_ACCOUNT_ID: i32 = 106;

    let txn = db.begin().await.map_err(|e| {
        error!("Failed to start transaction: {:?}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    // 1) insert farmer commission history
    let new_commission = farmer_commission_history::ActiveModel {
        farmer_id: Set(payload.farmer_id),
        commission_amount: Set(payload.commission_amount),
        description: Set(payload.description),
        created_at: Set(Utc::now().into()),
        ..Default::default()
    };

    let saved_commission = new_commission.insert(&txn).await.map_err(|e| {
        error!("Failed to insert farmer commission history: {:?}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    // 2) create ledger entries
    let txn_group_id = Uuid::new_v4();
    let today = chrono::Local::now().date_naive();

    let debit_entry = ledger_entries::ActiveModel {
        account_id: Set(COMMISSION_EXPENSE_ACCOUNT_ID),
        debit: Set(Some(payload.commission_amount)),
        credit: Set(None),
        txn_date: Set(today),
        reference_table: Set(Some("farmer_commission_history".to_string())),
        reference_id: Set(Some(saved_commission.id)),
        narration: Set(Some("Farmer commission debit".to_string())),
        txn_group_id: Set(txn_group_id),
        created_by: Set(payload.created_by),
        ..Default::default()
    };

    let credit_entry = ledger_entries::ActiveModel {
        account_id: Set(CASH_ACCOUNT_ID),
        debit: Set(None),
        credit: Set(Some(payload.commission_amount)),
        txn_date: Set(today),
        reference_table: Set(Some("farmer_commission_history".to_string())),
        reference_id: Set(Some(saved_commission.id)),
        narration: Set(Some("Cash paid for farmer commission".to_string())),
        txn_group_id: Set(txn_group_id),
        created_by: Set(payload.created_by),
        ..Default::default()
    };

    debit_entry.insert(&txn).await.map_err(|e| {
        error!("Failed to insert debit ledger entry: {:?}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    credit_entry.insert(&txn).await.map_err(|e| {
        error!("Failed to insert credit ledger entry: {:?}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    // 3) update balances
    let mut commission_acct: ledger_accounts::ActiveModel =
        ledger_accounts::Entity::find_by_id(COMMISSION_EXPENSE_ACCOUNT_ID)
            .one(&txn)
            .await
            .map_err(|e| {
                error!("Failed to fetch commission account: {:?}", e);
                StatusCode::INTERNAL_SERVER_ERROR
            })?
            .ok_or_else(|| {
                error!(
                    "Commission account not found: {}",
                    COMMISSION_EXPENSE_ACCOUNT_ID
                );
                StatusCode::INTERNAL_SERVER_ERROR
            })?
            .into();

    commission_acct.current_balance =
        Set(commission_acct.current_balance.unwrap() + payload.commission_amount);

    commission_acct.update(&txn).await.map_err(|e| {
        error!("Failed to update commission account balance: {:?}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    let mut cash_acct: ledger_accounts::ActiveModel =
        ledger_accounts::Entity::find_by_id(CASH_ACCOUNT_ID)
            .one(&txn)
            .await
            .map_err(|e| {
                error!("Failed to fetch cash account: {:?}", e);
                StatusCode::INTERNAL_SERVER_ERROR
            })?
            .ok_or_else(|| {
                error!("Cash account not found: {}", CASH_ACCOUNT_ID);
                StatusCode::INTERNAL_SERVER_ERROR
            })?
            .into();

    cash_acct.current_balance = Set(cash_acct.current_balance.unwrap() - payload.commission_amount);

    cash_acct.update(&txn).await.map_err(|e| {
        error!("Failed to update cash account balance: {:?}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    txn.commit().await.map_err(|e| {
        error!("Failed to commit transaction: {:?}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    Ok(Json(saved_commission))
}

pub async fn create_batch_closure_summary(
    State(db): State<DatabaseConnection>,
    Json(payload): Json<CreateBatchClosureSummary>,
) -> Result<Json<batch_closure_summary::Model>, StatusCode> {
    let txn = db
        .begin()
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let total_expenses = compute_total_expenses(&txn, payload.batch_id)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Authoritative revenue: sum of recorded sales for the batch.
    // Falls back to the payload value (manual adjustment) when no sales exist.
    use sea_orm::{ColumnTrait, QueryFilter};
    let sales_total: Decimal = batch_sales::Entity::find()
        .filter(batch_sales::Column::BatchId.eq(payload.batch_id))
        .all(&txn)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .iter()
        .map(|s| s.value)
        .sum();
    let revenue = if sales_total > Decimal::ZERO {
        sales_total
    } else {
        payload.revenue
    };
    let gross_profit = revenue - total_expenses;

    // Upsert: re-closing an already-closed batch updates the existing row
    // instead of inserting a duplicate.
    if let Some(existing) = batch_closure_summary::Entity::find()
        .filter(batch_closure_summary::Column::BatchId.eq(payload.batch_id))
        .one(&txn)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    {
        let mut am: batch_closure_summary::ActiveModel = existing.into();
        am.start_date = Set(payload.start_date);
        am.end_date = Set(payload.end_date);
        am.initial_chicken_count = Set(payload.initial_chicken_count);
        am.available_chicken_count = Set(payload.available_chicken_count);
        am.revenue = Set(revenue);
        am.gross_profit = Set(gross_profit);
        let updated = am
            .update(&txn)
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

        let mut batch: batches::ActiveModel = batches::Entity::find_by_id(payload.batch_id)
            .one(&txn)
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
            .ok_or(StatusCode::NOT_FOUND)?
            .into();

        batch.status = Set(Some(BatchStatus::Closed));
        batch.end_date = Set(payload.end_date);

        batch
            .update(&txn)
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

        txn.commit()
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

        return Ok(Json(updated));
    }

    let new_record = batch_closure_summary::ActiveModel {
        batch_id: Set(payload.batch_id),
        start_date: Set(payload.start_date),
        end_date: Set(payload.end_date),
        initial_chicken_count: Set(payload.initial_chicken_count),
        available_chicken_count: Set(payload.available_chicken_count),
        revenue: Set(revenue),
        gross_profit: Set(gross_profit),
        ..Default::default()
    };

    let inserted = new_record
        .insert(&txn)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let mut batch: batches::ActiveModel = batches::Entity::find_by_id(payload.batch_id)
        .one(&txn)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .ok_or(StatusCode::NOT_FOUND)?
        .into();

    batch.status = Set(Some(BatchStatus::Closed));
    batch.end_date = Set(payload.end_date);

    batch
        .update(&txn)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    txn.commit()
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(inserted))
}

pub async fn create_ledger_entry(
    State(db): State<DatabaseConnection>,
    Json(payload): Json<CreateLedgerEntry>,
) -> Result<Json<ledger_entries::Model>, StatusCode> {
    // Validate presence and non-negativity of amounts
    let debit_val = payload.debit.unwrap_or(Decimal::ZERO);
    let credit_val = payload.credit.unwrap_or(Decimal::ZERO);

    if debit_val == Decimal::ZERO && credit_val == Decimal::ZERO {
        return Err(StatusCode::BAD_REQUEST);
    }
    if debit_val < Decimal::ZERO || credit_val < Decimal::ZERO {
        return Err(StatusCode::BAD_REQUEST);
    }

    // Start transaction
    let txn = db
        .begin()
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // 1. Fetch account (within transaction to keep consistent read)
    let account = ledger_accounts::Entity::find_by_id(payload.account_id)
        .one(&txn)
        .await
        .map_err(|_| {
            // try to rollback if fetch fails (best-effort)
            StatusCode::INTERNAL_SERVER_ERROR
        })?
        .ok_or(StatusCode::NOT_FOUND)?;

    // 2. Compute delta depending on account type
    //    For Asset/Expense: delta = debit - credit
    //    For Liability/Equity/Revenue: delta = credit - debit
    let delta: Decimal = match account.account_type {
        LedgerAccountType::Asset | LedgerAccountType::Expense => debit_val - credit_val,
        LedgerAccountType::Liability | LedgerAccountType::Equity | LedgerAccountType::Revenue => {
            credit_val - debit_val
        }
    };

    let new_balance = account.current_balance + delta;

    // 3. Build and insert ledger entry (stores both debit and credit as provided)
    let new_entry = ledger_entries::ActiveModel {
        account_id: Set(payload.account_id),
        debit: Set(payload.debit),
        credit: Set(payload.credit),
        txn_date: Set(payload.txn_date),
        reference_table: Set(payload.reference_table.clone()),
        reference_id: Set(payload.reference_id),
        narration: Set(payload.narration.clone()),
        txn_group_id: Set(Uuid::new_v4()),
        created_at: Set(Utc::now().into()),
        created_by: Set(payload.created_by),
        ..Default::default()
    };

    let inserted_entry = new_entry
        .insert(&txn)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // 4. Update account balance
    let mut account_am: ledger_accounts::ActiveModel = account.into();
    account_am.current_balance = Set(new_balance);
    account_am
        .update(&txn)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // 5. Commit transaction
    txn.commit()
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(inserted_entry))
}
