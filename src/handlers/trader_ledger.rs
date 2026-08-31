use chrono::NaiveDate;
use entity::sea_orm_active_enums::{LedgerEntryType, OrderStatus, PaymentMode, UserRole};
use entity::{app_traders, orders, trader_ledger_entries};
use sea_orm::prelude::Decimal;
use sea_orm::{ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter, Set};

use crate::models::{
    CreateTraderPaymentPayload, LedgerEntryView, LedgerStatementQuery, TraderLedgerResponse,
};
use axum::{
    extract::{Extension, Path, Query, State},
    http::StatusCode,
    Json,
};

/// Admin/Accountant/Supervisor may view any trader; a Trader may only access their own ledger.
fn authorize(role: &UserRole, sub: &str, trader_id: i32) -> Result<(), StatusCode> {
    match role {
        UserRole::Admin | UserRole::Accountant | UserRole::Supervisor => Ok(()),
        UserRole::Trader => {
            let uid = sub.parse::<i32>().map_err(|_| StatusCode::UNAUTHORIZED)?;
            if uid == trader_id {
                Ok(())
            } else {
                Err(StatusCode::FORBIDDEN)
            }
        }
    }
}

fn payment_mode_str(m: Option<PaymentMode>) -> String {
    match m {
        Some(PaymentMode::Cash) => "cash".to_string(),
        Some(PaymentMode::Bank) => "bank".to_string(),
        None => String::new(),
    }
}

fn debit_date(o: &orders::Model) -> NaiveDate {
    o.confirmed_at.unwrap_or(o.created_at).date_naive()
}

/// GET /ledger/traders/{id}
pub async fn trader_ledger_handler(
    State(db): State<DatabaseConnection>,
    Path(trader_id): Path<i32>,
    Extension(sub): Extension<String>,
    Extension(role): Extension<UserRole>,
) -> Result<Json<TraderLedgerResponse>, StatusCode> {
    authorize(&role, &sub, trader_id)?;
    Ok(Json(build_ledger(&db, trader_id, None, None).await?))
}

/// GET /ledger/traders/{id}/statement?from&to
pub async fn trader_statement_handler(
    State(db): State<DatabaseConnection>,
    Path(trader_id): Path<i32>,
    Query(params): Query<LedgerStatementQuery>,
    Extension(sub): Extension<String>,
    Extension(role): Extension<UserRole>,
) -> Result<Json<TraderLedgerResponse>, StatusCode> {
    authorize(&role, &sub, trader_id)?;
    Ok(Json(
        build_ledger(&db, trader_id, params.from, params.to).await?,
    ))
}

/// POST /ledger/traders/{id}/payments
pub async fn create_trader_payment_handler(
    State(db): State<DatabaseConnection>,
    Path(trader_id): Path<i32>,
    Extension(sub): Extension<String>,
    Extension(role): Extension<UserRole>,
    Json(payload): Json<CreateTraderPaymentPayload>,
) -> Result<Json<LedgerEntryView>, StatusCode> {
    authorize(&role, &sub, trader_id)?;

    let trader_exists = app_traders::Entity::find_by_id(trader_id)
        .one(&db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .is_some();
    if !trader_exists {
        return Err(StatusCode::NOT_FOUND);
    }

    if payload.amount <= Decimal::ZERO {
        return Err(StatusCode::BAD_REQUEST);
    }

    let mode = match payload.payment_mode.to_lowercase().as_str() {
        "cash" => PaymentMode::Cash,
        "bank" => PaymentMode::Bank,
        _ => return Err(StatusCode::BAD_REQUEST),
    };

    let entry = trader_ledger_entries::ActiveModel {
        trader_id: Set(trader_id),
        order_id: Set(None),
        entry_type: Set(LedgerEntryType::Payment),
        amount: Set(payload.amount),
        payment_mode: Set(Some(mode)),
        screenshot_url: Set(payload.screenshot_url),
        ..Default::default()
    };

    let inserted = entry
        .insert(&db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(LedgerEntryView {
        id: Some(inserted.id),
        order_id: None,
        inquiry_number: None,
        entry_type: "payment".to_string(),
        amount: inserted.amount,
        payment_mode: Some(payment_mode_str(inserted.payment_mode)),
        screenshot_url: inserted.screenshot_url,
        created_at: inserted.created_at,
    }))
}

/// Debits are derived from CONFIRMED orders; payments come from the
/// trader_ledger_entries table. Optionally filtered to a date range.
async fn build_ledger(
    db: &DatabaseConnection,
    trader_id: i32,
    from: Option<NaiveDate>,
    to: Option<NaiveDate>,
) -> Result<TraderLedgerResponse, StatusCode> {
    let confirmed = orders::Entity::find()
        .filter(orders::Column::TraderId.eq(trader_id))
        .filter(orders::Column::Status.eq(OrderStatus::Confirmed))
        .all(db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let payments = trader_ledger_entries::Entity::find()
        .filter(trader_ledger_entries::Column::TraderId.eq(trader_id))
        .filter(trader_ledger_entries::Column::EntryType.eq(LedgerEntryType::Payment))
        .all(db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Manual debits (e.g. batch sales recorded directly from the web app)
    // are stored in trader_ledger_entries with entry_type = debit.
    let manual_debits = trader_ledger_entries::Entity::find()
        .filter(trader_ledger_entries::Column::TraderId.eq(trader_id))
        .filter(trader_ledger_entries::Column::EntryType.eq(LedgerEntryType::Debit))
        .all(db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let in_range = |d: NaiveDate| -> bool {
        let ok_from = from.map(|f| d >= f).unwrap_or(true);
        let ok_to = to.map(|t| d <= t).unwrap_or(true);
        ok_from && ok_to
    };

    let mut total_debits = Decimal::ZERO;
    let mut total_payments = Decimal::ZERO;
    let mut entries: Vec<LedgerEntryView> = Vec::new();

    for o in confirmed {
        if !in_range(debit_date(&o)) {
            continue;
        }
        let amount = o.total_amount.unwrap_or_default();
        total_debits += amount;
        entries.push(LedgerEntryView {
            id: None,
            order_id: Some(o.order_id),
            inquiry_number: Some(o.inquiry_number),
            entry_type: "debit".to_string(),
            amount,
            payment_mode: None,
            screenshot_url: None,
            created_at: o.confirmed_at.unwrap_or(o.created_at),
        });
    }

    for p in payments {
        let d = p.created_at.date_naive();
        if !in_range(d) {
            continue;
        }
        total_payments += p.amount;
        entries.push(LedgerEntryView {
            id: Some(p.id),
            order_id: p.order_id,
            inquiry_number: None,
            entry_type: "payment".to_string(),
            amount: p.amount,
            payment_mode: Some(payment_mode_str(p.payment_mode)),
            screenshot_url: p.screenshot_url,
            created_at: p.created_at,
        });
    }

    for d in manual_debits {
        let date = d.created_at.date_naive();
        if !in_range(date) {
            continue;
        }
        total_debits += d.amount;
        entries.push(LedgerEntryView {
            id: Some(d.id),
            order_id: d.order_id,
            inquiry_number: None,
            entry_type: "debit".to_string(),
            amount: d.amount,
            payment_mode: None,
            screenshot_url: None,
            created_at: d.created_at,
        });
    }

    entries.sort_by(|a, b| b.created_at.cmp(&a.created_at));

    Ok(TraderLedgerResponse {
        trader_id,
        total_debits,
        total_payments,
        balance: total_debits - total_payments,
        entries,
    })
}
