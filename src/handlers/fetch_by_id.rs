use axum::{
    extract::{Path, State},
    response::IntoResponse,
    Json,
};
use entity::{
    batch_allocation_lines, batch_allocations, batch_requirements, batch_sales, batches,
    bird_count_history, farmer_commission_history, farmers,
    sea_orm_active_enums::RequirementStatus, stock_receipts, stock_returns, users,
};
use reqwest::StatusCode;
use sea_orm::EntityTrait;
use sea_orm::QueryFilter;
use sea_orm::QueryOrder;
use sea_orm::QuerySelect;
use sea_orm::RelationTrait;
use sea_orm::{prelude::Decimal, DatabaseConnection};
use sea_orm::{ColumnTrait, JoinType};
use serde_json::json;

use crate::models::{AllocatedRequirementDTO, BatchResponse};

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

pub async fn get_batch_by_id_handler(
    State(db): State<DatabaseConnection>,
    Path(batch_id): Path<i32>,
) -> impl IntoResponse {
    let batch_with_relations = batches::Entity::find_by_id(batch_id)
        .find_also_related(users::Entity)
        .find_also_related(farmers::Entity)
        .one(&db)
        .await;

    match batch_with_relations {
        Err(e) => {
            eprintln!("Failed to fetch batch: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR.into_response()
        }

        Ok(None) => StatusCode::NOT_FOUND.into_response(),

        Ok(Some((batch, user_opt, farmer_opt))) => {
            if let (Some(user), Some(farmer)) = (user_opt, farmer_opt) {
                let response = BatchResponse {
                    batch_id: batch.batch_id,
                    line_id: batch.line_id,
                    supervisor_id: batch.supervisor_id,
                    supervisor_name: user.name,
                    farmer_id: batch.farmer_id,
                    farmer_name: farmer.name,
                    start_date: batch.start_date,
                    end_date: batch.end_date,
                    initial_bird_count: batch.initial_bird_count,
                    current_bird_count: batch.current_bird_count,
                    status: batch.status,
                    created_at: batch.created_at,
                };

                Json(response).into_response()
            } else {
                (
                    StatusCode::NOT_FOUND,
                    "Related Supervisor or Farmer not found",
                )
                    .into_response()
            }
        }
    }
}

pub async fn get_sales_by_batch_id_handler(
    State(db): State<DatabaseConnection>,
    Path(batch_id): Path<i32>,
) -> impl IntoResponse {
    let sales_result = batch_sales::Entity::find()
        .filter(batch_sales::Column::BatchId.eq(batch_id))
        .all(&db)
        .await;

    match sales_result {
        Ok(sales) => Json(sales).into_response(),
        Err(e) => {
            eprintln!("Failed to fetch sales for batch {}: {}", batch_id, e);
            StatusCode::INTERNAL_SERVER_ERROR.into_response()
        }
    }
}

pub async fn get_accepted_allocations_handler(
    State(db): State<DatabaseConnection>,
    Path(batch_id): Path<i32>,
) -> impl IntoResponse {
    let results = batch_requirements::Entity::find()
        .filter(batch_requirements::Column::BatchId.eq(batch_id))
        .filter(batch_requirements::Column::Status.eq(RequirementStatus::Accept))
        .join(
            JoinType::InnerJoin,
            batch_requirements::Relation::BatchAllocations.def(),
        )
        .select_only()
        .column(batch_requirements::Column::RequirementId)
        .column(batch_requirements::Column::ItemCode)
        .column_as(batch_requirements::Column::Quantity, "requested_qty") // Alias to match DTO field
        .column(batch_allocations::Column::AllocationId)
        .column(batch_allocations::Column::AllocatedQty)
        .column(batch_allocations::Column::AllocatedValue)
        .column(batch_allocations::Column::AllocationDate)
        .into_model::<AllocatedRequirementDTO>()
        .all(&db)
        .await;

    match results {
        Ok(data) => Json(data).into_response(),
        Err(e) => {
            eprintln!(
                "Failed to fetch accepted allocations for batch {}: {}",
                batch_id, e
            );
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Database error: {}", e),
            )
                .into_response()
        }
    }
}

pub async fn get_bird_count_history_handler(
    State(db): State<DatabaseConnection>,
    Path(batch_id): Path<i32>,
) -> impl IntoResponse {
    let query =
        bird_count_history::Entity::find().filter(bird_count_history::Column::BatchId.eq(batch_id));

    match query.all(&db).await {
        Ok(data) => Json(data).into_response(),
        Err(e) => {
            eprintln!("Failed to fetch bird count history: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR.into_response()
        }
    }
}
