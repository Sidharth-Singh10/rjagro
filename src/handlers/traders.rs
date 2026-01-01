use crate::consts::{CASH_ACCOUNT_ID, RECEIVABLE_ACCOUNT_ID};
use crate::handlers::purchases::{internal_error, update_account_balance};
use crate::models::{CreateTraderPayment, TraderLedgerEntry, TraderReceivable};
use axum::extract::{Path, State};
use axum::Json;
use axum::response::IntoResponse;
use chrono::Utc;
use entity::sea_orm_active_enums::PaymentType;
use entity::{batch_sales, ledger_entries, trader_payments};
use reqwest::StatusCode;
use sea_orm::{ActiveModelTrait, DbBackend, Statement};
use sea_orm::ActiveValue::Set;
use sea_orm::QueryFilter;
use sea_orm::QueryOrder;
use sea_orm::{ColumnTrait, TransactionTrait};
use sea_orm::{DatabaseConnection, EntityTrait};
use uuid::Uuid;

pub async fn create_trader_payment(
    State(db): State<DatabaseConnection>,
    Json(payload): Json<CreateTraderPayment>,
) -> Result<Json<trader_payments::Model>, StatusCode> {
    let txn = db
        .begin()
        .await
        .map_err(internal_error("begin transaction"))?;

    let txn_group_id = Uuid::new_v4();

    let payment = insert_payment_record(&txn, &payload, txn_group_id).await?;

    process_payment_ledger(&txn, &payload, payment.payment_id, txn_group_id).await?;

    txn.commit()
        .await
        .map_err(internal_error("commit transaction"))?;

    Ok(Json(payment))
}

async fn insert_payment_record<C: TransactionTrait + sea_orm::ConnectionTrait>(
    txn: &C,
    payload: &CreateTraderPayment,
    txn_group_id: Uuid,
) -> Result<trader_payments::Model, StatusCode> {
    let new_payment = trader_payments::ActiveModel {
        trader_id: Set(payload.trader_id),
        amount: Set(payload.amount),
        payment_date: Set(payload.payment_date),
        payment_mode: Set(payload.payment_mode.clone()),
        reference_number: Set(payload.reference_number.clone()),
        notes: Set(payload.notes.clone()),
        txn_group_id: Set(Some(txn_group_id)),
        created_at: Set(Utc::now().into()),
        ..Default::default()
    };

    new_payment
        .insert(txn)
        .await
        .map_err(internal_error("insert trader payment"))
}

async fn process_payment_ledger<C: TransactionTrait + sea_orm::ConnectionTrait>(
    txn: &C,
    payload: &CreateTraderPayment,
    payment_id: i32,
    txn_group_id: Uuid,
) -> Result<(), StatusCode> {
    let amount = payload.amount;
    let receivable_account_id = RECEIVABLE_ACCOUNT_ID;
    let bank_acct_id = CASH_ACCOUNT_ID;

    let receivable_entry = ledger_entries::ActiveModel {
        account_id: Set(receivable_account_id),
        debit: Set(None),
        credit: Set(Some(amount)),
        txn_date: Set(payload.payment_date),
        reference_table: Set(Some("trader_payments".into())),
        reference_id: Set(Some(payment_id)),
        narration: Set(Some(
            format!("Received from Trader #{}", payload.trader_id,),
        )),
        txn_group_id: Set(txn_group_id),
        created_at: Set(Utc::now().into()),
        created_by: Set(Some(payload.created_by)),
        ..Default::default()
    };

    receivable_entry
        .insert(txn)
        .await
        .map_err(internal_error("insert ledger receivable"))?;

    let credit_entry = ledger_entries::ActiveModel {
        account_id: Set(bank_acct_id),
        credit: Set(None),
        debit: Set(Some(amount)),
        txn_date: Set(payload.payment_date),
        reference_table: Set(Some("trader_payments".into())),
        reference_id: Set(Some(payment_id)),
        narration: Set(Some(format!("Payment Ref: {:?}", payload.reference_number))),
        txn_group_id: Set(txn_group_id),
        created_at: Set(Utc::now().into()),
        created_by: Set(Some(payload.created_by)),
        ..Default::default()
    };

    credit_entry
        .insert(txn)
        .await
        .map_err(internal_error("insert ledger credit"))?;

    // 1. Crediting the receivable account decreases the asset
    update_account_balance(txn, receivable_account_id, Some(amount), false).await?;

    // 2. Credit the Bank Account (Asset) -> Asset DECREASES
    update_account_balance(txn, bank_acct_id, Some(amount), true).await?;

    Ok(())
}

pub async fn get_trader_receivables(
    State(db): State<DatabaseConnection>,
    Path(trader_id): Path<i32>,
) -> Result<Json<Vec<TraderReceivable>>, StatusCode> {
    let payables = batch_sales::Entity::find()
        .filter(batch_sales::Column::TraderId.eq(trader_id))
        .filter(batch_sales::Column::PaymentType.eq(PaymentType::Receivable))
        .order_by_desc(batch_sales::Column::CreatedAt)
        .all(&db)
        .await
        .map_err(|e| {
            tracing::error!("Failed to fetch trader receivables: {:?}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

    let response: Vec<TraderReceivable> = payables
        .into_iter()
        .map(|p| TraderReceivable {
            id: p.id,
            batch_id: p.batch_id,
            item_code: p.item_code,
            quantity: p.quantity,
            total_cost: p.value,
            sale_date: p.sale_date,
        })
        .collect();

    Ok(Json(response))
}

pub async fn get_trader_payments(
    State(db): State<DatabaseConnection>,
    Path(id): Path<i32>,
) -> Result<Json<Vec<trader_payments::Model>>, StatusCode> {
    tracing::info!("Fetching payments for trader ID: {}", id);
    match trader_payments::Entity::find()
        .filter(trader_payments::Column::TraderId.eq(id))
        .order_by_desc(trader_payments::Column::PaymentDate)
        .all(&db)
        .await
    {
        Ok(data) => Ok(Json(data)),
        Err(e) => {
            eprintln!("Failed to fetch supplier payments: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

pub async fn get_trader_ledger_handler(
    State(db): State<DatabaseConnection>,
    Path(trader_id): Path<i32>,
) -> impl IntoResponse {
    // SQL Breakdown:
    // 1. Select BATCH_SALES. 
    //    We treat Sales Value as POSITIVE (+) (Trader owes us money).
    // 2. UNION ALL
    // 3. Select TRADER_PAYMENTS.
    //    We treat Payments as NEGATIVE (-) (Reduces the debt).

    let sql = r#"
        SELECT 
            sale_date AS date,
            CONCAT('Sale - ', item_code) AS description,
            CONCAT('BSID-', id) AS reference,
            value AS amount,
            CAST(payment_type AS TEXT) AS entry_type
        FROM batch_sales 
        WHERE trader_id = $1

        UNION ALL

        SELECT 
            payment_date AS date,
            CONCAT('Payment - ', COALESCE(payment_mode, 'Unknown')) AS description,
            COALESCE(reference_number, CONCAT('TPID-', payment_id)) AS reference,
            (amount * -1) AS amount, -- Negate payment to decrease balance
            'SETTLEMENT' AS entry_type
        FROM trader_payments 
        WHERE trader_id = $1

        ORDER BY date DESC, reference DESC
    "#;

    // We can use any entity as the anchor for raw_sql, 
    // but batch_sales is semantically appropriate here.
    let result = batch_sales::Entity::find()
        .from_raw_sql(Statement::from_sql_and_values(
            DbBackend::Postgres,
            sql,
            vec![trader_id.into()],
        ))
        .into_model::<TraderLedgerEntry>()
        .all(&db)
        .await;

    match result {
        Ok(ledger) => Json(ledger).into_response(),
        Err(e) => {
            eprintln!("Trader Ledger Error: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR.into_response()
        }
    }
}