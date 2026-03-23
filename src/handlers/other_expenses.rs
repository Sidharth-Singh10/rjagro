use crate::models::CreateOtherExpense;
use axum::{extract::State, http::StatusCode, Json};
use chrono::Utc;
use entity::*;
use sea_orm::{ActiveModelTrait, DatabaseConnection, EntityTrait, QueryOrder, Set, TransactionTrait};
use tracing::error;
use uuid::Uuid;

const CASH_ACCOUNT_ID: i32 = 101;
const OTHER_EXPENSE_ACCOUNT_ID: i32 = 109;

pub async fn create_other_expense(
    State(db): State<DatabaseConnection>,
    Json(payload): Json<CreateOtherExpense>,
) -> Result<Json<other_expenses::Model>, StatusCode> {
    let txn = db.begin().await.map_err(|e| {
        error!("Failed to start transaction: {:?}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    let new_expense = other_expenses::ActiveModel {
        category: Set(payload.category),
        amount: Set(payload.amount),
        description: Set(payload.description.clone()),
        expense_date: Set(payload.expense_date),
        created_by: Set(payload.created_by),
        created_at: Set(Utc::now().into()),
        ..Default::default()
    };

    let saved_expense = new_expense.insert(&txn).await.map_err(|e| {
        error!("Failed to insert other expense: {:?}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    let txn_group_id = Uuid::new_v4();

    let debit_entry = ledger_entries::ActiveModel {
        account_id: Set(OTHER_EXPENSE_ACCOUNT_ID),
        debit: Set(Some(payload.amount)),
        credit: Set(None),
        txn_date: Set(payload.expense_date),
        reference_table: Set(Some("other_expenses".to_string())),
        reference_id: Set(Some(saved_expense.id)),
        narration: Set(payload.description.or_else(|| Some("Other expense".to_string()))),
        txn_group_id: Set(txn_group_id),
        created_by: Set(Some(payload.created_by)),
        ..Default::default()
    };

    let credit_entry = ledger_entries::ActiveModel {
        account_id: Set(CASH_ACCOUNT_ID),
        debit: Set(None),
        credit: Set(Some(payload.amount)),
        txn_date: Set(payload.expense_date),
        reference_table: Set(Some("other_expenses".to_string())),
        reference_id: Set(Some(saved_expense.id)),
        narration: Set(Some("Cash paid for other expense".to_string())),
        txn_group_id: Set(txn_group_id),
        created_by: Set(Some(payload.created_by)),
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

    let mut expense_acct: ledger_accounts::ActiveModel =
        ledger_accounts::Entity::find_by_id(OTHER_EXPENSE_ACCOUNT_ID)
            .one(&txn)
            .await
            .map_err(|e| {
                error!("Failed to fetch other-expense account: {:?}", e);
                StatusCode::INTERNAL_SERVER_ERROR
            })?
            .ok_or_else(|| {
                error!("Other-expense account not found: {}", OTHER_EXPENSE_ACCOUNT_ID);
                StatusCode::INTERNAL_SERVER_ERROR
            })?
            .into();

    expense_acct.current_balance =
        Set(expense_acct.current_balance.unwrap() + payload.amount);

    expense_acct.update(&txn).await.map_err(|e| {
        error!("Failed to update other-expense account balance: {:?}", e);
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

    cash_acct.current_balance = Set(cash_acct.current_balance.unwrap() - payload.amount);

    cash_acct.update(&txn).await.map_err(|e| {
        error!("Failed to update cash account balance: {:?}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    txn.commit().await.map_err(|e| {
        error!("Failed to commit transaction: {:?}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    Ok(Json(saved_expense))
}

pub async fn get_all_other_expenses_handler(
    State(db): State<DatabaseConnection>,
) -> Result<Json<Vec<other_expenses::Model>>, StatusCode> {
    match other_expenses::Entity::find()
        .order_by_desc(other_expenses::Column::CreatedAt)
        .all(&db)
        .await
    {
        Ok(data) => Ok(Json(data)),
        Err(e) => {
            error!("Failed to fetch other expenses: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}
