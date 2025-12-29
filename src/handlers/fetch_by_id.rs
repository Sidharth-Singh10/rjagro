use axum::{
    extract::{Path, State},
    Json,
};
use entity::{farmer_commission_history, stock_returns};
use reqwest::StatusCode;
use sea_orm::ColumnTrait;
use sea_orm::DatabaseConnection;
use sea_orm::EntityTrait;
use sea_orm::QueryFilter;
use sea_orm::QueryOrder;

pub async fn get_farmer_commission_history_by_id_handler(
    State(db): State<DatabaseConnection>,
    Path(farmer_id): Path<i32>,
) -> Result<Json<Vec<farmer_commission_history::Model>>, StatusCode> {
    match farmer_commission_history::Entity::find()
        .filter(farmer_commission_history::Column::FarmerId.eq(farmer_id))
        .order_by_desc(farmer_commission_history::Column::CreatedAt)
        .all(&db)
        .await
    {
        Ok(records) => Ok(Json(records)),
        Err(e) => {
            eprintln!(
                "Failed to fetch commission history for farmer {}: {}",
                farmer_id, e
            );
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

pub async fn get_stock_returns_by_batch_id_handler(
    State(db): State<DatabaseConnection>,
    Path(batch_id): Path<i32>,
) -> Result<Json<Vec<stock_returns::Model>>, StatusCode> {
    match stock_returns::Entity::find()
        .filter(stock_returns::Column::BatchId.eq(batch_id))
        .order_by_desc(stock_returns::Column::ReturnDate)
        .all(&db)
        .await
    {
        Ok(data) => Ok(Json(data)),
        Err(e) => {
            eprintln!(
                "Failed to fetch stock returns for batch {}: {}",
                batch_id, e
            );
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}
