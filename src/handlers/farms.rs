use crate::models::CreateFarm;
use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use entity::farms;
use sea_orm::{ActiveModelTrait, DatabaseConnection, EntityTrait, Set};

pub async fn create_farm_handler(
    State(db): State<DatabaseConnection>,
    Json(payload): Json<CreateFarm>,
) -> Result<Json<farms::Model>, (StatusCode, String)> {
    let new_farm = farms::ActiveModel {
        farmer_id: Set(payload.farmer_id),
        code: Set(payload.code),
        name: Set(payload.name),
        location: Set(payload.location),
        video_url: Set(payload.video_url),
        gmaps_url: Set(payload.gmaps_url),
        ..Default::default()
    };

    new_farm.insert(&db).await.map(Json).map_err(|err| {
        eprintln!("Failed to create farm: {}", err);
        (StatusCode::INTERNAL_SERVER_ERROR, err.to_string())
    })
}

pub async fn get_farm_by_id_handler(
    State(db): State<DatabaseConnection>,
    Path(farm_id): Path<i32>,
) -> Result<Json<farms::Model>, StatusCode> {
    match farms::Entity::find_by_id(farm_id).one(&db).await {
        Ok(Some(farm)) => Ok(Json(farm)),
        Ok(None) => Err(StatusCode::NOT_FOUND),
        Err(e) => {
            eprintln!("Failed to fetch farm {}: {}", farm_id, e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}
