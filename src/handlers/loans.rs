use crate::{
    consts::{CASH_ACCOUNT_ID, INTEREST_ACCOUNT_ID, LOAN_ACCOUNT_ID},
    handlers::purchases::{internal_error, update_account_balance},
    models::{CreateLoan, CreateLoanPayment},
};
use axum::{
    extract::{Path, State},
    Json,
};
use chrono::Utc;
use entity::{ledger_entries, loan_payments, loans, sea_orm_active_enums::LoanStatus};
use reqwest::StatusCode;
use sea_orm::prelude::Decimal;
use sea_orm::{ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter, Set, TransactionTrait};
use uuid::Uuid;

pub async fn create_loan(
    State(db): State<DatabaseConnection>,
    Json(payload): Json<CreateLoan>,
) -> Result<Json<loans::Model>, StatusCode> {
    let txn = db
        .begin()
        .await
        .map_err(internal_error("begin transaction"))?;

    let txn_group_id = Uuid::new_v4();

    let loan = insert_loan_record(&txn, &payload, txn_group_id).await?;
    process_loan_ledger(&txn, &payload, loan.loan_id, txn_group_id).await?;

    txn.commit()
        .await
        .map_err(internal_error("commit transaction"))?;

    Ok(Json(loan))
}

async fn insert_loan_record<C: TransactionTrait + sea_orm::ConnectionTrait>(
    txn: &C,
    payload: &CreateLoan,
    txn_group_id: Uuid,
) -> Result<loans::Model, StatusCode> {
    let new_loan = loans::ActiveModel {
        lender_name: Set(payload.lender_name.clone()),
        principal_amount: Set(payload.principal_amount),
        interest_rate: Set(payload.interest_rate),
        loan_date: Set(payload.loan_date),
        due_date: Set(payload.due_date),
        outstanding_balance: Set(payload.principal_amount),
        status: Set(LoanStatus::Active),
        txn_group_id: Set(Some(txn_group_id)),
        notes: Set(payload.notes.clone()),
        created_at: Set(Some(Utc::now().into())),
        created_by: Set(Some(payload.created_by)),
        ..Default::default()
    };

    new_loan
        .insert(txn)
        .await
        .map_err(internal_error("insert loan"))
}

async fn process_loan_ledger<C: TransactionTrait + sea_orm::ConnectionTrait>(
    txn: &C,
    payload: &CreateLoan,
    loan_id: i32,
    txn_group_id: Uuid,
) -> Result<(), StatusCode> {
    let amount = payload.principal_amount;

    // Debit cash (asset) -> cash INCREASES (you received money)
    let debit_entry = ledger_entries::ActiveModel {
        account_id: Set(CASH_ACCOUNT_ID),
        debit: Set(Some(amount)),
        credit: Set(None),
        txn_date: Set(payload.loan_date),
        reference_table: Set(Some("loans".into())),
        reference_id: Set(Some(loan_id)),
        narration: Set(Some(format!("Loan received from {}", payload.lender_name))),
        txn_group_id: Set(txn_group_id),
        created_at: Set(Utc::now().into()),
        created_by: Set(Some(payload.created_by)),
        ..Default::default()
    };

    debit_entry
        .insert(txn)
        .await
        .map_err(internal_error("insert ledger debit"))?;

    // Credit loan (liability) -> loan INCREASES (you now owe this amount)
    let credit_entry = ledger_entries::ActiveModel {
        account_id: Set(LOAN_ACCOUNT_ID),
        debit: Set(None),
        credit: Set(Some(amount)),
        txn_date: Set(payload.loan_date),
        reference_table: Set(Some("loans".into())),
        reference_id: Set(Some(loan_id)),
        narration: Set(Some(format!("Loan liability from {}", payload.lender_name))),
        txn_group_id: Set(txn_group_id),
        created_at: Set(Utc::now().into()),
        created_by: Set(Some(payload.created_by)),
        ..Default::default()
    };

    credit_entry
        .insert(txn)
        .await
        .map_err(internal_error("insert ledger credit"))?;

    // Debit cash (asset) -> asset INCREASES
    update_account_balance(txn, CASH_ACCOUNT_ID, Some(amount), true).await?;

    // Credit loan (liability) -> liability INCREASES
    update_account_balance(txn, LOAN_ACCOUNT_ID, Some(amount), false).await?;

    Ok(())
}

pub async fn delete_loan(
    State(db): State<DatabaseConnection>,
    Path(loan_id): Path<i32>,
) -> Result<StatusCode, StatusCode> {
    let txn = db
        .begin()
        .await
        .map_err(internal_error("begin transaction"))?;

    // Verify the loan exists
    let _loan = loans::Entity::find_by_id(loan_id)
        .one(&txn)
        .await
        .map_err(internal_error("fetch loan"))?
        .ok_or(StatusCode::NOT_FOUND)?;

    // Reverse ledger entry effects on account balances
    let entries = ledger_entries::Entity::find()
        .filter(ledger_entries::Column::ReferenceTable.eq(Some("loans".to_string())))
        .filter(ledger_entries::Column::ReferenceId.eq(Some(loan_id)))
        .all(&txn)
        .await
        .map_err(internal_error("fetch ledger entries"))?;

    for entry in entries.iter() {
        if let Some(debit) = entry.debit {
            // Original was a debit, reverse it as credit
            update_account_balance(&txn, entry.account_id, Some(debit), false).await?;
        }
        if let Some(credit) = entry.credit {
            // Original was a credit, reverse it as debit
            update_account_balance(&txn, entry.account_id, Some(credit), true).await?;
        }
    }

    // Delete ledger entries
    ledger_entries::Entity::delete_many()
        .filter(ledger_entries::Column::ReferenceTable.eq(Some("loans".to_string())))
        .filter(ledger_entries::Column::ReferenceId.eq(Some(loan_id)))
        .exec(&txn)
        .await
        .map_err(internal_error("delete ledger entries"))?;

    // Delete the loan
    loans::Entity::delete_by_id(loan_id)
        .exec(&txn)
        .await
        .map_err(internal_error("delete loan"))?;

    txn.commit()
        .await
        .map_err(internal_error("commit transaction"))?;

    Ok(StatusCode::NO_CONTENT)
}

// ── Loan Payments ──

pub async fn create_loan_payment(
    State(db): State<DatabaseConnection>,
    Json(payload): Json<CreateLoanPayment>,
) -> Result<Json<loan_payments::Model>, StatusCode> {
    let txn = db
        .begin()
        .await
        .map_err(internal_error("begin transaction"))?;

    let txn_group_id = Uuid::new_v4();

    let loan = loans::Entity::find_by_id(payload.loan_id)
        .one(&txn)
        .await
        .map_err(internal_error("fetch loan"))?
        .ok_or(StatusCode::NOT_FOUND)?;

    let payment = insert_loan_payment_record(&txn, &payload, txn_group_id).await?;
    process_loan_payment_ledger(&txn, &payload, payment.payment_id, txn_group_id, &loan).await?;
    update_loan_outstanding(&txn, &loan, payload.principal_amount, false).await?;

    txn.commit()
        .await
        .map_err(internal_error("commit transaction"))?;

    Ok(Json(payment))
}

async fn insert_loan_payment_record<C: TransactionTrait + sea_orm::ConnectionTrait>(
    txn: &C,
    payload: &CreateLoanPayment,
    txn_group_id: Uuid,
) -> Result<loan_payments::Model, StatusCode> {
    let new_payment = loan_payments::ActiveModel {
        loan_id: Set(payload.loan_id),
        principal_amount: Set(payload.principal_amount),
        interest_amount: Set(payload.interest_amount),
        total_amount: Set(payload.total_amount),
        payment_date: Set(payload.payment_date),
        payment_mode: Set(payload.payment_mode.clone()),
        reference_number: Set(payload.reference_number.clone()),
        txn_group_id: Set(Some(txn_group_id)),
        notes: Set(payload.notes.clone()),
        created_at: Set(Some(Utc::now().into())),
        created_by: Set(Some(payload.created_by)),
        ..Default::default()
    };

    new_payment
        .insert(txn)
        .await
        .map_err(internal_error("insert loan payment"))
}

async fn process_loan_payment_ledger<C: TransactionTrait + sea_orm::ConnectionTrait>(
    txn: &C,
    payload: &CreateLoanPayment,
    payment_id: i32,
    txn_group_id: Uuid,
    loan: &loans::Model,
) -> Result<(), StatusCode> {
    let total = payload.total_amount;
    let principal = payload.principal_amount;
    let interest = payload.interest_amount;

    // 1. Debit loan (liability) for principal -> loan DECREASES
    if principal > Decimal::ZERO {
        let entry = ledger_entries::ActiveModel {
            account_id: Set(LOAN_ACCOUNT_ID),
            debit: Set(Some(principal)),
            credit: Set(None),
            txn_date: Set(payload.payment_date),
            reference_table: Set(Some("loan_payments".into())),
            reference_id: Set(Some(payment_id)),
            narration: Set(Some(format!(
                "Loan principal repayment to {}",
                loan.lender_name
            ))),
            txn_group_id: Set(txn_group_id),
            created_at: Set(Utc::now().into()),
            created_by: Set(Some(payload.created_by)),
            ..Default::default()
        };
        entry
            .insert(txn)
            .await
            .map_err(internal_error("insert ledger debit - loan"))?;

        update_account_balance(txn, LOAN_ACCOUNT_ID, Some(principal), true).await?;
    }

    // 2. Debit interest (expense) -> interest INCREASES
    if interest > Decimal::ZERO {
        let entry = ledger_entries::ActiveModel {
            account_id: Set(INTEREST_ACCOUNT_ID),
            debit: Set(Some(interest)),
            credit: Set(None),
            txn_date: Set(payload.payment_date),
            reference_table: Set(Some("loan_payments".into())),
            reference_id: Set(Some(payment_id)),
            narration: Set(Some(format!(
                "Interest paid on loan from {}",
                loan.lender_name
            ))),
            txn_group_id: Set(txn_group_id),
            created_at: Set(Utc::now().into()),
            created_by: Set(Some(payload.created_by)),
            ..Default::default()
        };
        entry
            .insert(txn)
            .await
            .map_err(internal_error("insert ledger debit - interest"))?;

        update_account_balance(txn, INTEREST_ACCOUNT_ID, Some(interest), true).await?;
    }

    // 3. Credit cash (asset) for total -> cash DECREASES
    let credit_entry = ledger_entries::ActiveModel {
        account_id: Set(CASH_ACCOUNT_ID),
        debit: Set(None),
        credit: Set(Some(total)),
        txn_date: Set(payload.payment_date),
        reference_table: Set(Some("loan_payments".into())),
        reference_id: Set(Some(payment_id)),
        narration: Set(Some(format!(
            "Loan payment to {}",
            loan.lender_name
        ))),
        txn_group_id: Set(txn_group_id),
        created_at: Set(Utc::now().into()),
        created_by: Set(Some(payload.created_by)),
        ..Default::default()
    };

    credit_entry
        .insert(txn)
        .await
        .map_err(internal_error("insert ledger credit - cash"))?;

    update_account_balance(txn, CASH_ACCOUNT_ID, Some(total), false).await?;

    Ok(())
}

/// Adjust the loan's outstanding_balance. `subtract = true` means decrease (payment), `false` means increase (reversal).
async fn update_loan_outstanding<C: TransactionTrait + sea_orm::ConnectionTrait>(
    txn: &C,
    loan: &loans::Model,
    principal: Decimal,
    add_back: bool,
) -> Result<(), StatusCode> {
    let new_balance = if add_back {
        loan.outstanding_balance + principal
    } else {
        loan.outstanding_balance - principal
    };

    let mut active_loan: loans::ActiveModel = loan.clone().into();
    active_loan.outstanding_balance = Set(new_balance);
    active_loan
        .update(txn)
        .await
        .map_err(internal_error("update loan outstanding balance"))?;

    Ok(())
}

pub async fn delete_loan_payment(
    State(db): State<DatabaseConnection>,
    Path(payment_id): Path<i32>,
) -> Result<StatusCode, StatusCode> {
    let txn = db
        .begin()
        .await
        .map_err(internal_error("begin transaction"))?;

    let payment = loan_payments::Entity::find_by_id(payment_id)
        .one(&txn)
        .await
        .map_err(internal_error("fetch loan payment"))?
        .ok_or(StatusCode::NOT_FOUND)?;

    let loan = loans::Entity::find_by_id(payment.loan_id)
        .one(&txn)
        .await
        .map_err(internal_error("fetch loan"))?
        .ok_or(StatusCode::NOT_FOUND)?;

    // Reverse ledger entry effects on account balances
    let entries = ledger_entries::Entity::find()
        .filter(ledger_entries::Column::ReferenceTable.eq(Some("loan_payments".to_string())))
        .filter(ledger_entries::Column::ReferenceId.eq(Some(payment_id)))
        .all(&txn)
        .await
        .map_err(internal_error("fetch ledger entries"))?;

    for entry in entries.iter() {
        if let Some(debit) = entry.debit {
            update_account_balance(&txn, entry.account_id, Some(debit), false).await?;
        }
        if let Some(credit) = entry.credit {
            update_account_balance(&txn, entry.account_id, Some(credit), true).await?;
        }
    }

    // Delete ledger entries
    ledger_entries::Entity::delete_many()
        .filter(ledger_entries::Column::ReferenceTable.eq(Some("loan_payments".to_string())))
        .filter(ledger_entries::Column::ReferenceId.eq(Some(payment_id)))
        .exec(&txn)
        .await
        .map_err(internal_error("delete ledger entries"))?;

    // Restore the loan outstanding balance
    update_loan_outstanding(&txn, &loan, payment.principal_amount, true).await?;

    // Delete the payment
    loan_payments::Entity::delete_by_id(payment_id)
        .exec(&txn)
        .await
        .map_err(internal_error("delete loan payment"))?;

    txn.commit()
        .await
        .map_err(internal_error("commit transaction"))?;

    Ok(StatusCode::NO_CONTENT)
}
