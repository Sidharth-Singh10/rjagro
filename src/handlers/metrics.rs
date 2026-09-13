//! Stored history of financial & operational metrics.
//!
//! Metrics are computed from the source-of-truth tables (batch sales, batch
//! closures, ledger entries, other expenses, batches, allocations) and stored
//! one row per (period_type, period_key, metric_key) in `metric_snapshots`.
//!
//! Periods:
//!   * `month` → key `YYYY-MM`
//!   * `day`   → key `YYYY-MM-DD`
//!
//! Point-in-time balance metrics (cash, inventory, receivables, ...) are
//! anchored to `ledger_accounts.current_balance` and back-computed by removing
//! the signed ledger entries after the period end. This keeps historical
//! balances consistent with the live books even when opening balances were
//! never posted as ledger entries.

use crate::models::{MetricSnapshotQuery, RefreshMetricsBody, RefreshMetricsResponse};
use axum::{
    extract::{Query, State},
    http::StatusCode,
    Json,
};
use chrono::{DateTime, Datelike, FixedOffset, NaiveDate, Utc};
use entity::{
    batch_closure_summary, batch_sales, batches, ledger_accounts, ledger_entries,
    metric_snapshots, other_expenses,
    sea_orm_active_enums::LedgerAccountType,
};
use sea_orm::{
    prelude::Decimal, sea_query::OnConflict, ColumnTrait, ConnectionTrait, DatabaseConnection,
    DbBackend, DbErr, EntityTrait, QueryFilter, QueryOrder, Set, Statement,
};
use std::collections::{HashMap, HashSet};
use tracing::error;

// ─── Ledger account ids (mirrors src/consts.rs) ──────────────────────────────
const CASH_ACCOUNT_ID: i32 = 101;
const MEDICINE_INVENTORY_ACCOUNT_ID: i32 = 102;
const FEED_INVENTORY_ACCOUNT_ID: i32 = 103;
const CHICKS_INVENTORY_ACCOUNT_ID: i32 = 104;
const LIABILITY_ACCOUNT_ID: i32 = 105;
const COMMISSION_ACCOUNT_ID: i32 = 106;
const RECEIVABLE_ACCOUNT_ID: i32 = 110;
const LOAN_ACCOUNT_ID: i32 = 111;
const INTEREST_ACCOUNT_ID: i32 = 112;

/// Metric keys stored for every month.
#[allow(dead_code)] // canonical key list; consumed by clients via the API
pub const MONTHLY_METRICS: [&str; 29] = [
    "revenue",
    "revenue_closed",
    "cogs",
    "gross_profit",
    "gross_margin_pct",
    "other_expenses",
    "commission",
    "interest",
    "net_profit",
    "net_margin_pct",
    "kg_sold",
    "kg_closed",
    "revenue_per_kg",
    "breakeven_per_kg",
    "margin_per_kg",
    "cash_in",
    "cash_out",
    "net_cash_flow",
    "cash_balance",
    "receivables",
    "payables",
    "inventory_value",
    "working_capital",
    "outstanding_loans",
    "birds_placed",
    "birds_sold",
    "mortality_pct",
    "feed_consumed_kg",
    "fcr",
];

/// Metric keys stored for every day (daily chart granularity).
#[allow(dead_code)] // canonical key list; consumed by clients via the API
pub const DAILY_METRICS: [&str; 6] = [
    "revenue",
    "kg_sold",
    "revenue_per_kg",
    "cash_in",
    "cash_out",
    "net_cash_flow",
];

#[derive(Debug, Clone)]
struct Period {
    key: String,
    start: NaiveDate,
    end: NaiveDate,
}

// ─── Date helpers ────────────────────────────────────────────────────────────

fn month_key(date: NaiveDate) -> String {
    format!("{:04}-{:02}", date.year(), date.month())
}

fn day_key(date: NaiveDate) -> String {
    date.format("%Y-%m-%d").to_string()
}

fn period_key(period_type: &str, date: NaiveDate) -> String {
    if period_type == "day" {
        day_key(date)
    } else {
        month_key(date)
    }
}

fn last_day_of_month(date: NaiveDate) -> NaiveDate {
    let (year, month) = (date.year(), date.month());
    let (next_year, next_month) = if month == 12 {
        (year + 1, 1)
    } else {
        (year, month + 1)
    };
    NaiveDate::from_ymd_opt(next_year, next_month, 1)
        .expect("valid first of month")
        .pred_opt()
        .expect("valid last day of month")
}

fn period_for_key(period_type: &str, key: &str) -> Option<Period> {
    if period_type == "day" {
        let date = NaiveDate::parse_from_str(key, "%Y-%m-%d").ok()?;
        Some(Period {
            key: key.to_string(),
            start: date,
            end: date,
        })
    } else {
        let start = NaiveDate::parse_from_str(&format!("{key}-01"), "%Y-%m-%d").ok()?;
        Some(Period {
            key: key.to_string(),
            start,
            end: last_day_of_month(start),
        })
    }
}

fn periods_between(period_type: &str, from: NaiveDate, to: NaiveDate) -> Vec<Period> {
    let mut periods = Vec::new();
    if from > to {
        return periods;
    }
    if period_type == "day" {
        let mut date = from;
        while date <= to {
            periods.push(Period {
                key: day_key(date),
                start: date,
                end: date,
            });
            date = match date.succ_opt() {
                Some(next) => next,
                None => break,
            };
        }
    } else {
        let mut cursor = NaiveDate::from_ymd_opt(from.year(), from.month(), 1)
            .expect("valid first of month");
        while cursor <= to {
            periods.push(Period {
                key: month_key(cursor),
                start: cursor,
                end: last_day_of_month(cursor),
            });
            cursor = if cursor.month() == 12 {
                NaiveDate::from_ymd_opt(cursor.year() + 1, 1, 1).expect("valid next year")
            } else {
                NaiveDate::from_ymd_opt(cursor.year(), cursor.month() + 1, 1)
                    .expect("valid next month")
            };
        }
    }
    periods
}

fn day_start_utc(date: NaiveDate) -> DateTime<FixedOffset> {
    let offset = FixedOffset::east_opt(0).expect("valid UTC offset");
    DateTime::<FixedOffset>::from_naive_utc_and_offset(
        date.and_hms_opt(0, 0, 0).expect("valid midnight"),
        offset,
    )
}

// ─── Math helpers ────────────────────────────────────────────────────────────

fn pct(numerator: Decimal, denominator: Decimal) -> Decimal {
    if denominator.is_zero() {
        Decimal::ZERO
    } else {
        (numerator / denominator * Decimal::from(100)).round_dp(2)
    }
}

fn ratio(numerator: Decimal, denominator: Decimal) -> Decimal {
    if denominator.is_zero() {
        Decimal::ZERO
    } else {
        (numerator / denominator).round_dp(2)
    }
}

fn is_debit_normal(account_type: &LedgerAccountType) -> bool {
    matches!(
        account_type,
        LedgerAccountType::Asset | LedgerAccountType::Expense
    )
}

fn signed_amount(entry: &ledger_entries::Model, debit_normal: bool) -> Decimal {
    let debit = entry.debit.unwrap_or_default();
    let credit = entry.credit.unwrap_or_default();
    if debit_normal {
        debit - credit
    } else {
        credit - debit
    }
}

// ─── Source data queries ─────────────────────────────────────────────────────

/// Earliest date any financial activity exists, across all source tables.
pub async fn earliest_activity_date(db: &DatabaseConnection) -> Result<Option<NaiveDate>, DbErr> {
    let stmt = Statement::from_string(
        DbBackend::Postgres,
        r#"
        SELECT
            MIN(d) AS earliest
        FROM (
            SELECT MIN(created_at)::date AS d FROM batch_sales
            UNION ALL
            SELECT MIN(start_date) FROM batches
            UNION ALL
            SELECT MIN(txn_date) FROM ledger_entries
            UNION ALL
            SELECT MIN(expense_date) FROM other_expenses
            UNION ALL
            SELECT MIN(end_date) FROM batch_closure_summary
            UNION ALL
            SELECT MIN(allocation_date) FROM batch_allocations
        ) activities
        "#
        .to_string(),
    );
    let row = db.query_one(stmt).await?;
    match row {
        Some(row) => Ok(row.try_get::<Option<NaiveDate>>("", "earliest")?),
        None => Ok(None),
    }
}

/// Feed consumed (kg) per period, based on allocation lines joined to items.
/// Bag-denominated feed is converted at 50 kg/bag; "FEED DELIVERY" is skipped.
async fn feed_kg_by_period(
    db: &DatabaseConnection,
    period_type: &str,
    start: NaiveDate,
    end: NaiveDate,
) -> Result<HashMap<String, Decimal>, DbErr> {
    let stmt = Statement::from_sql_and_values(
        DbBackend::Postgres,
        r#"
        SELECT
            CASE
                WHEN $1::text = 'month' THEN to_char(ba.allocation_date, 'YYYY-MM')
                ELSE to_char(ba.allocation_date, 'YYYY-MM-DD')
            END AS period_key,
            SUM(
                CASE
                    WHEN LOWER(i.unit) = 'bags' THEN bal.qty * 50
                    ELSE bal.qty
                END
            ) AS feed_kg
        FROM batch_allocation_lines bal
            JOIN batch_allocations ba ON ba.allocation_id = bal.allocation_id
            JOIN stock_receipts sr ON sr.lot_id = bal.lot_id
            JOIN items i ON i.item_code = sr.item_code
        WHERE i.item_category = 'feed'
            AND UPPER(i.item_name) <> 'FEED DELIVERY'
            AND ba.allocation_date BETWEEN $2 AND $3
        GROUP BY 1
        "#,
        vec![period_type.into(), start.into(), end.into()],
    );
    let rows = db.query_all(stmt).await?;
    let mut map = HashMap::new();
    for row in rows {
        let key: String = row.try_get("", "period_key")?;
        let kg: Decimal = row.try_get("", "feed_kg")?;
        map.insert(key, kg);
    }
    Ok(map)
}

// ─── Snapshot computation ────────────────────────────────────────────────────

/// Recomputes and upserts every snapshot for the given period range.
/// Returns the number of period-key/metric rows written.
pub async fn refresh_metrics_range(
    db: &DatabaseConnection,
    period_type: &str,
    from_key: &str,
    to_key: &str,
) -> Result<usize, DbErr> {
    if period_type != "day" && period_type != "month" {
        return Err(DbErr::Custom(format!(
            "invalid period_type '{period_type}', expected 'day' or 'month'"
        )));
    }

    let from_period = period_for_key(period_type, from_key).ok_or_else(|| {
        DbErr::Custom(format!("invalid from period key '{from_key}' for {period_type}"))
    })?;
    let to_period = period_for_key(period_type, to_key)
        .ok_or_else(|| DbErr::Custom(format!("invalid to period key '{to_key}' for {period_type}")))?;

    let periods = periods_between(period_type, from_period.start, to_period.start);
    if periods.is_empty() {
        return Ok(0);
    }

    let range_start = periods.first().expect("non-empty").start;
    let range_end = periods.last().expect("non-empty").end;
    let is_daily = period_type == "day";

    // ── Fetch source rows once for the whole range ──────────────────────────
    let range_start_dt = day_start_utc(range_start);
    let range_end_exclusive_dt = day_start_utc(
        range_end
            .succ_opt()
            .unwrap_or(range_end),
    );

    let sales = batch_sales::Entity::find()
        .filter(batch_sales::Column::CreatedAt.gte(range_start_dt))
        .filter(batch_sales::Column::CreatedAt.lt(range_end_exclusive_dt))
        .all(db)
        .await?;

    let closures = batch_closure_summary::Entity::find()
        .filter(batch_closure_summary::Column::EndDate.gte(range_start))
        .filter(batch_closure_summary::Column::EndDate.lte(range_end))
        .all(db)
        .await?;

    // Sales for batches that closed inside the range (used for per-kg metrics).
    let closed_batch_ids: Vec<i32> = closures.iter().map(|c| c.batch_id).collect();
    let closed_batch_sales = if closed_batch_ids.is_empty() {
        Vec::new()
    } else {
        batch_sales::Entity::find()
            .filter(batch_sales::Column::BatchId.is_in(closed_batch_ids.clone()))
            .all(db)
            .await?
    };

    // Ledger entries from range start onwards: covers in-period flows plus the
    // suffix needed to back-compute balances at each period end.
    let entries = ledger_entries::Entity::find()
        .filter(ledger_entries::Column::TxnDate.gte(range_start))
        .order_by_asc(ledger_entries::Column::TxnDate)
        .all(db)
        .await?;

    let expenses = other_expenses::Entity::find()
        .filter(other_expenses::Column::ExpenseDate.gte(range_start))
        .filter(other_expenses::Column::ExpenseDate.lte(range_end))
        .all(db)
        .await?;

    let placed_batches = batches::Entity::find()
        .filter(batches::Column::StartDate.gte(range_start))
        .filter(batches::Column::StartDate.lte(range_end))
        .all(db)
        .await?;

    let accounts = ledger_accounts::Entity::find().all(db).await?;
    let account_types: HashMap<i32, bool> = accounts
        .iter()
        .map(|a| (a.account_id, is_debit_normal(&a.account_type)))
        .collect();
    let account_balances: HashMap<i32, Decimal> = accounts
        .iter()
        .map(|a| (a.account_id, a.current_balance))
        .collect();

    let feed_by_period = feed_kg_by_period(db, period_type, range_start, range_end).await?;

    // ── Aggregate per period ────────────────────────────────────────────────
    let mut rows: Vec<metric_snapshots::ActiveModel> = Vec::new();

    let balance_at = |account_id: i32, period_end: NaiveDate| -> Decimal {
        let current = account_balances
            .get(&account_id)
            .copied()
            .unwrap_or_default();
        let debit_normal = account_types.get(&account_id).copied().unwrap_or(true);
        let suffix: Decimal = entries
            .iter()
            .filter(|e| e.account_id == account_id && e.txn_date > period_end)
            .map(|e| signed_amount(e, debit_normal))
            .sum();
        current - suffix
    };

    for period in &periods {
        let period_sales: Vec<&batch_sales::Model> = sales
            .iter()
            .filter(|s| {
                let date = s.created_at.date_naive();
                date >= period.start && date <= period.end
            })
            .collect();

        let period_flows: Vec<&ledger_entries::Model> = entries
            .iter()
            .filter(|e| e.txn_date >= period.start && e.txn_date <= period.end)
            .collect();

        let period_account_net = |account_id: i32, debit_normal: bool| -> Decimal {
            period_flows
                .iter()
                .filter(|e| e.account_id == account_id)
                .map(|e| signed_amount(e, debit_normal))
                .sum()
        };

        let cash_in: Decimal = period_flows
            .iter()
            .filter(|e| e.account_id == CASH_ACCOUNT_ID)
            .map(|e| e.debit.unwrap_or_default())
            .sum();
        let cash_out: Decimal = period_flows
            .iter()
            .filter(|e| e.account_id == CASH_ACCOUNT_ID)
            .map(|e| e.credit.unwrap_or_default())
            .sum();
        let net_cash_flow = cash_in - cash_out;

        let revenue: Decimal = period_sales.iter().map(|s| s.value).sum();
        let kg_sold: Decimal = period_sales.iter().map(|s| s.avg_weight).sum();

        let mut push = |metric: &str, value: Decimal| {
            rows.push(metric_snapshots::ActiveModel {
                period_type: Set(period_type.to_string()),
                period_key: Set(period.key.clone()),
                metric_key: Set(metric.to_string()),
                value: Set(value),
                computed_at: Set(Utc::now().into()),
                ..Default::default()
            });
        };

        if is_daily {
            // Skip idle days so per-kg trend lines don't dip to zero on days
            // with no sales or cash movement.
            if period_sales.is_empty() && cash_in.is_zero() && cash_out.is_zero() {
                continue;
            }
            push("revenue", revenue.round_dp(2));
            push("kg_sold", kg_sold.round_dp(4));
            push("revenue_per_kg", ratio(revenue, kg_sold));
            push("cash_in", cash_in.round_dp(2));
            push("cash_out", cash_out.round_dp(2));
            push("net_cash_flow", net_cash_flow.round_dp(2));
            continue;
        }

        // Monthly aggregations.
        let period_closures: Vec<&batch_closure_summary::Model> = closures
            .iter()
            .filter(|c| c.end_date >= period.start && c.end_date <= period.end)
            .collect();
        let period_closed_ids: HashSet<i32> =
            period_closures.iter().map(|c| c.batch_id).collect();

        let revenue_closed: Decimal = period_closures.iter().map(|c| c.revenue).sum();
        let gross_profit: Decimal = period_closures.iter().map(|c| c.gross_profit).sum();
        let cogs: Decimal = period_closures
            .iter()
            .map(|c| c.revenue - c.gross_profit)
            .sum();

        let other_expense_total: Decimal = expenses
            .iter()
            .filter(|e| e.expense_date >= period.start && e.expense_date <= period.end)
            .map(|e| e.amount)
            .sum();
        let commission = period_account_net(COMMISSION_ACCOUNT_ID, true);
        let interest = period_account_net(INTEREST_ACCOUNT_ID, true);
        let net_profit = gross_profit - other_expense_total - commission - interest;

        let kg_closed: Decimal = closed_batch_sales
            .iter()
            .filter(|s| period_closed_ids.contains(&s.batch_id))
            .map(|s| s.avg_weight)
            .sum();

        let birds_placed: Decimal = placed_batches
            .iter()
            .filter(|b| b.start_date >= period.start && b.start_date <= period.end)
            .map(|b| Decimal::from(b.initial_bird_count))
            .sum();
        let birds_sold: Decimal = period_sales.iter().map(|s| s.quantity).sum();

        let initial_birds: Decimal = period_closures
            .iter()
            .map(|c| Decimal::from(c.initial_chicken_count))
            .sum();
        let available_birds: Decimal = period_closures
            .iter()
            .map(|c| Decimal::from(c.available_chicken_count))
            .sum();
        let mortality_pct = pct(initial_birds - available_birds, initial_birds);

        let cash_balance = balance_at(CASH_ACCOUNT_ID, period.end);
        let receivables = balance_at(RECEIVABLE_ACCOUNT_ID, period.end);
        let payables = balance_at(LIABILITY_ACCOUNT_ID, period.end);
        let inventory_value = balance_at(FEED_INVENTORY_ACCOUNT_ID, period.end)
            + balance_at(MEDICINE_INVENTORY_ACCOUNT_ID, period.end)
            + balance_at(CHICKS_INVENTORY_ACCOUNT_ID, period.end);
        let working_capital = cash_balance + inventory_value + receivables - payables;
        let outstanding_loans = balance_at(LOAN_ACCOUNT_ID, period.end);

        let feed_consumed_kg = feed_by_period
            .get(&period.key)
            .copied()
            .unwrap_or_default();

        push("revenue", revenue.round_dp(2));
        push("revenue_closed", revenue_closed.round_dp(2));
        push("cogs", cogs.round_dp(2));
        push("gross_profit", gross_profit.round_dp(2));
        push("gross_margin_pct", pct(gross_profit, revenue_closed));
        push("other_expenses", other_expense_total.round_dp(2));
        push("commission", commission.round_dp(2));
        push("interest", interest.round_dp(2));
        push("net_profit", net_profit.round_dp(2));
        push("net_margin_pct", pct(net_profit, revenue_closed));
        push("kg_sold", kg_sold.round_dp(4));
        push("kg_closed", kg_closed.round_dp(4));
        push("revenue_per_kg", ratio(revenue, kg_sold));
        push("breakeven_per_kg", ratio(cogs, kg_closed));
        push("margin_per_kg", ratio(gross_profit, kg_closed));
        push("cash_in", cash_in.round_dp(2));
        push("cash_out", cash_out.round_dp(2));
        push("net_cash_flow", net_cash_flow.round_dp(2));
        push("cash_balance", cash_balance.round_dp(2));
        push("receivables", receivables.round_dp(2));
        push("payables", payables.round_dp(2));
        push("inventory_value", inventory_value.round_dp(2));
        push("working_capital", working_capital.round_dp(2));
        push("outstanding_loans", outstanding_loans.round_dp(2));
        push("birds_placed", birds_placed.round_dp(2));
        push("birds_sold", birds_sold.round_dp(2));
        push("mortality_pct", mortality_pct);
        push("feed_consumed_kg", feed_consumed_kg.round_dp(4));
        push("fcr", ratio(feed_consumed_kg, kg_sold));
    }

    // ── Replace stored rows for the refreshed periods ───────────────────────
    let period_keys: Vec<String> = periods.iter().map(|period| period.key.clone()).collect();
    for key_chunk in period_keys.chunks(500) {
        metric_snapshots::Entity::delete_many()
            .filter(metric_snapshots::Column::PeriodType.eq(period_type))
            .filter(metric_snapshots::Column::PeriodKey.is_in(key_chunk.to_vec()))
            .exec(db)
            .await?;
    }

    // ── Upsert in chunks ────────────────────────────────────────────────────
    let written = rows.len();
    for chunk in rows.chunks(500) {
        metric_snapshots::Entity::insert_many(chunk.to_vec())
            .on_conflict(
                OnConflict::columns([
                    metric_snapshots::Column::PeriodType,
                    metric_snapshots::Column::PeriodKey,
                    metric_snapshots::Column::MetricKey,
                ])
                .update_columns([
                    metric_snapshots::Column::Value,
                    metric_snapshots::Column::ComputedAt,
                ])
                .to_owned(),
            )
            .exec_without_returning(db)
            .await?;
    }

    Ok(written)
}

/// Computes the full history for both granularities.
pub async fn backfill_metrics(db: &DatabaseConnection) -> Result<(), DbErr> {
    let today = Utc::now().date_naive();
    let earliest = earliest_activity_date(db).await?.unwrap_or(today);

    let monthly_from = period_key("month", earliest);
    let monthly_to = period_key("month", today);
    let monthly = refresh_metrics_range(db, "month", &monthly_from, &monthly_to).await?;

    let daily_from = period_key("day", earliest);
    let daily_to = period_key("day", today);
    let days = refresh_metrics_range(db, "day", &daily_from, &daily_to).await?;

    tracing::info!(
        "Metrics backfill complete: {} monthly rows, {} daily rows",
        monthly,
        days
    );
    Ok(())
}

/// Refreshes the open periods (today, yesterday and the current month).
pub async fn refresh_current_metrics(db: &DatabaseConnection) -> Result<(), DbErr> {
    let today = Utc::now().date_naive();
    let yesterday = today.pred_opt().unwrap_or(today);

    refresh_metrics_range(
        db,
        "day",
        &period_key("day", yesterday),
        &period_key("day", today),
    )
    .await?;
    refresh_metrics_range(
        db,
        "month",
        &period_key("month", today),
        &period_key("month", today),
    )
    .await?;
    Ok(())
}

// ─── HTTP handlers ───────────────────────────────────────────────────────────

pub async fn get_metric_snapshots_handler(
    State(db): State<DatabaseConnection>,
    Query(query): Query<MetricSnapshotQuery>,
) -> Result<Json<Vec<metric_snapshots::Model>>, StatusCode> {
    let mut find = metric_snapshots::Entity::find();

    if let Some(period_type) = query.period_type.as_deref() {
        if period_type != "day" && period_type != "month" {
            return Err(StatusCode::BAD_REQUEST);
        }
        find = find.filter(metric_snapshots::Column::PeriodType.eq(period_type));
    }
    if let Some(from) = query.from.filter(|v| !v.is_empty()) {
        find = find.filter(metric_snapshots::Column::PeriodKey.gte(from));
    }
    if let Some(to) = query.to.filter(|v| !v.is_empty()) {
        find = find.filter(metric_snapshots::Column::PeriodKey.lte(to));
    }
    if let Some(metrics) = query.metrics {
        let keys: Vec<String> = metrics
            .split(',')
            .map(|key| key.trim().to_string())
            .filter(|key| !key.is_empty())
            .collect();
        if !keys.is_empty() {
            find = find.filter(metric_snapshots::Column::MetricKey.is_in(keys));
        }
    }

    match find
        .order_by_asc(metric_snapshots::Column::PeriodKey)
        .all(&db)
        .await
    {
        Ok(data) => Ok(Json(data)),
        Err(e) => {
            error!("Failed to fetch metric snapshots: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

pub async fn refresh_metrics_handler(
    State(db): State<DatabaseConnection>,
    Json(body): Json<RefreshMetricsBody>,
) -> Result<Json<RefreshMetricsResponse>, StatusCode> {
    let today = Utc::now().date_naive();
    let period_types: Vec<&str> = match body.period_type.as_deref() {
        Some("day") => vec!["day"],
        Some("month") => vec!["month"],
        Some(other) => {
            error!("Invalid period_type '{}'", other);
            return Err(StatusCode::BAD_REQUEST);
        }
        None => vec!["month", "day"],
    };

    let earliest = earliest_activity_date(&db).await.map_err(|e| {
        error!("Failed to determine earliest activity date: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    let mut refreshed = 0usize;
    for period_type in period_types {
        let from_date = body
            .from
            .as_deref()
            .and_then(|key| period_for_key(period_type, key))
            .map(|period| period.start)
            .unwrap_or_else(|| earliest.unwrap_or(today));
        let to_date = body
            .to
            .as_deref()
            .and_then(|key| period_for_key(period_type, key))
            .map(|period| period.start)
            .unwrap_or(today);

        if from_date > to_date {
            continue;
        }

        let written = refresh_metrics_range(
            &db,
            period_type,
            &period_key(period_type, from_date),
            &period_key(period_type, to_date),
        )
        .await
        .map_err(|e| {
            error!("Failed to refresh {} metrics: {}", period_type, e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;
        refreshed += written;
    }

    Ok(Json(RefreshMetricsResponse { refreshed }))
}
