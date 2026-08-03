use crate::models::CreateTimeslot;
use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use entity::{batches, timeslots};
use sea_orm::{
    ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter, QueryOrder, Set,
};

pub async fn create_timeslot_handler(
    State(db): State<DatabaseConnection>,
    Path(batch_id): Path<i32>,
    Json(payload): Json<CreateTimeslot>,
) -> Result<Json<timeslots::Model>, StatusCode> {
    let batch_exists = batches::Entity::find_by_id(batch_id)
        .one(&db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .is_some();

    if !batch_exists {
        return Err(StatusCode::NOT_FOUND);
    }

    let new_timeslot = timeslots::ActiveModel {
        batch_id: Set(batch_id),
        slot_start: Set(payload.slot_start),
        slot_end: Set(payload.slot_end),
        ..Default::default()
    };

    new_timeslot.insert(&db).await.map(Json).map_err(|e| {
        eprintln!("Failed to create timeslot: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })
}

pub async fn get_timeslots_handler(
    State(db): State<DatabaseConnection>,
    Path(batch_id): Path<i32>,
) -> Result<Json<Vec<timeslots::Model>>, StatusCode> {
    match timeslots::Entity::find()
        .filter(timeslots::Column::BatchId.eq(batch_id))
        .order_by_asc(timeslots::Column::SlotStart)
        .all(&db)
        .await
    {
        Ok(data) => Ok(Json(data)),
        Err(e) => {
            eprintln!("Failed to fetch timeslots for batch {}: {}", batch_id, e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}
