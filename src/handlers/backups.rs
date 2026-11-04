//! Backup run log — read-only view of `backup_runs`.
//!
//! Rows are written by `/home/asuna/rjagro/db_backup.sh` on the host, once per
//! run, whether it succeeded, only partially landed, or failed. Reading is
//! deliberately dumb: the table is the diary, this module just shapes it for
//! the dashboard.
//!
//! The schedule below mirrors `/etc/systemd/system/db-backup.timer`
//! (`OnCalendar=*-*-01/3 02:00:00` → days 1, 4, 7, … of every month, 02:00 UTC).
//! If the timer ever changes, change these two constants with it — the API
//! reports the schedule so the UI never hardcodes it.

use axum::{
    extract::{Query, State},
    http::StatusCode,
    Json,
};
use chrono::{DateTime, Datelike, Duration, NaiveDate, TimeZone, Utc};
use entity::backup_runs::{self, Entity as BackupRuns};
use sea_orm::{ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter, QueryOrder, QuerySelect};
use serde::Deserialize;
use serde_json::{json, Value};
use tracing::error;

/// Run cadence declared in `db-backup.timer`.
const SCHEDULE_EVERY_DAYS: u32 = 3;
/// Hour (UTC) the timer fires.
const SCHEDULE_HOUR_UTC: u32 = 2;
/// A row still marked `running` past this age is reported as stale.
const RUNNING_STALE_AFTER_MINUTES: i64 = 60;
/// Rows are small; a generous window is cheaper than pagination.
const DEFAULT_LIMIT: u64 = 200;
const MAX_LIMIT: u64 = 500;

type ApiError = (StatusCode, Json<Value>);

fn internal(err: impl std::fmt::Display) -> ApiError {
    error!("backup_runs query failed: {err}");
    (
        StatusCode::INTERNAL_SERVER_ERROR,
        Json(json!({
            "error": {
                "code": "BACKUP_LOG_UNAVAILABLE",
                "message": "Could not load the backup log"
            }
        })),
    )
}

#[derive(Default, Deserialize)]
pub struct BackupQuery {
    /// Inclusive lower bound on `started_at` (YYYY-MM-DD, UTC).
    from: Option<NaiveDate>,
    /// Inclusive upper bound on `started_at` (YYYY-MM-DD, UTC).
    to: Option<NaiveDate>,
    limit: Option<u64>,
}

/// Next timer fire strictly after `now`.
fn next_scheduled_after(now: DateTime<Utc>) -> DateTime<Utc> {
    for offset in 0..=(SCHEDULE_EVERY_DAYS as i64 * 2 + 1) {
        let Some(day) = now.date_naive().checked_add_signed(Duration::days(offset)) else {
            break;
        };
        if (day.day() as u32 - 1) % SCHEDULE_EVERY_DAYS != 0 {
            continue;
        }
        let Some(naive) = day.and_hms_opt(SCHEDULE_HOUR_UTC, 0, 0) else {
            continue;
        };
        let Some(candidate) = Utc.from_local_datetime(&naive).single() else {
            continue;
        };
        if candidate > now {
            return candidate;
        }
    }
    now + Duration::days(SCHEDULE_EVERY_DAYS as i64)
}

fn scheduled_days_of_month() -> Vec<u32> {
    (1..=31)
        .filter(|d| (d - 1) % SCHEDULE_EVERY_DAYS == 0)
        .collect()
}

fn run_json(model: &backup_runs::Model, now: DateTime<Utc>) -> Value {
    let started = model.started_at.with_timezone(&Utc);
    let stale =
        model.status == "running" && now - started > Duration::minutes(RUNNING_STALE_AFTER_MINUTES);

    json!({
        "id": model.id,
        "started_at": started.to_rfc3339(),
        "finished_at": model.finished_at.map(|t| t.with_timezone(&Utc).to_rfc3339()),
        "status": model.status,
        "triggered_by": model.triggered_by,
        "dump_bytes": model.dump_bytes,
        "filename": model.filename,
        "remote_host": model.remote_host,
        "remote_ok": model.remote_ok,
        "error": model.error,
        "duration_ms": model.duration_ms,
        "stale": stale,
    })
}

pub async fn list_backups(
    State(db): State<DatabaseConnection>,
    Query(q): Query<BackupQuery>,
) -> Result<Json<Value>, ApiError> {
    let limit = q.limit.unwrap_or(DEFAULT_LIMIT).clamp(1, MAX_LIMIT);

    let mut query = BackupRuns::find().order_by_desc(backup_runs::Column::StartedAt);

    if let Some(from) = q.from {
        let bound = Utc.from_utc_datetime(&from.and_hms_opt(0, 0, 0).unwrap_or_default());
        query = query.filter(backup_runs::Column::StartedAt.gte(bound));
    }
    if let Some(to) = q.to {
        // Whole `to` day: filter on < midnight of the next day.
        let end = to
            .checked_add_signed(Duration::days(1))
            .and_then(|d| d.and_hms_opt(0, 0, 0))
            .map(|n| Utc.from_utc_datetime(&n));
        if let Some(end) = end {
            query = query.filter(backup_runs::Column::StartedAt.lt(end));
        }
    }

    let rows = query.limit(limit).all(&db).await.map_err(internal)?;
    let now = Utc::now();

    // Summary is computed from the newest rows only (bounded by `limit`), which
    // is what the tab needs: latest state, not lifetime totals.
    let last_success = rows.iter().find(|r| r.status == "success");
    let last_success_at = last_success.map(|r| r.started_at.with_timezone(&Utc));
    let runs_since_last_success = match last_success {
        Some(_) => rows.iter().take_while(|r| r.status != "success").count() as i64,
        // Nothing in the window succeeded: report the window size as unknown-ish.
        None => -1,
    };

    let mut success = 0usize;
    let mut partial = 0usize;
    let mut failed = 0usize;
    let mut running = 0usize;
    for r in &rows {
        match r.status.as_str() {
            "success" => success += 1,
            "partial" => partial += 1,
            "failed" => failed += 1,
            _ => running += 1,
        }
    }

    let last = rows.first();

    let summary = json!({
        "last_success_at": last_success_at.map(|t| t.to_rfc3339()),
        "last_success_filename": last_success.and_then(|r| r.filename.clone()),
        "hours_since_success": last_success_at
            .map(|t| ((now - t).num_minutes() as f64 / 60.0 * 10.0).round() / 10.0),
        "last_run": last.map(|r| run_json(r, now)),
        "runs_since_last_success": runs_since_last_success,
        "next_scheduled_at": next_scheduled_after(now).to_rfc3339(),
        "schedule": {
            "every_days": SCHEDULE_EVERY_DAYS,
            "days_of_month": scheduled_days_of_month(),
            "time_utc": format!("{:02}:00", SCHEDULE_HOUR_UTC),
            "source": "db-backup.timer"
        },
        "window": {
            "runs": rows.len(),
            "success": success,
            "partial": partial,
            "failed": failed,
            "running": running
        },
        "total_bytes": rows
            .iter()
            .filter_map(|r| r.dump_bytes)
            .sum::<i64>(),
        "remote_host": rows
            .iter()
            .find_map(|r| r.remote_host.clone())
    });

    let runs: Vec<Value> = rows.iter().map(|r| run_json(r, now)).collect();

    Ok(Json(json!({ "summary": summary, "runs": runs })))
}
