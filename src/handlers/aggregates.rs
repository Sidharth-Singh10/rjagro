//! Aggregate read endpoints for the Overview dashboard.
//!
//! The dashboard used to download the full stock-receipt, allocation-line and
//! allocation tables just to compute a handful of numbers. These handlers do
//! that math in SQL so the screen only receives the results.

use crate::handlers::metrics::{month_end, month_start};
use crate::models::{
    AllocationBatchCost, AllocationCategoryTotal, AllocationRangeQuery, BatchFcr, BatchFeedLine,
    FeedSummary, LimitQuery,
};
use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use chrono::Utc;
use entity::sea_orm_active_enums::ItemCategory;
use sea_orm::prelude::Decimal;
use sea_orm::{ConnectionTrait, DatabaseConnection, DbBackend, Statement};

/// Feed-only lots (mirrors the dashboard's "FEED DELIVERY" exclusion).
const FEED_LOTS_CTE: &str = r#"
    feed_lots AS (
        SELECT
            sr.lot_id,
            sr.remaining_qty
        FROM
            stock_receipts sr
            JOIN items i ON i.item_code = sr.item_code
        WHERE
            i.item_category = 'feed'
            AND UPPER(i.item_name) <> 'FEED DELIVERY'
    )
"#;

fn decode_err(context: &'static str) -> impl Fn(sea_orm::DbErr) -> StatusCode {
    move |e| {
        eprintln!("Failed to decode {}: {}", context, e);
        StatusCode::INTERNAL_SERVER_ERROR
    }
}

/// Feed on hand, average daily consumption and days of cover.
pub async fn feed_summary_handler(
    State(db): State<DatabaseConnection>,
) -> Result<Json<FeedSummary>, StatusCode> {
    let stmt = Statement::from_string(
        DbBackend::Postgres,
        format!(
            r#"
            WITH
            {FEED_LOTS_CTE},
            feed_usage AS (
                SELECT
                    bal.qty,
                    ba.allocation_date
                FROM
                    batch_allocation_lines bal
                    JOIN batch_allocations ba ON ba.allocation_id = bal.allocation_id
                    JOIN feed_lots fl ON fl.lot_id = bal.lot_id
            )
            SELECT
                COALESCE((SELECT SUM(remaining_qty) FROM feed_lots), 0) AS feed_on_hand,
                COALESCE((SELECT SUM(qty) FROM feed_usage), 0) AS consumed_qty,
                (SELECT MIN(allocation_date) FROM feed_usage) AS first_date,
                (SELECT MAX(allocation_date) FROM feed_usage) AS last_date
            "#
        ),
    );

    let row = db
        .query_one(stmt)
        .await
        .map_err(|e| {
            eprintln!("Failed to summarize feed: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?
        .ok_or(StatusCode::INTERNAL_SERVER_ERROR)?;

    let feed_on_hand: Decimal = row
        .try_get("", "feed_on_hand")
        .map_err(decode_err("feed on hand"))?;
    let consumed_qty: Decimal = row
        .try_get("", "consumed_qty")
        .map_err(decode_err("feed consumption"))?;
    let first_date: Option<chrono::NaiveDate> = row
        .try_get("", "first_date")
        .map_err(decode_err("first allocation date"))?;
    let last_date: Option<chrono::NaiveDate> = row
        .try_get("", "last_date")
        .map_err(decode_err("last allocation date"))?;

    // Same window the dashboard used: first allocation through today.
    let (avg_daily_consumption, days_cover) = match first_date {
        Some(first) => {
            let end = last_date
                .map(|last| last.max(Utc::now().date_naive()))
                .unwrap_or_else(|| Utc::now().date_naive());
            let days = ((end - first).num_days() + 1).max(1);
            let per_day = consumed_qty / Decimal::from(days);
            let cover = if per_day.is_zero() {
                Decimal::ZERO
            } else {
                feed_on_hand / per_day
            };
            (per_day.round_dp(2), cover.round_dp(2))
        }
        None => (Decimal::ZERO, Decimal::ZERO),
    };

    Ok(Json(FeedSummary {
        feed_on_hand: feed_on_hand.round_dp(2),
        avg_daily_consumption,
        days_cover,
    }))
}

/// Allocation value per month and item category (COGS mix).
pub async fn allocation_category_totals_handler(
    State(db): State<DatabaseConnection>,
    Query(params): Query<AllocationRangeQuery>,
) -> Result<Json<Vec<AllocationCategoryTotal>>, (StatusCode, String)> {
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
            to_char(ba.allocation_date, 'YYYY-MM') AS month,
            CAST(i.item_category AS text) AS category,
            COALESCE(SUM(bal.line_value), 0) AS total
        FROM
            batch_allocation_lines bal
            JOIN batch_allocations ba ON ba.allocation_id = bal.allocation_id
            JOIN stock_receipts sr ON sr.lot_id = bal.lot_id
            JOIN items i ON i.item_code = sr.item_code
        WHERE
            ba.allocation_date >= $1
            AND ba.allocation_date <= $2
        GROUP BY
            1, 2
        ORDER BY
            1, 2
        "#,
        vec![from.into(), to.into()],
    );

    let rows = db.query_all(stmt).await.map_err(|e| {
        eprintln!("Failed to summarize allocation categories: {}", e);
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            "Failed to summarize allocation categories".to_string(),
        )
    })?;

    let mut totals = Vec::with_capacity(rows.len());
    for row in rows {
        let decode = |e: sea_orm::DbErr| {
            eprintln!("Failed to decode allocation category total: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Failed to decode allocation category total".to_string(),
            )
        };
        let month: String = row.try_get("", "month").map_err(decode)?;
        let category: ItemCategory = row.try_get("", "category").map_err(decode)?;
        let total: Decimal = row.try_get("", "total").map_err(decode)?;
        totals.push(AllocationCategoryTotal {
            month,
            category,
            total,
        });
    }

    Ok(Json(totals))
}

/// Allocation value per category for the most recent batches (cost per bird).
pub async fn allocation_batch_costs_handler(
    State(db): State<DatabaseConnection>,
    Query(params): Query<LimitQuery>,
) -> Result<Json<Vec<AllocationBatchCost>>, StatusCode> {
    let limit = params.limit.unwrap_or(10).clamp(1, 100);

    let stmt = Statement::from_sql_and_values(
        DbBackend::Postgres,
        r#"
        SELECT
            bal.batch_id,
            CAST(i.item_category AS text) AS category,
            COALESCE(SUM(bal.line_value), 0) AS total
        FROM
            batch_allocation_lines bal
            JOIN stock_receipts sr ON sr.lot_id = bal.lot_id
            JOIN items i ON i.item_code = sr.item_code
        WHERE
            bal.batch_id IS NOT NULL
            AND bal.batch_id IN (
                SELECT batch_id FROM batches ORDER BY batch_id DESC LIMIT $1
            )
        GROUP BY
            1, 2
        ORDER BY
            1, 2
        "#,
        vec![limit.into()],
    );

    let rows = db.query_all(stmt).await.map_err(|e| {
        eprintln!("Failed to summarize batch costs: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    let mut costs = Vec::with_capacity(rows.len());
    for row in rows {
        let batch_id: i32 = row
            .try_get("", "batch_id")
            .map_err(decode_err("batch cost batch id"))?;
        let category: ItemCategory = row
            .try_get("", "category")
            .map_err(decode_err("batch cost category"))?;
        let total: Decimal = row
            .try_get("", "total")
            .map_err(decode_err("batch cost total"))?;
        costs.push(AllocationBatchCost {
            batch_id,
            category,
            total,
        });
    }

    Ok(Json(costs))
}

/// Feed kg and sold kg per batch, highest FCR first (top N).
pub async fn allocation_fcr_handler(
    State(db): State<DatabaseConnection>,
    Query(params): Query<LimitQuery>,
) -> Result<Json<Vec<BatchFcr>>, StatusCode> {
    let limit = params.limit.unwrap_or(10).clamp(1, 100);

    let stmt = Statement::from_sql_and_values(
        DbBackend::Postgres,
        r#"
        WITH feed AS (
            SELECT
                bal.batch_id,
                SUM(
                    CASE
                        WHEN LOWER(i.unit) = 'bags' THEN bal.qty * 50
                        ELSE bal.qty
                    END
                ) AS feed_kg
            FROM
                batch_allocation_lines bal
                JOIN stock_receipts sr ON sr.lot_id = bal.lot_id
                JOIN items i ON i.item_code = sr.item_code
            WHERE
                i.item_category = 'feed'
                AND UPPER(i.item_name) <> 'FEED DELIVERY'
                AND bal.batch_id IS NOT NULL
            GROUP BY
                bal.batch_id
        ),
        weight AS (
            SELECT
                batch_id,
                SUM(avg_weight) AS weight_kg
            FROM
                batch_sales
            GROUP BY
                batch_id
        )
        SELECT
            f.batch_id,
            f.feed_kg,
            w.weight_kg,
            ROUND(f.feed_kg / w.weight_kg, 2) AS fcr
        FROM
            feed f
            JOIN weight w ON w.batch_id = f.batch_id
        WHERE
            f.feed_kg > 0
            AND w.weight_kg > 0
        ORDER BY
            fcr DESC
        LIMIT $1
        "#,
        vec![limit.into()],
    );

    let rows = db.query_all(stmt).await.map_err(|e| {
        eprintln!("Failed to summarize FCR: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    let mut fcr_rows = Vec::with_capacity(rows.len());
    for row in rows {
        let batch_id: i32 = row.try_get("", "batch_id").map_err(decode_err("fcr batch id"))?;
        let feed_kg: Decimal = row.try_get("", "feed_kg").map_err(decode_err("fcr feed kg"))?;
        let weight_kg: Decimal = row
            .try_get("", "weight_kg")
            .map_err(decode_err("fcr weight kg"))?;
        let fcr: Decimal = row.try_get("", "fcr").map_err(decode_err("fcr value"))?;
        fcr_rows.push(BatchFcr {
            batch_id,
            feed_kg,
            weight_kg,
            fcr,
        });
    }

    Ok(Json(fcr_rows))
}

/// Feed lines of one batch, for the FCR breakdown modal.
pub async fn batch_feed_lines_handler(
    State(db): State<DatabaseConnection>,
    Path(batch_id): Path<i32>,
) -> Result<Json<Vec<BatchFeedLine>>, StatusCode> {
    let stmt = Statement::from_sql_and_values(
        DbBackend::Postgres,
        r#"
        SELECT
            i.item_code,
            i.item_name,
            bal.qty,
            i.unit,
            CASE
                WHEN LOWER(i.unit) = 'bags' THEN bal.qty * 50
                ELSE bal.qty
            END AS kg
        FROM
            batch_allocation_lines bal
            JOIN stock_receipts sr ON sr.lot_id = bal.lot_id
            JOIN items i ON i.item_code = sr.item_code
        WHERE
            bal.batch_id = $1
            AND i.item_category = 'feed'
            AND UPPER(i.item_name) <> 'FEED DELIVERY'
        ORDER BY
            i.item_name
        "#,
        vec![batch_id.into()],
    );

    let rows = db.query_all(stmt).await.map_err(|e| {
        eprintln!("Failed to fetch batch feed lines: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    let mut lines = Vec::with_capacity(rows.len());
    for row in rows {
        let item_code: String = row
            .try_get("", "item_code")
            .map_err(decode_err("feed line item code"))?;
        let item_name: String = row
            .try_get("", "item_name")
            .map_err(decode_err("feed line item name"))?;
        let qty: Decimal = row.try_get("", "qty").map_err(decode_err("feed line qty"))?;
        let unit: Option<String> = row.try_get("", "unit").map_err(decode_err("feed line unit"))?;
        let kg: Decimal = row.try_get("", "kg").map_err(decode_err("feed line kg"))?;

        lines.push(BatchFeedLine {
            item_code,
            item_name,
            qty,
            unit,
            kg,
        });
    }

    Ok(Json(lines))
}
