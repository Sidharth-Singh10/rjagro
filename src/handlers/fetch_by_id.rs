use axum::{
    extract::{Path, State},
    Json,
};
use entity::{batch_allocation_lines, farmer_commission_history, stock_receipts, stock_returns};
use reqwest::StatusCode;
use sea_orm::EntityTrait;
use sea_orm::QueryFilter;
use sea_orm::QueryOrder;
use sea_orm::QuerySelect;
use sea_orm::RelationTrait;
use sea_orm::{prelude::Decimal, DatabaseConnection};
use sea_orm::{ColumnTrait, JoinType};
use serde_json::json;

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

pub async fn get_stock_return_unit_cost(
    State(db): State<DatabaseConnection>,
    Path((batch_id, item_code)): Path<(i32, String)>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    match batch_allocation_lines::Entity::find()
        .join(
            JoinType::InnerJoin,
            batch_allocation_lines::Relation::StockReceipts.def(),
        )
        .filter(batch_allocation_lines::Column::BatchId.eq(batch_id))
        .filter(stock_receipts::Column::ItemCode.eq(&item_code))
        .order_by_desc(batch_allocation_lines::Column::AllocationLineId)
        .select_only()
        .column(batch_allocation_lines::Column::AllocationLineId)
        .column(batch_allocation_lines::Column::UnitCost)
        .into_tuple::<(i32, Decimal)>()
        .one(&db)
        .await
    {
        Ok(Some((allocation_line_id, unit_cost))) => Ok(Json(json!({
            "allocation_line_id": allocation_line_id,
            "unit_cost": unit_cost
        }))),
        Ok(None) => Err(StatusCode::NOT_FOUND),
        Err(e) => {
            eprintln!(
                "Failed to fetch allocation line for batch {} and item {}: {}",
                batch_id, item_code, e
            );
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}
