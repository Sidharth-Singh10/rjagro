use crate::handlers::metrics::{month_end, month_start, period_key, refresh_metrics_range};
use crate::models::{
    CreateOtherExpense, OtherExpenseCategoryTotal, OtherExpenseMonthSummary,
    OtherExpenseSummaryQuery, PaginatedOtherExpenses, PaginationParams, UpdateOtherExpense,
};
use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use chrono::{NaiveDate, Utc};
use entity::sea_orm_active_enums::OtherExpenseCategory;
use entity::*;
use sea_orm::{
    prelude::Decimal, ActiveModelTrait, ColumnTrait, ConnectionTrait, DatabaseConnection, DbBackend,
    EntityTrait, PaginatorTrait, QueryFilter, QueryOrder, Set, Statement, TransactionTrait,
};
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
        narration: Set(payload
            .description
            .or_else(|| Some("Other expense".to_string()))),
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
                error!(
                    "Other-expense account not found: {}",
                    OTHER_EXPENSE_ACCOUNT_ID
                );
                StatusCode::INTERNAL_SERVER_ERROR
            })?
            .into();

    expense_acct.current_balance = Set(expense_acct.current_balance.unwrap() + payload.amount);

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

/// Updates an existing expense and keeps its double-entry ledger pair and the
/// two account balances in sync. Because an edit can also move the expense to
/// another day or month, the stored metric snapshots for the old and new
/// periods are refreshed so the dashboard stays consistent.
pub async fn update_other_expense(
    State(db): State<DatabaseConnection>,
    Path(expense_id): Path<i32>,
    Json(payload): Json<UpdateOtherExpense>,
) -> Result<Json<other_expenses::Model>, (StatusCode, String)> {
    if payload.amount <= Decimal::ZERO {
        return Err((
            StatusCode::BAD_REQUEST,
            "Amount must be greater than zero".to_string(),
        ));
    }

    let txn = db.begin().await.map_err(|e| {
        error!("Failed to start transaction: {:?}", e);
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            "Failed to start transaction".to_string(),
        )
    })?;

    let existing = other_expenses::Entity::find_by_id(expense_id)
        .one(&txn)
        .await
        .map_err(|e| {
            error!("Failed to fetch other expense {}: {:?}", expense_id, e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Failed to fetch other expense".to_string(),
            )
        })?
        .ok_or_else(|| {
            (
                StatusCode::NOT_FOUND,
                format!("Other expense {} not found", expense_id),
            )
        })?;

    // The paired ledger entries: debit on 109 (other-expense), credit on 101 (cash).
    let entries = ledger_entries::Entity::find()
        .filter(ledger_entries::Column::ReferenceTable.eq(Some("other_expenses".to_string())))
        .filter(ledger_entries::Column::ReferenceId.eq(Some(expense_id)))
        .all(&txn)
        .await
        .map_err(|e| {
            error!(
                "Failed to fetch ledger entries for other expense {}: {:?}",
                expense_id, e
            );
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Failed to fetch ledger entries".to_string(),
            )
        })?;

    let debit_entry = entries
        .iter()
        .find(|entry| entry.account_id == OTHER_EXPENSE_ACCOUNT_ID)
        .cloned();
    let credit_entry = entries
        .iter()
        .find(|entry| entry.account_id == CASH_ACCOUNT_ID)
        .cloned();

    let (Some(debit_entry), Some(credit_entry)) = (debit_entry, credit_entry) else {
        error!(
            "Ledger entries missing for other expense {} — refusing to edit",
            expense_id
        );
        return Err((
            StatusCode::CONFLICT,
            "Ledger entries for this expense are missing — cannot edit safely".to_string(),
        ));
    };

    let old_amount = existing.amount;
    let old_date = existing.expense_date;
    let delta = payload.amount - old_amount;
    let narration = payload
        .description
        .clone()
        .or_else(|| Some("Other expense".to_string()));

    // 1. Update the expense row itself.
    let mut expense_am: other_expenses::ActiveModel = existing.into();
    expense_am.category = Set(payload.category.clone());
    expense_am.amount = Set(payload.amount);
    expense_am.description = Set(payload.description.clone());
    expense_am.expense_date = Set(payload.expense_date);

    let updated = expense_am.update(&txn).await.map_err(|e| {
        error!("Failed to update other expense {}: {:?}", expense_id, e);
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            "Failed to update other expense".to_string(),
        )
    })?;

    // 2. Keep the double-entry pair in sync.
    let mut debit_am: ledger_entries::ActiveModel = debit_entry.into();
    debit_am.debit = Set(Some(payload.amount));
    debit_am.txn_date = Set(payload.expense_date);
    debit_am.narration = Set(narration);
    debit_am.update(&txn).await.map_err(|e| {
        error!(
            "Failed to update debit ledger entry for expense {}: {:?}",
            expense_id, e
        );
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            "Failed to update ledger entry".to_string(),
        )
    })?;

    let mut credit_am: ledger_entries::ActiveModel = credit_entry.into();
    credit_am.credit = Set(Some(payload.amount));
    credit_am.txn_date = Set(payload.expense_date);
    credit_am.update(&txn).await.map_err(|e| {
        error!(
            "Failed to update credit ledger entry for expense {}: {:?}",
            expense_id, e
        );
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            "Failed to update ledger entry".to_string(),
        )
    })?;

    // 3. Move the account balances by the amount delta.
    if !delta.is_zero() {
        let mut expense_acct: ledger_accounts::ActiveModel =
            ledger_accounts::Entity::find_by_id(OTHER_EXPENSE_ACCOUNT_ID)
                .one(&txn)
                .await
                .map_err(|e| {
                    error!("Failed to fetch other-expense account: {:?}", e);
                    (
                        StatusCode::INTERNAL_SERVER_ERROR,
                        "Failed to fetch other-expense account".to_string(),
                    )
                })?
                .ok_or_else(|| {
                    error!(
                        "Other-expense account not found: {}",
                        OTHER_EXPENSE_ACCOUNT_ID
                    );
                    (
                        StatusCode::INTERNAL_SERVER_ERROR,
                        "Other-expense account not found".to_string(),
                    )
                })?
                .into();

        expense_acct.current_balance = Set(expense_acct.current_balance.unwrap() + delta);
        expense_acct.update(&txn).await.map_err(|e| {
            error!("Failed to update other-expense account balance: {:?}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Failed to update account balance".to_string(),
            )
        })?;

        let mut cash_acct: ledger_accounts::ActiveModel =
            ledger_accounts::Entity::find_by_id(CASH_ACCOUNT_ID)
                .one(&txn)
                .await
                .map_err(|e| {
                    error!("Failed to fetch cash account: {:?}", e);
                    (
                        StatusCode::INTERNAL_SERVER_ERROR,
                        "Failed to fetch cash account".to_string(),
                    )
                })?
                .ok_or_else(|| {
                    error!("Cash account not found: {}", CASH_ACCOUNT_ID);
                    (
                        StatusCode::INTERNAL_SERVER_ERROR,
                        "Cash account not found".to_string(),
                    )
                })?
                .into();

        cash_acct.current_balance = Set(cash_acct.current_balance.unwrap() - delta);
        cash_acct.update(&txn).await.map_err(|e| {
            error!("Failed to update cash account balance: {:?}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Failed to update account balance".to_string(),
            )
        })?;
    }

    txn.commit().await.map_err(|e| {
        error!("Failed to commit transaction: {:?}", e);
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            "Failed to commit transaction".to_string(),
        )
    })?;

    // 4. Refresh the stored metrics for the old and new periods. The hourly job
    //    only covers the current month, so editing an older entry needs this to
    //    keep the stored history in sync. Best-effort: a failure here must not
    //    undo the edit itself.
    let mut affected_dates: Vec<NaiveDate> = vec![old_date, payload.expense_date];
    affected_dates.sort();
    affected_dates.dedup();

    for date in affected_dates {
        for period_type in ["month", "day"] {
            let key = period_key(period_type, date);
            if let Err(e) = refresh_metrics_range(&db, period_type, &key, &key).await {
                error!("Failed to refresh {} metrics for {}: {:?}", period_type, key, e);
            }
        }
    }

    Ok(Json(updated))
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

/// One page of expenses (newest first), plus the exact totals the table needs
/// for its badge and footer.
pub async fn get_other_expenses_paginated_handler(
    State(db): State<DatabaseConnection>,
    Query(params): Query<PaginationParams>,
) -> Result<Json<PaginatedOtherExpenses>, StatusCode> {
    let page_size = params.page_size.unwrap_or(15).clamp(1, 100);
    let page = params.page.unwrap_or(1).max(1);

    let paginator = other_expenses::Entity::find()
        .order_by_desc(other_expenses::Column::CreatedAt)
        .paginate(&db, page_size);

    let items = paginator.fetch_page(page - 1).await.map_err(|e| {
        error!("Failed to fetch page {} of other expenses: {}", page, e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    // Count + sum in one aggregate so the badge and page count stay exact
    // without downloading every row.
    let totals = Statement::from_string(
        DbBackend::Postgres,
        "SELECT COUNT(*)::bigint AS total_count, COALESCE(SUM(amount), 0) AS total_amount \
         FROM other_expenses"
            .to_string(),
    );

    let (total_count, total_amount) = match db.query_one(totals).await {
        Ok(Some(row)) => (
            row.try_get::<i64>("", "total_count").unwrap_or(0).max(0) as u64,
            row.try_get::<Decimal>("", "total_amount").unwrap_or_default(),
        ),
        Ok(None) => (0, Decimal::ZERO),
        Err(e) => {
            error!("Failed to compute other expense totals: {}", e);
            return Err(StatusCode::INTERNAL_SERVER_ERROR);
        }
    };

    let total_pages = if total_count == 0 {
        0
    } else {
        (total_count + page_size - 1) / page_size
    };

    Ok(Json(PaginatedOtherExpenses {
        items,
        page,
        page_size,
        total_count,
        total_pages,
        total_amount,
    }))
}

fn summary_decode_error(e: impl std::fmt::Display) -> (StatusCode, String) {
    error!("Failed to decode other expense summary: {}", e);
    (
        StatusCode::INTERNAL_SERVER_ERROR,
        "Failed to decode other expense summary".to_string(),
    )
}

/// Per-month totals, entry counts and category splits for the Overview
/// dashboard, which only needs the current and previous month.
pub async fn get_other_expenses_summary_handler(
    State(db): State<DatabaseConnection>,
    Query(params): Query<OtherExpenseSummaryQuery>,
) -> Result<Json<Vec<OtherExpenseMonthSummary>>, (StatusCode, String)> {
    let Some(from) = month_start(&params.from) else {
        return Err((
            StatusCode::BAD_REQUEST,
            format!("Invalid from month '{}', expected YYYY-MM", params.from),
        ));
    };
    let Some(to) = month_end(&params.to) else {
        return Err((
            StatusCode::BAD_REQUEST,
            format!("Invalid to month '{}', expected YYYY-MM", params.to),
        ));
    };
    if from > to {
        return Err((
            StatusCode::BAD_REQUEST,
            "from month must not be after to month".to_string(),
        ));
    }

    let stmt = Statement::from_sql_and_values(
        DbBackend::Postgres,
        r#"
        SELECT
            to_char(expense_date, 'YYYY-MM') AS month,
            CAST(category AS text) AS category,
            SUM(amount) AS total,
            COUNT(*)::bigint AS count
        FROM
            other_expenses
        WHERE
            expense_date >= $1
            AND expense_date <= $2
        GROUP BY
            1, 2
        ORDER BY
            1, 2
        "#,
        vec![from.into(), to.into()],
    );

    let rows = db.query_all(stmt).await.map_err(|e| {
        error!("Failed to summarize other expenses: {}", e);
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            "Failed to summarize other expenses".to_string(),
        )
    })?;

    // Rows arrive grouped by month, so a new month starts a new summary.
    let mut summaries: Vec<OtherExpenseMonthSummary> = Vec::new();

    for row in rows {
        let month: String = row.try_get("", "month").map_err(summary_decode_error)?;
        let category: OtherExpenseCategory =
            row.try_get("", "category").map_err(summary_decode_error)?;
        let total: Decimal = row.try_get("", "total").map_err(summary_decode_error)?;
        let count: i64 = row.try_get("", "count").map_err(summary_decode_error)?;

        if summaries.last().map(|s| s.month != month).unwrap_or(true) {
            summaries.push(OtherExpenseMonthSummary {
                month: month.clone(),
                total: Decimal::ZERO,
                count: 0,
                by_category: Vec::new(),
            });
        }

        let summary = summaries.last_mut().expect("summary just pushed");
        summary.total += total;
        summary.count += count;
        summary.by_category.push(OtherExpenseCategoryTotal {
            category,
            total,
            count,
        });
    }

    Ok(Json(summaries))
}
