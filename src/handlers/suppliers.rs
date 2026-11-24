use crate::{
    consts::{CASH_ACCOUNT_ID, LIABILITY_ACCOUNT_ID},
    handlers::purchases::{internal_error, update_account_balance},
    models::{CreateSupplierPayment, SupplierHistoryEntry, SupplierLedgerEntry, SupplierPayable},
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

#[cfg(test)]
mod history_tests {
    use super::*;

    fn purchase(
        id: i32,
        order: Option<i32>,
        amount: &str,
        date: &str,
        kind: &str,
    ) -> SupplierLedgerEntry {
        SupplierLedgerEntry {
            date: date.parse().unwrap(),
            description: "Purchase - ITEM".into(),
            reference: format!("PID-{id}"),
            amount: amount.parse().unwrap(),
            entry_type: Some(kind.into()),
            purchase_id: Some(id),
            purchase_order_id: order,
            payment_id: None,
        }
    }

    #[test]
    fn history_groups_payables_with_exact_totals_and_latest_date() {
        let rows = group_supplier_history(vec![
            purchase(1, Some(10), "0.10", "2026-11-01", "PAYABLE"),
            purchase(2, Some(10), "0.20", "2026-11-03", "PAYABLE"),
            purchase(3, Some(20), "4.50", "2026-11-02", "PAYABLE"),
        ]);
        assert_eq!(rows.len(), 2);
        assert_eq!(rows[0].entry.purchase_order_id, Some(10));
        assert_eq!(rows[0].entry.amount.to_string(), "0.30");
        assert_eq!(rows[0].entry.date.to_string(), "2026-11-03");
        assert_eq!(rows[0].entry.reference, "POID-10");
        assert_eq!(rows[0].purchases.len(), 2);
        assert_eq!(rows[0].purchases[0].purchase_id, Some(2));
        assert_eq!(rows[1].purchases.len(), 1);
        let json = serde_json::to_value(&rows).unwrap();
        assert_eq!(json[0]["reference"], "POID-10");
        assert_eq!(json[0]["purchases"][0]["purchase_id"], 2);
        assert!(
            json[0].get("entry").is_none(),
            "History fields stay at the top level"
        );
    }

    #[test]
    fn history_keeps_unlinked_purchases_cash_and_settlements_separate() {
        let mut settlement = purchase(9, None, "2.00", "2026-11-04", "SETTLEMENT");
        settlement.purchase_id = None;
        settlement.payment_id = Some(9);
        settlement.reference = "BANK-REF".into();
        let rows = group_supplier_history(vec![
            purchase(1, None, "1.00", "2026-11-01", "PAYABLE"),
            purchase(2, None, "3.00", "2026-11-01", "PAYABLE"),
            purchase(3, Some(10), "5.00", "2026-11-02", "CASH"),
            purchase(4, Some(10), "7.00", "2026-11-02", "PAYABLE"),
            settlement,
        ]);
        assert_eq!(rows.len(), 5);
        assert_eq!(rows[0].entry.reference, "BANK-REF");
        assert_eq!(rows[0].entry.amount.to_string(), "2.00");
        assert!(rows[0].purchases.is_empty());
        assert_eq!(rows.iter().filter(|r| !r.purchases.is_empty()).count(), 1);
        let group = rows.iter().find(|r| !r.purchases.is_empty()).unwrap();
        assert_eq!(group.entry.amount.to_string(), "7.00");
        assert_eq!(group.purchases[0].purchase_id, Some(4));
        let cash = rows.iter().find(|r| r.entry.purchase_id == Some(3)).unwrap();
        assert!(cash.purchases.is_empty());
        assert_eq!(cash.entry.amount.to_string(), "5.00");
        let payable_total: sea_orm::prelude::Decimal = rows
            .iter()
            .filter(|r| r.entry.entry_type.as_deref() == Some("PAYABLE"))
            .map(|r| r.entry.amount)
            .sum();
        assert_eq!(payable_total.to_string(), "11.00");
        assert!(group_supplier_history(vec![]).is_empty());
    }
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
    // History is a read-only projection: amounts remain positive and entry_type
    // determines the Liability/Cash column. Only PAYABLE purchases are grouped.

    let sql = r#"
        SELECT 
            purchase_date AS date,
            CONCAT('Purchase - ', item_code) AS description,
            CONCAT('PID-', purchase_id) AS reference,
            total_cost AS amount,
            CAST(payment_type AS TEXT) AS entry_type,
            purchase_id,
            purchase_order_id,
            NULL::integer AS payment_id
        FROM purchases 
        WHERE supplier_id = $1

        UNION ALL

        SELECT 
            payment_date AS date,
            CONCAT('Payment - ', COALESCE(payment_mode, 'Unknown')) AS description,
            COALESCE(reference_number, CONCAT('SPID-', payment_id)) AS reference,
            amount AS amount,
            'SETTLEMENT' AS entry_type,
            NULL::integer AS purchase_id,
            NULL::integer AS purchase_order_id,
            payment_id
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
        Ok(ledger) => Json(group_supplier_history(ledger)).into_response(),
        Err(e) => {
            eprintln!("Ledger Error: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR.into_response()
        }
    }
}

fn group_supplier_history(mut entries: Vec<SupplierLedgerEntry>) -> Vec<SupplierHistoryEntry> {
    // Sort before grouping so children and each group's representative date are newest first.
    entries.sort_by(|a, b| {
        b.date
            .cmp(&a.date)
            .then_with(|| b.reference.cmp(&a.reference))
            .then_with(|| b.purchase_id.cmp(&a.purchase_id))
            .then_with(|| b.payment_id.cmp(&a.payment_id))
    });
    let mut rows: Vec<SupplierHistoryEntry> = Vec::new();
    let mut orders = std::collections::HashMap::new();
    for entry in entries {
        if let Some(order_id) = entry
            .purchase_order_id
            .filter(|_| entry.entry_type.as_deref() == Some("PAYABLE"))
        {
            let index = *orders.entry(order_id).or_insert_with(|| {
                let index = rows.len();
                rows.push(SupplierHistoryEntry {
                    entry: SupplierLedgerEntry {
                        date: entry.date,
                        description: format!("Purchase Order #{order_id}"),
                        reference: format!("POID-{order_id}"),
                        amount: Default::default(),
                        entry_type: entry.entry_type.clone(),
                        purchase_id: None,
                        purchase_order_id: Some(order_id),
                        payment_id: None,
                    },
                    purchases: Vec::new(),
                });
                index
            });
            rows[index].entry.amount += entry.amount;
            rows[index].purchases.push(entry);
        } else {
            rows.push(SupplierHistoryEntry {
                entry,
                purchases: Vec::new(),
            });
        }
    }
    rows.sort_by(|a, b| {
        b.entry
            .date
            .cmp(&a.entry.date)
            .then_with(|| b.entry.reference.cmp(&a.entry.reference))
            .then_with(|| b.entry.purchase_id.cmp(&a.entry.purchase_id))
            .then_with(|| b.entry.payment_id.cmp(&a.entry.payment_id))
    });
    rows
}
