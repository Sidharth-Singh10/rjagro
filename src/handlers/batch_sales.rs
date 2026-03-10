use crate::consts::CASH_ACCOUNT_ID;
use crate::consts::RECEIVABLE_ACCOUNT_ID;
use crate::consts::REVENUE_ACCOUNT_ID;
use crate::handlers::purchases::internal_error;
use crate::handlers::purchases::update_account_balance;
use crate::models::CreateBatchSale;
use axum::{
    extract::{Path, State},
    Json,
};
use chrono::Utc;
use entity::batch_allocation_lines;
use entity::batch_closure_summary;
use entity::batch_sales;
use entity::ledger_entries;
use entity::stock_returns;
use entity::sea_orm_active_enums::PaymentType;
use num_traits::ToPrimitive;
use reqwest::StatusCode;
use sea_orm::prelude::Decimal;
use sea_orm::ActiveModelTrait;
use sea_orm::ActiveValue::Set;
use sea_orm::ColumnTrait;
use sea_orm::DatabaseConnection;
use sea_orm::EntityTrait;
use sea_orm::QueryFilter;
use sea_orm::TransactionTrait;
use uuid::Uuid;

pub(crate) async fn compute_total_expenses(
    conn: &impl sea_orm::ConnectionTrait,
    batch_id: i32,
) -> Result<Decimal, sea_orm::DbErr> {
    let allocation_lines = batch_allocation_lines::Entity::find()
        .filter(batch_allocation_lines::Column::BatchId.eq(batch_id))
        .all(conn)
        .await?;
    let allocated_total: Decimal = allocation_lines.iter().map(|l| l.line_value).sum();

    let returns = stock_returns::Entity::find()
        .filter(stock_returns::Column::BatchId.eq(batch_id))
        .all(conn)
        .await?;
    let returns_total: Decimal = returns.iter().map(|r| r.return_value).sum();

    Ok(allocated_total - returns_total)
}

pub async fn create_batch_sale(
    State(db): State<DatabaseConnection>,
    Json(payload): Json<CreateBatchSale>,
) -> Result<Json<batch_sales::Model>, StatusCode> {
    let txn = db.begin().await.map_err(|err| {
        eprintln!("Failed to start transaction: {:?}", err);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    let new_sale = batch_sales::ActiveModel {
        item_code: Set(payload.item_code),
        batch_id: Set(payload.batch_id),
        trader_id: Set(payload.trader_id),
        avg_weight: Set(payload.avg_weight),
        rate: Set(payload.rate),
        quantity: Set(payload.quantity),
        value: Set(payload.value),
        payment_type: Set(payload.payment_type),
        ..Default::default()
    };

    let inserted_sale = new_sale.insert(&txn).await.map_err(|err| {
        eprintln!("Failed to insert batch sale: {:?}", err);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    if let Err(err_status) =
        insert_batch_sales_ledger_entries(&txn, &inserted_sale, payload.created_by).await
    {
        eprintln!("Failed to insert ledger entries for sale: {:?}", err_status);
        txn.rollback().await.ok();
        return Err(StatusCode::INTERNAL_SERVER_ERROR);
    }

    if let Err(err) =
        update_batch_financials(&txn, payload.batch_id, payload.value, payload.quantity).await
    {
        eprintln!("Failed to update batch financials: {:?}", err);
        txn.rollback().await.ok();
        return Err(StatusCode::INTERNAL_SERVER_ERROR);
    }

    txn.commit().await.map_err(|err| {
        eprintln!("Failed to commit transaction: {:?}", err);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    Ok(Json(inserted_sale))
}

async fn update_batch_financials(
    txn: &sea_orm::DatabaseTransaction,
    batch_id: i32,
    added_value: Decimal,
    quantity: Decimal,
) -> Result<(), sea_orm::DbErr> {
    if let Some(batch) = batch_closure_summary::Entity::find()
        .filter(batch_closure_summary::Column::BatchId.eq(batch_id))
        .one(txn)
        .await?
    {
        let mut active: batch_closure_summary::ActiveModel = batch.into();
        let current_count = active.available_chicken_count.unwrap();
        let quantity_to_subtract = quantity.to_i32().unwrap();
        if current_count < quantity_to_subtract {
            return Err(sea_orm::DbErr::Custom(
                "Available chicken count would become negative".to_string(),
            ));
        }
        let new_revenue = active.revenue.unwrap() + added_value;
        let total_expenses = compute_total_expenses(txn, batch_id).await?;
        active.revenue = Set(new_revenue);
        active.gross_profit = Set(new_revenue - total_expenses);
        active.available_chicken_count = Set(current_count - quantity_to_subtract);

        active.update(txn).await?;
    }

    Ok(())
}

pub async fn insert_batch_sales_ledger_entries<C: TransactionTrait + sea_orm::ConnectionTrait>(
    txn: &C,
    sale: &batch_sales::Model,
    created_by: i32,
) -> Result<(), StatusCode> {
    let txn_group_id = Uuid::new_v4();
    let sale_value: Decimal = sale.value;

    // txn_date: use naive date (match your ledger_entries txn_date type)
    let txn_date = Utc::now().date_naive();

    let debit_account_id = match sale.payment_type {
        PaymentType::Cash => CASH_ACCOUNT_ID,
        PaymentType::Receivable => RECEIVABLE_ACCOUNT_ID,
        _ => {
            eprintln!(
                "Invalid or unsupported payment type: {:?}",
                sale.payment_type
            );
            return Err(StatusCode::BAD_REQUEST);
        }
    };

    // --- Debit: Cash account (Asset) ---
    let debit_entry = ledger_entries::ActiveModel {
        account_id: Set(debit_account_id),
        debit: Set(Some(sale_value)),
        credit: Set(None),
        txn_date: Set(txn_date),
        reference_table: Set(Some("batch_sales".into())),
        reference_id: Set(Some(sale.id)),
        narration: Set(Some(format!("Sale for batch {}", sale.batch_id))),
        txn_group_id: Set(txn_group_id),
        created_at: Set(Utc::now().into()),
        created_by: Set(Some(created_by)),
        ..Default::default()
    };

    debit_entry
        .insert(txn)
        .await
        .map_err(internal_error("insert ledger debit for batch sale"))?;

    // --- Credit: Revenue account (Revenue) ---
    let credit_entry = ledger_entries::ActiveModel {
        account_id: Set(REVENUE_ACCOUNT_ID),
        debit: Set(None),
        credit: Set(Some(sale_value)),
        txn_date: Set(txn_date),
        reference_table: Set(Some("batch_sales".into())),
        reference_id: Set(Some(sale.id)),
        narration: Set(Some(format!(
            "Revenue from sale for batch {}",
            sale.batch_id
        ))),
        txn_group_id: Set(txn_group_id),
        created_at: Set(Utc::now().into()),
        created_by: Set(Some(created_by)),
        ..Default::default()
    };

    credit_entry
        .insert(txn)
        .await
        .map_err(internal_error("insert ledger credit for batch sale"))?;

    // --- Update account balances ---
    // Cash account increases (Asset): pass is_debit = true
    update_account_balance(txn, debit_account_id, Some(sale_value), true).await?;

    // Revenue account increases (Revenue): pass is_debit = false (credit increases revenue)
    update_account_balance(txn, REVENUE_ACCOUNT_ID, Some(sale_value), false).await?;

    Ok(())
}

pub async fn delete_batch_sale(
    State(db): State<DatabaseConnection>,
    Path(sale_id): Path<i32>,
) -> Result<reqwest::StatusCode, reqwest::StatusCode> {
    let txn = db
        .begin()
        .await
        .map_err(internal_error("begin transaction"))?;

    // Fetch sale
    let sale = batch_sales::Entity::find_by_id(sale_id)
        .one(&txn)
        .await
        .map_err(internal_error("fetch batch sale"))?
        .ok_or(reqwest::StatusCode::NOT_FOUND)?;

    let batch_id = sale.batch_id;
    let sale_value = sale.value;
    let quantity = sale.quantity;

    // 1. Reverse ledger entries effects on account balances
    let entries = ledger_entries::Entity::find()
        .filter(ledger_entries::Column::ReferenceTable.eq(Some("batch_sales".to_string())))
        .filter(ledger_entries::Column::ReferenceId.eq(Some(sale_id)))
        .all(&txn)
        .await
        .map_err(internal_error("fetch ledger entries"))?;

    for entry in entries.iter() {
        if let Some(debit) = entry.debit {
            // reverse a previous debit by treating it as a credit
            update_account_balance(&txn, entry.account_id, Some(debit), false).await?;
        }
        if let Some(credit) = entry.credit {
            // reverse a previous credit by treating it as a debit
            update_account_balance(&txn, entry.account_id, Some(credit), true).await?;
        }
    }

    // Delete the ledger entries
    ledger_entries::Entity::delete_many()
        .filter(ledger_entries::Column::ReferenceTable.eq(Some("batch_sales".to_string())))
        .filter(ledger_entries::Column::ReferenceId.eq(Some(sale_id)))
        .exec(&txn)
        .await
        .map_err(internal_error("delete ledger entries"))?;

    // 2. Revert batch financials
    if let Some(batch) = batch_closure_summary::Entity::find()
        .filter(batch_closure_summary::Column::BatchId.eq(batch_id))
        .one(&txn)
        .await
        .map_err(internal_error("fetch batch_closure_summary"))?
    {
        let mut active: batch_closure_summary::ActiveModel = batch.into();

        let new_revenue = active.revenue.unwrap() - sale_value;
        let total_expenses = compute_total_expenses(&txn, batch_id)
            .await
            .map_err(internal_error("compute total expenses"))?;
        let current_count = active.available_chicken_count.unwrap();

        active.revenue = Set(new_revenue);
        active.gross_profit = Set(new_revenue - total_expenses);

        let qty_to_add = quantity.to_i32().unwrap_or_default();
        active.available_chicken_count = Set(current_count + qty_to_add);

        active
            .update(&txn)
            .await
            .map_err(internal_error("update batch_closure_summary"))?;
    }

    // 3. Delete the sale
    batch_sales::Entity::delete_by_id(sale_id)
        .exec(&txn)
        .await
        .map_err(internal_error("delete batch sale"))?;

    txn.commit()
        .await
        .map_err(internal_error("commit transaction"))?;

    Ok(reqwest::StatusCode::NO_CONTENT)
}
