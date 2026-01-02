use crate::{
    consts::{CASH_ACCOUNT_ID, LIABILITY_ACCOUNT_ID},
    handlers::purchases::{internal_error, update_account_balance},
    models::{CreateSupplierPayment, SupplierLedgerEntry, SupplierPayable},
};
use axum::{
    extract::{Path, State},
    response::IntoResponse,
    Json,
};
use chrono::Utc;
use entity::{ledger_entries, purchases, sea_orm_active_enums::PaymentType, supplier_payments};
use reqwest::StatusCode;
use sea_orm::QueryFilter;
use sea_orm::QueryOrder;
use sea_orm::{ActiveModelTrait, DatabaseConnection, EntityTrait, Set, TransactionTrait};
use sea_orm::{ColumnTrait, DbBackend, Statement};
use uuid::Uuid;

pub async fn create_supplier_payment(
    State(db): State<DatabaseConnection>,
    Json(payload): Json<CreateSupplierPayment>,
) -> Result<Json<supplier_payments::Model>, StatusCode> {
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
    payload: &CreateSupplierPayment,
    txn_group_id: Uuid,
) -> Result<supplier_payments::Model, StatusCode> {
    let new_payment = supplier_payments::ActiveModel {
        supplier_id: Set(payload.supplier_id),
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
        .map_err(internal_error("insert supplier payment"))
}

async fn process_payment_ledger<C: TransactionTrait + sea_orm::ConnectionTrait>(
    txn: &C,
    payload: &CreateSupplierPayment,
    payment_id: i32,
    txn_group_id: Uuid,
) -> Result<(), StatusCode> {
    let amount = payload.amount;
    let supplier_acct_id = LIABILITY_ACCOUNT_ID;
    let bank_acct_id = CASH_ACCOUNT_ID;

    // When you pay a supplier, you Debit their account (Accounts Payable)
    let debit_entry = ledger_entries::ActiveModel {
        account_id: Set(supplier_acct_id),
        debit: Set(Some(amount)),
        credit: Set(None),
        txn_date: Set(payload.payment_date),
        reference_table: Set(Some("supplier_payments".into())),
        reference_id: Set(Some(payment_id)),
        narration: Set(Some(format!(
            "Payment to Supplier #{}",
            payload.supplier_id
        ))),
        txn_group_id: Set(txn_group_id),
        created_at: Set(Utc::now().into()),
        created_by: Set(Some(payload.created_by)),
        ..Default::default()
    };

    debit_entry
        .insert(txn)
        .await
        .map_err(internal_error("insert ledger debit"))?;

    // Money leaving your bank is a Credit to the Asset account
    let credit_entry = ledger_entries::ActiveModel {
        account_id: Set(bank_acct_id),
        debit: Set(None),
        credit: Set(Some(amount)),
        txn_date: Set(payload.payment_date),
        reference_table: Set(Some("supplier_payments".into())),
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

    // 1. Debit the Supplier Account (Liability) -> Liability DECREASES
    update_account_balance(txn, supplier_acct_id, Some(amount), true).await?;

    // 2. Credit the Bank Account (Asset) -> Asset DECREASES
    update_account_balance(txn, bank_acct_id, Some(amount), false).await?;

    Ok(())
}

pub async fn get_supplier_payables(
    State(db): State<DatabaseConnection>,
    Path(supplier_id): Path<i32>,
) -> Result<Json<Vec<SupplierPayable>>, StatusCode> {
    let payables = purchases::Entity::find()
        .filter(purchases::Column::SupplierId.eq(supplier_id))
        .filter(purchases::Column::PaymentType.eq(PaymentType::Payable))
        .order_by_desc(purchases::Column::PurchaseDate)
        .all(&db)
        .await
        .map_err(|e| {
            tracing::error!("Failed to fetch supplier payables: {:?}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

    let response: Vec<SupplierPayable> = payables
        .into_iter()
        .map(|p| SupplierPayable {
            purchase_id: p.purchase_id,
            purchase_date: p.purchase_date,
            item_code: p.item_code,
            quantity: p.quantity,
            total_cost: p.total_cost,
        })
        .collect();

    Ok(Json(response))
}

pub async fn get_supplier_payments_byid_handler(
    State(db): State<DatabaseConnection>,
    Path(id): Path<i32>,
) -> Result<Json<Vec<supplier_payments::Model>>, StatusCode> {
    tracing::info!("Fetching payments for supplier ID: {}", id);
    match supplier_payments::Entity::find()
        .filter(supplier_payments::Column::SupplierId.eq(id))
        .order_by_desc(supplier_payments::Column::PaymentDate)
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

pub async fn get_supplier_ledger_handler(
    State(db): State<DatabaseConnection>,
    Path(supplier_id): Path<i32>,
) -> impl IntoResponse {
    // SQL Breakdown:
    // 1. Select PURCHASES. Cast payment_type enum to text.
    //    We treat Purchase Cost as POSITIVE (+).
    // 2. UNION ALL
    // 3. Select SUPPLIER_PAYMENTS.
    //    We treat Settlements as NEGATIVE (-) to offset the debt.

    let sql = r#"
        SELECT 
            purchase_date AS date,
            CONCAT('Purchase - ', item_code) AS description,
            CONCAT('PID-', purchase_id) AS reference,
            total_cost AS amount,
            CAST(payment_type AS TEXT) AS entry_type
        FROM purchases 
        WHERE supplier_id = $1

        UNION ALL

        SELECT 
            payment_date AS date,
            CONCAT('Payment - ', COALESCE(payment_mode, 'Unknown')) AS description,
            COALESCE(reference_number, CONCAT('SPID-', payment_id)) AS reference,
            (amount) AS amount, -- Make payments negative
            'SETTLEMENT' AS entry_type
        FROM supplier_payments 
        WHERE supplier_id = $1

        ORDER BY date DESC, reference DESC
    "#;

    let result = entity::suppliers::Entity::find() // The entity here is just an anchor, doesn't matter much for raw sql
        .from_raw_sql(Statement::from_sql_and_values(
            DbBackend::Postgres,
            sql,
            vec![supplier_id.into()],
        ))
        .into_model::<SupplierLedgerEntry>()
        .all(&db)
        .await;

    match result {
        Ok(ledger) => {
            // Optional: If you want to calculate a "Running Balance" in Rust before sending:
            // You can iterate over `ledger` (reversed) to sum up values.
            Json(ledger).into_response()
        }
        Err(e) => {
            eprintln!("Ledger Error: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR.into_response()
        }
    }
}
