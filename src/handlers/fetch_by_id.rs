use axum::{
    extract::{Path, State},
    response::IntoResponse,
    Json,
};
use entity::{
    batch_allocations, batch_requirements, batch_sales, batches, bird_count_history,
    farmer_commission_history, farmers, farms, sea_orm_active_enums::RequirementStatus, users,
};
use reqwest::StatusCode;
use sea_orm::EntityTrait;
use sea_orm::QueryFilter;
use sea_orm::QueryOrder;
use sea_orm::QuerySelect;
use sea_orm::RelationTrait;
use sea_orm::{DatabaseConnection, DbBackend, FromQueryResult, Statement};
use sea_orm::{ColumnTrait, JoinType};

use crate::models::{
    AllocatedRequirementDTO, BatchResponse, FarmInfo, ReturnableAllocationLine, StockReturnView,
};

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
) -> Result<Json<Vec<StockReturnView>>, StatusCode> {
    let stmt = Statement::from_sql_and_values(
        DbBackend::Postgres,
        r#"
        SELECT
            sr.return_id,
            sr.allocation_line_id,
            sr.batch_id,
            sr.return_qty,
            sr.unit_cost,
            sr.return_value,
            sr.return_date,
            sr.created_at,
            srec.item_code,
            bal.lot_id
        FROM
            stock_returns sr
            JOIN batch_allocation_lines bal ON bal.allocation_line_id = sr.allocation_line_id
            JOIN stock_receipts srec ON srec.lot_id = bal.lot_id
        WHERE
            sr.batch_id = $1
        ORDER BY
            sr.return_date DESC,
            sr.return_id DESC
        "#,
        vec![batch_id.into()],
    );

    match StockReturnView::find_by_statement(stmt).all(&db).await {
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

/// Lists the allocation lines of `batch_id` for `item_code` that still have
/// quantity left to return, with each line's lot and per-lot unit cost. This
/// is what the return form uses to pick a line instead of assuming the latest
/// allocation.
pub async fn get_returnable_allocation_lines_handler(
    State(db): State<DatabaseConnection>,
    Path((batch_id, item_code)): Path<(i32, String)>,
) -> Result<Json<Vec<ReturnableAllocationLine>>, StatusCode> {
    let stmt = Statement::from_sql_and_values(
        DbBackend::Postgres,
        r#"
        SELECT
            bal.allocation_line_id,
            bal.lot_id,
            bal.qty AS allocated_qty,
            COALESCE(rt.returned_qty, 0) AS returned_qty,
            bal.qty - COALESCE(rt.returned_qty, 0) AS returnable_qty,
            bal.unit_cost
        FROM
            batch_allocation_lines bal
            JOIN stock_receipts sr ON sr.lot_id = bal.lot_id
            LEFT JOIN (
                SELECT
                    allocation_line_id,
                    SUM(return_qty) AS returned_qty
                FROM
                    stock_returns
                GROUP BY
                    allocation_line_id
            ) rt ON rt.allocation_line_id = bal.allocation_line_id
        WHERE
            bal.batch_id = $1
            AND sr.item_code = $2
            AND bal.qty - COALESCE(rt.returned_qty, 0) > 0
        ORDER BY
            bal.allocation_line_id
        "#,
        vec![batch_id.into(), item_code.clone().into()],
    );

    match ReturnableAllocationLine::find_by_statement(stmt)
        .all(&db)
        .await
    {
        Ok(lines) => Ok(Json(lines)),
        Err(e) => {
            eprintln!(
                "Failed to fetch returnable allocation lines for batch {} item {}: {}",
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
                // Fetch the related farm separately
                let farm = match batch.farm_id {
                    Some(farm_id) => farms::Entity::find_by_id(farm_id)
                        .one(&db)
                        .await
                        .ok()
                        .flatten(),
                    None => None,
                };
                let farm = farm.map(FarmInfo::from);

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
                    avg_body_weight: batch.avg_body_weight,
                    activated_at: batch.activated_at,
                    closed_at: batch.closed_at,
                    farm,
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
        .order_by_desc(batch_sales::Column::Id)
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
