use axum::extract::{Path, State};
use entity::{batches, bird_count_history};
use reqwest::StatusCode;
use sea_orm::{ActiveModelTrait, DatabaseConnection, EntityTrait, Set, TransactionTrait};

use crate::handlers::purchases::internal_error;

pub async fn delete_bird_count_history(
    State(db): State<DatabaseConnection>,
    Path(record_id): Path<i32>,
) -> Result<reqwest::StatusCode, reqwest::StatusCode> {
    let txn = db
        .begin()
        .await
        .map_err(internal_error("begin transaction"))?;

    // Fetch record
    let record = bird_count_history::Entity::find_by_id(record_id)
        .one(&txn)
        .await
        .map_err(internal_error("fetch bird_count_history"))?
        .ok_or(reqwest::StatusCode::NOT_FOUND)?;

    let batch_id = record.batch_id;
    let additions = record.additions;
    let deaths = record.deaths;

    // Fetch batch
    let batch = batches::Entity::find_by_id(batch_id)
        .one(&txn)
        .await
        .map_err(internal_error("fetch batch"))?
        .ok_or(reqwest::StatusCode::NOT_FOUND)?;

    let current = batch.current_bird_count;
    let new_count = current - additions + deaths;

    if new_count < 0 {
        return Err(reqwest::StatusCode::BAD_REQUEST);
    }

    let mut active_batch: batches::ActiveModel = batch.into();
    active_batch.current_bird_count = Set(new_count);

    active_batch
        .update(&txn)
        .await
        .map_err(internal_error("update batch"))?;

    // Delete the record
    bird_count_history::Entity::delete_by_id(record_id)
        .exec(&txn)
        .await
        .map_err(internal_error("delete bird_count_history"))?;

    txn.commit()
        .await
        .map_err(internal_error("commit transaction"))?;

    Ok(StatusCode::NO_CONTENT)
}
