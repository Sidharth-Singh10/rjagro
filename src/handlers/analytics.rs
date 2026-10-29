//! Analytics: editable chicken price history and versioned pipeline runs.
//!
//! `chicken_prices` is the source of truth for the rate tracker and
//! `chicken_price_audit` explains every change. Writes enqueue one row in
//! `analytics_runs` so the Python pipeline can recompute the forecast; a partial
//! unique index on queued rows means a burst of edits coalesces into a single
//! run instead of queueing one job per write.

use axum::{
    extract::{Extension, FromRequest, Multipart, Path, Query, Request, State},
    http::{header, StatusCode},
    response::{IntoResponse, Response},
    Json,
};
use chrono::{NaiveDate, Utc};
use entity::{analytics_runs, chicken_price_audit, chicken_prices};
use num_traits::ToPrimitive;
use sea_orm::{
    prelude::{DateTimeWithTimeZone, Decimal},
    sea_query::OnConflict,
    ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter, QueryOrder, Set,
    TransactionTrait,
};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::{BTreeMap, HashMap};
use tracing::error;
use uuid::Uuid;

const MAX_IMPORT_BYTES: usize = 10 * 1024 * 1024;
const MANUAL_SOURCE: &str = "manual";
const IMPORT_SOURCE: &str = "import";
const PRICE_MIN: f64 = 0.0;
const PRICE_MAX: f64 = 10_000.0;

type ApiError = (StatusCode, String);

fn bad_request(message: impl Into<String>) -> ApiError {
    (StatusCode::BAD_REQUEST, message.into())
}

fn internal_error(context: &str, err: impl std::fmt::Display) -> ApiError {
    error!("{context}: {err}");
    (
        StatusCode::INTERNAL_SERVER_ERROR,
        "internal error".to_string(),
    )
}

// ─── Request / response shapes ───────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct PricesQuery {
    pub from: Option<String>,
    pub to: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct PriceRow {
    pub date: NaiveDate,
    pub price: f64,
    pub quote_source: String,
    pub note: Option<String>,
    pub updated_at: DateTimeWithTimeZone,
}

#[derive(Debug, Serialize)]
pub struct Coverage {
    pub quoted: usize,
    pub from: Option<NaiveDate>,
    pub to: Option<NaiveDate>,
    pub missing_days: i64,
}

#[derive(Debug, Serialize)]
pub struct PricesResponse {
    pub prices: Vec<PriceRow>,
    pub coverage: Coverage,
}

#[derive(Debug, Deserialize)]
pub struct PutPriceBody {
    pub price: f64,
    #[serde(default)]
    pub note: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct RunRef {
    pub id: Uuid,
    pub status: String,
}

#[derive(Debug, Serialize)]
pub struct PutPriceResponse {
    pub price: f64,
    pub run: RunRef,
}

#[derive(Debug, Serialize)]
pub struct DeletePriceResponse {
    pub deleted: bool,
    pub run: RunRef,
}

#[derive(Debug, Deserialize)]
struct ImportRow {
    date: NaiveDate,
    price: f64,
}

/// The edit sheet posts `{ "prices": [...] }`; a bare array is accepted too.
#[derive(Debug, Deserialize)]
struct ImportEnvelope {
    prices: Vec<ImportRow>,
}

#[derive(Debug, Serialize)]
pub struct ImportResponse {
    pub imported: usize,
    pub changed: usize,
    pub run: RunRef,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RunStatusView {
    pub id: Option<Uuid>,
    pub status: String,
    pub requested_at: Option<DateTimeWithTimeZone>,
    pub started_at: Option<DateTimeWithTimeZone>,
    pub finished_at: Option<DateTimeWithTimeZone>,
    pub error: Option<String>,
    pub model: Option<String>,
    pub dataset_hash: Option<String>,
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

fn parse_date(value: &str) -> Option<NaiveDate> {
    NaiveDate::parse_from_str(value.trim(), "%Y-%m-%d").ok()
}

fn parse_optional_date(value: Option<&str>) -> Result<Option<NaiveDate>, ApiError> {
    match value {
        Some(value) if !value.trim().is_empty() => parse_date(value)
            .map(Some)
            .ok_or_else(|| bad_request(format!("invalid date '{value}', expected YYYY-MM-DD"))),
        _ => Ok(None),
    }
}

fn to_f64(value: Decimal) -> f64 {
    value.to_f64().unwrap_or_default()
}

/// Validates the API price range and rounds to the column's two decimals.
fn validate_price(value: f64) -> Option<(f64, Decimal)> {
    if !value.is_finite() || value <= PRICE_MIN || value >= PRICE_MAX {
        return None;
    }
    let rounded = (value * 100.0).round() / 100.0;
    if rounded <= PRICE_MIN || rounded >= PRICE_MAX {
        return None;
    }
    let price = Decimal::from_f64_retain(rounded)?.round_dp(2);
    Some((rounded, price))
}

/// The JWT subject is the numeric user id; audit columns accept null.
fn authenticated_user_id(user: &Option<Extension<String>>) -> Option<i32> {
    user.as_ref().and_then(|value| value.0.parse::<i32>().ok())
}

fn price_row(row: chicken_prices::Model) -> PriceRow {
    PriceRow {
        date: row.price_date,
        price: to_f64(row.price),
        quote_source: row.quote_source,
        note: row.note,
        updated_at: row.updated_at,
    }
}

fn coverage(rows: &[PriceRow], from: Option<NaiveDate>, to: Option<NaiveDate>) -> Coverage {
    let quoted = rows.len();
    let first = rows.first().map(|row| row.date);
    let last = rows.last().map(|row| row.date);
    let from = from.or(first);
    let to = to.or(last);

    let missing_days = match (from, to) {
        (Some(from), Some(to)) if from <= to => ((to - from).num_days() + 1 - quoted as i64).max(0),
        _ => 0,
    };

    Coverage {
        quoted,
        from,
        to,
        missing_days,
    }
}

/// Enqueues one run. The partial unique index on queued rows makes the insert
/// idempotent; the existing queued row is returned when one is already waiting.
async fn enqueue_run(
    db: &DatabaseConnection,
    requested_by: Option<i32>,
    trigger: &str,
) -> Result<RunRef, ApiError> {
    analytics_runs::Entity::insert(analytics_runs::ActiveModel {
        status: Set("queued".to_string()),
        requested_by: Set(requested_by),
        trigger: Set(trigger.to_string()),
        ..Default::default()
    })
    .on_conflict(OnConflict::new().do_nothing().to_owned())
    .exec_without_returning(db)
    .await
    .map_err(|err| internal_error("failed to enqueue analytics run", err))?;

    let queued = analytics_runs::Entity::find()
        .filter(analytics_runs::Column::Status.eq("queued"))
        .order_by_desc(analytics_runs::Column::RequestedAt)
        .one(db)
        .await
        .map_err(|err| internal_error("failed to read queued analytics run", err))?
        .ok_or_else(|| {
            error!("analytics run was enqueued but no queued row could be read");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                "internal error".to_string(),
            )
        })?;

    Ok(RunRef {
        id: queued.id,
        status: queued.status,
    })
}

async fn latest_succeeded_run(
    db: &DatabaseConnection,
) -> Result<Option<analytics_runs::Model>, ApiError> {
    analytics_runs::Entity::find()
        .filter(analytics_runs::Column::Status.eq("succeeded"))
        .filter(analytics_runs::Column::FinishedAt.is_not_null())
        .order_by_desc(analytics_runs::Column::FinishedAt)
        .order_by_desc(analytics_runs::Column::RequestedAt)
        .one(db)
        .await
        .map_err(|err| internal_error("failed to load analytics run", err))
}

fn empty_json_response() -> Response {
    (StatusCode::NOT_FOUND, Json(json!({ "status": "empty" }))).into_response()
}

// ─── Upload parsing ──────────────────────────────────────────────────────────

fn parse_csv_rows(text: &str, rows: &mut Vec<ImportRow>) -> Result<(), ApiError> {
    let mut saw_row = false;
    for (index, raw_line) in text.lines().enumerate() {
        let line = raw_line.trim();
        if line.is_empty() {
            continue;
        }

        let mut cells = line.split(',').map(|cell| cell.trim().trim_matches('"'));
        let date_cell = cells.next().unwrap_or_default();
        let price_cell = cells.next().unwrap_or_default();

        let date = match parse_date(date_cell) {
            Some(date) => {
                saw_row = true;
                date
            }
            // A header row is only tolerated before the first data row.
            None if !saw_row => continue,
            None => {
                return Err(bad_request(format!(
                    "line {}: invalid date '{date_cell}', expected YYYY-MM-DD",
                    index + 1
                )))
            }
        };

        let price = price_cell.parse::<f64>().map_err(|_| {
            bad_request(format!("line {}: invalid price '{price_cell}'", index + 1))
        })?;

        rows.push(ImportRow { date, price });
    }
    Ok(())
}

fn parse_import_body(bytes: &[u8], rows: &mut Vec<ImportRow>) -> Result<(), ApiError> {
    let text = std::str::from_utf8(bytes).map_err(|_| bad_request("upload is not valid UTF-8"))?;
    let text = text.trim_start_matches('\u{feff}').trim();
    if text.is_empty() {
        return Ok(());
    }

    if text.starts_with('[') {
        let parsed: Vec<ImportRow> = serde_json::from_str(text)
            .map_err(|err| bad_request(format!("invalid JSON price list: {err}")))?;
        rows.extend(parsed);
        return Ok(());
    }

    if text.starts_with('{') {
        let envelope: ImportEnvelope = serde_json::from_str(text)
            .map_err(|err| bad_request(format!("invalid JSON price list: {err}")))?;
        rows.extend(envelope.prices);
        return Ok(());
    }

    parse_csv_rows(text, rows)
}

/// Accepts either a JSON array (`[{date, price}]`) or a CSV upload sent as
/// `multipart/form-data`; every uploaded field is read the same way.
async fn read_import_rows(request: Request) -> Result<Vec<ImportRow>, ApiError> {
    let is_multipart = request
        .headers()
        .get(header::CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        .map(|value| {
            value
                .to_ascii_lowercase()
                .starts_with("multipart/form-data")
        })
        .unwrap_or(false);

    if is_multipart {
        let mut multipart = Multipart::from_request(request, &())
            .await
            .map_err(|_| bad_request("invalid multipart body"))?;
        let mut rows = Vec::new();
        while let Some(field) = multipart
            .next_field()
            .await
            .map_err(|err| bad_request(format!("invalid multipart field: {err}")))?
        {
            let bytes = field
                .bytes()
                .await
                .map_err(|err| bad_request(format!("could not read multipart field: {err}")))?;
            parse_import_body(&bytes, &mut rows)?;
        }
        Ok(rows)
    } else {
        let bytes = axum::body::to_bytes(request.into_body(), MAX_IMPORT_BYTES)
            .await
            .map_err(|err| bad_request(format!("could not read request body: {err}")))?;
        let mut rows = Vec::new();
        parse_import_body(&bytes, &mut rows)?;
        Ok(rows)
    }
}

// ─── Handlers ────────────────────────────────────────────────────────────────

/// GET /analytics/prices?from=YYYY-MM-DD&to=YYYY-MM-DD
pub async fn get_prices_handler(
    State(db): State<DatabaseConnection>,
    Query(query): Query<PricesQuery>,
) -> Result<Json<PricesResponse>, ApiError> {
    let from = parse_optional_date(query.from.as_deref())?;
    let to = parse_optional_date(query.to.as_deref())?;
    if let (Some(from), Some(to)) = (from, to) {
        if from > to {
            return Err(bad_request("'from' must be on or before 'to'"));
        }
    }

    let mut find = chicken_prices::Entity::find();
    if let Some(from) = from {
        find = find.filter(chicken_prices::Column::PriceDate.gte(from));
    }
    if let Some(to) = to {
        find = find.filter(chicken_prices::Column::PriceDate.lte(to));
    }

    let rows = find
        .order_by_asc(chicken_prices::Column::PriceDate)
        .all(&db)
        .await
        .map_err(|err| internal_error("failed to fetch chicken prices", err))?
        .into_iter()
        .map(price_row)
        .collect::<Vec<_>>();

    Ok(Json(PricesResponse {
        coverage: coverage(&rows, from, to),
        prices: rows,
    }))
}

/// PUT /analytics/prices/{date}
pub async fn put_price_handler(
    State(db): State<DatabaseConnection>,
    Path(date): Path<String>,
    user: Option<Extension<String>>,
    Json(body): Json<PutPriceBody>,
) -> Result<Json<PutPriceResponse>, ApiError> {
    let date = parse_date(&date)
        .ok_or_else(|| bad_request(format!("invalid date '{date}', expected YYYY-MM-DD")))?;
    let PutPriceBody { price, note } = body;
    let (price_value, price_decimal) = validate_price(price).ok_or_else(|| {
        bad_request(format!(
            "price must be greater than {PRICE_MIN} and less than {PRICE_MAX}"
        ))
    })?;
    let actor = authenticated_user_id(&user);

    let transaction = db
        .begin()
        .await
        .map_err(|err| internal_error("failed to begin price update", err))?;

    let existing = chicken_prices::Entity::find_by_id(date)
        .one(&transaction)
        .await
        .map_err(|err| internal_error("failed to load chicken price", err))?;
    let action = if existing.is_some() {
        "update"
    } else {
        "insert"
    };
    let old_price = existing.map(|row| row.price);

    chicken_prices::Entity::insert(chicken_prices::ActiveModel {
        price_date: Set(date),
        price: Set(price_decimal),
        quote_source: Set(MANUAL_SOURCE.to_string()),
        note: Set(note),
        updated_at: Set(Utc::now().into()),
        updated_by: Set(actor),
    })
    .on_conflict(
        OnConflict::column(chicken_prices::Column::PriceDate)
            .update_columns([
                chicken_prices::Column::Price,
                chicken_prices::Column::QuoteSource,
                chicken_prices::Column::Note,
                chicken_prices::Column::UpdatedAt,
                chicken_prices::Column::UpdatedBy,
            ])
            .to_owned(),
    )
    .exec_without_returning(&transaction)
    .await
    .map_err(|err| internal_error("failed to upsert chicken price", err))?;

    chicken_price_audit::ActiveModel {
        price_date: Set(date),
        old_price: Set(old_price),
        new_price: Set(Some(price_decimal)),
        action: Set(action.to_string()),
        changed_at: Set(Utc::now().into()),
        changed_by: Set(actor),
        ..Default::default()
    }
    .insert(&transaction)
    .await
    .map_err(|err| internal_error("failed to write chicken price audit", err))?;

    transaction
        .commit()
        .await
        .map_err(|err| internal_error("failed to commit price update", err))?;

    let run = enqueue_run(&db, actor, "edit").await?;

    Ok(Json(PutPriceResponse {
        price: price_value,
        run,
    }))
}

/// DELETE /analytics/prices/{date}
pub async fn delete_price_handler(
    State(db): State<DatabaseConnection>,
    Path(date): Path<String>,
    user: Option<Extension<String>>,
) -> Result<Json<DeletePriceResponse>, ApiError> {
    let date = parse_date(&date)
        .ok_or_else(|| bad_request(format!("invalid date '{date}', expected YYYY-MM-DD")))?;
    let actor = authenticated_user_id(&user);

    let transaction = db
        .begin()
        .await
        .map_err(|err| internal_error("failed to begin price delete", err))?;

    let existing = chicken_prices::Entity::find_by_id(date)
        .one(&transaction)
        .await
        .map_err(|err| internal_error("failed to load chicken price", err))?;
    let deleted = existing.is_some();

    if let Some(row) = existing {
        chicken_prices::Entity::delete_by_id(date)
            .exec(&transaction)
            .await
            .map_err(|err| internal_error("failed to delete chicken price", err))?;

        chicken_price_audit::ActiveModel {
            price_date: Set(date),
            old_price: Set(Some(row.price)),
            new_price: Set(None),
            action: Set("delete".to_string()),
            changed_at: Set(Utc::now().into()),
            changed_by: Set(actor),
            ..Default::default()
        }
        .insert(&transaction)
        .await
        .map_err(|err| internal_error("failed to write chicken price audit", err))?;
    }

    transaction
        .commit()
        .await
        .map_err(|err| internal_error("failed to commit price delete", err))?;

    let run = enqueue_run(&db, actor, "edit").await?;

    Ok(Json(DeletePriceResponse { deleted, run }))
}

/// POST /analytics/prices/import
pub async fn import_prices_handler(
    State(db): State<DatabaseConnection>,
    user: Option<Extension<String>>,
    request: Request,
) -> Result<Json<ImportResponse>, ApiError> {
    let rows = read_import_rows(request).await?;
    if rows.is_empty() {
        return Err(bad_request("no price rows found in upload"));
    }

    let mut prices_by_date: BTreeMap<NaiveDate, Decimal> = BTreeMap::new();
    for (index, row) in rows.iter().enumerate() {
        let (_, price) = validate_price(row.price).ok_or_else(|| {
            bad_request(format!(
                "row {}: price {} must be greater than {PRICE_MIN} and less than {PRICE_MAX}",
                index + 1,
                row.price
            ))
        })?;
        prices_by_date.insert(row.date, price);
    }

    let actor = authenticated_user_id(&user);
    let transaction = db
        .begin()
        .await
        .map_err(|err| internal_error("failed to begin price import", err))?;

    let dates = prices_by_date.keys().copied().collect::<Vec<_>>();
    let existing = chicken_prices::Entity::find()
        .filter(chicken_prices::Column::PriceDate.is_in(dates))
        .all(&transaction)
        .await
        .map_err(|err| internal_error("failed to load existing chicken prices", err))?
        .into_iter()
        .map(|row| (row.price_date, row.price))
        .collect::<HashMap<_, _>>();

    let entries = prices_by_date.into_iter().collect::<Vec<_>>();
    let changed = entries
        .iter()
        .filter(|(date, price)| existing.get(date) != Some(price))
        .map(|(date, price)| (*date, existing.get(date).copied(), *price))
        .collect::<Vec<_>>();
    let now = Utc::now();

    for chunk in entries.chunks(500) {
        let models = chunk
            .iter()
            .map(|(date, price)| chicken_prices::ActiveModel {
                price_date: Set(*date),
                price: Set(*price),
                quote_source: Set(IMPORT_SOURCE.to_string()),
                updated_at: Set(now.into()),
                updated_by: Set(actor),
                ..Default::default()
            })
            .collect::<Vec<_>>();

        chicken_prices::Entity::insert_many(models)
            .on_conflict(
                OnConflict::column(chicken_prices::Column::PriceDate)
                    .update_columns([
                        chicken_prices::Column::Price,
                        chicken_prices::Column::QuoteSource,
                        chicken_prices::Column::UpdatedAt,
                        chicken_prices::Column::UpdatedBy,
                    ])
                    .to_owned(),
            )
            .exec_without_returning(&transaction)
            .await
            .map_err(|err| internal_error("failed to import chicken prices", err))?;
    }

    for chunk in changed.chunks(500) {
        let models = chunk
            .iter()
            .map(
                |(date, old_price, new_price)| chicken_price_audit::ActiveModel {
                    price_date: Set(*date),
                    old_price: Set(*old_price),
                    new_price: Set(Some(*new_price)),
                    action: Set("import".to_string()),
                    changed_at: Set(now.into()),
                    changed_by: Set(actor),
                    ..Default::default()
                },
            )
            .collect::<Vec<_>>();

        chicken_price_audit::Entity::insert_many(models)
            .exec_without_returning(&transaction)
            .await
            .map_err(|err| internal_error("failed to write chicken price import audit", err))?;
    }

    transaction
        .commit()
        .await
        .map_err(|err| internal_error("failed to commit price import", err))?;

    let run = enqueue_run(&db, actor, "import").await?;

    Ok(Json(ImportResponse {
        imported: entries.len(),
        changed: changed.len(),
        run,
    }))
}

/// GET /analytics/status
pub async fn get_status_handler(
    State(db): State<DatabaseConnection>,
) -> Result<Json<RunStatusView>, ApiError> {
    let latest = analytics_runs::Entity::find()
        .order_by_desc(analytics_runs::Column::RequestedAt)
        .one(&db)
        .await
        .map_err(|err| internal_error("failed to load analytics status", err))?;

    let view = match latest {
        Some(run) => RunStatusView {
            id: Some(run.id),
            status: run.status,
            requested_at: Some(run.requested_at),
            started_at: run.started_at,
            finished_at: run.finished_at,
            error: run.error,
            model: run.model,
            dataset_hash: run.dataset_hash,
        },
        None => RunStatusView {
            id: None,
            status: "empty".to_string(),
            requested_at: None,
            started_at: None,
            finished_at: None,
            error: None,
            model: None,
            dataset_hash: None,
        },
    };

    Ok(Json(view))
}

/// GET /analytics/forecast
pub async fn get_forecast_handler(State(db): State<DatabaseConnection>) -> Response {
    let run = match latest_succeeded_run(&db).await {
        Ok(Some(run)) => run,
        Ok(None) => return empty_json_response(),
        Err((status, message)) => return (status, message).into_response(),
    };

    let meta = json!({ "runId": run.id, "finishedAt": run.finished_at });
    let body = match run.payload {
        Some(Value::Object(mut payload)) => {
            match payload.get_mut("meta") {
                // The pipeline already reports its own meta; add the run facts
                // there instead of replacing it.
                Some(Value::Object(pipeline_meta)) => {
                    pipeline_meta.insert("runId".to_string(), json!(run.id));
                    pipeline_meta.insert("finishedAt".to_string(), json!(run.finished_at));
                }
                _ => {
                    payload.insert("meta".to_string(), meta);
                }
            }
            Value::Object(payload)
        }
        Some(payload) => json!({ "payload": payload, "meta": meta }),
        None => json!({ "meta": meta }),
    };

    Json(body).into_response()
}

/// GET /analytics/report
pub async fn get_report_handler(State(db): State<DatabaseConnection>) -> Response {
    let run = match latest_succeeded_run(&db).await {
        Ok(Some(run)) => run,
        Ok(None) => return empty_json_response(),
        Err((status, message)) => return (status, message).into_response(),
    };

    match run.report_md {
        Some(report) => (
            [(header::CONTENT_TYPE, "text/markdown; charset=utf-8")],
            report,
        )
            .into_response(),
        None => empty_json_response(),
    }
}

/// POST /analytics/recompute
pub async fn post_recompute_handler(
    State(db): State<DatabaseConnection>,
    user: Option<Extension<String>>,
) -> Result<Json<RunRef>, ApiError> {
    let run = enqueue_run(&db, authenticated_user_id(&user), "manual").await?;
    Ok(Json(run))
}
