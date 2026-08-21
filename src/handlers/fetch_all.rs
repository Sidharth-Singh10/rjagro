use std::collections::{HashMap, HashSet};

use crate::models::{
    BatchListQuery, BatchRequirementResponse, BatchResponse, FarmInfo, PaginationParams,
    ProductionLineWithSupervisor, PurchaseWithItem, StockReceiptsQuery, UserSimplified,
};
use axum::extract::Query;
use axum::{extract::State, http::StatusCode, response::IntoResponse, Json};
use entity::{
    sea_orm_active_enums::{BatchStatus, UserRole},
    *,
};
use sea_orm::{ColumnTrait, PaginatorTrait};
use sea_orm::{DatabaseConnection, EntityTrait, QueryFilter};
use sea_orm::{DbBackend, QueryOrder, Statement};

// USERS
pub async fn get_users_handler(State(db): State<DatabaseConnection>) -> impl IntoResponse {
    match users::Entity::find().all(&db).await {
        Ok(data) => Json(data).into_response(),
        Err(e) => {
            eprintln!("Failed to fetch users: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR.into_response()
        }
    }
}

// PRODUCTION_LINES
pub async fn get_production_lines_handler(
    State(db): State<DatabaseConnection>,
) -> impl IntoResponse {
    let res = production_lines::Entity::find()
        .find_also_related(users::Entity) // performs LEFT JOIN automatically
        .all(&db)
        .await;

    match res {
        Ok(data) => {
            // Map into custom struct
            let result: Vec<ProductionLineWithSupervisor> = data
                .into_iter()
                .filter_map(|(line, supervisor)| {
                    supervisor.map(|sup| ProductionLineWithSupervisor {
                        line_id: line.line_id,
                        line_name: line.line_name,
                        supervisor_id: line.supervisor_id,
                        supervisor_name: sup.name,
                        created_at: line.created_at,
                    })
                })
                .collect();

            Json(result).into_response()
        }
        Err(e) => {
            eprintln!("Failed to fetch production lines: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR.into_response()
        }
    }
}

// PURCHASES
pub async fn get_purchases_handler(State(db): State<DatabaseConnection>) -> impl IntoResponse {
    // find purchases and also the related item (LEFT JOIN semantics via find_also_related)
    match purchases::Entity::find()
        .find_also_related(items::Entity)
        .all(&db)
        .await
    {
        Ok(rows) => {
            let resp: Vec<PurchaseWithItem> = rows
                .into_iter()
                .map(|(p, item_opt)| PurchaseWithItem {
                    purchase_id: p.purchase_id,
                    item_code: p.item_code,
                    // if item missing, fall back to empty string (adjust if you prefer null)
                    item_name: item_opt.map(|i| i.item_name).unwrap_or_default(),
                    cost_per_unit: p.cost_per_unit,
                    total_cost: p.total_cost,
                    quantity: p.quantity,
                    purchase_date: p.purchase_date,
                    payment_type: p.payment_type,
                    supplier_id: p.supplier_id,
                    supplier_name: None,
                    created_by: p.created_by,
                    purchase_order_id: p.purchase_order_id,
                })
                .collect();

            (StatusCode::OK, Json(resp)).into_response()
        }
        Err(e) => {
            eprintln!("Failed to fetch purchases with items: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR.into_response()
        }
    }
}

// ITEMS
pub async fn get_items_handler(State(db): State<DatabaseConnection>) -> impl IntoResponse {
    match items::Entity::find().all(&db).await {
        Ok(data) => Json(data).into_response(),
        Err(e) => {
            eprintln!("Failed to items table: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR.into_response()
        }
    }
}

// BATCHES

pub async fn get_batches_handler(
    State(db): State<DatabaseConnection>,
    Query(params): Query<BatchListQuery>,
) -> impl IntoResponse {
    // Join with related entities
    let mut query = batches::Entity::find()
        .find_also_related(users::Entity)
        .find_also_related(farmers::Entity);

    if let Some(raw_status) = params.status {
        let status = match raw_status.to_lowercase().as_str() {
            "open" => BatchStatus::Open,
            "live" => BatchStatus::Live,
            "closed" => BatchStatus::Closed,
            _ => return StatusCode::BAD_REQUEST.into_response(),
        };
        query = query.filter(batches::Column::Status.eq(status));
    }

    let records = match query.all(&db).await {
        Ok(r) => r,
        Err(e) => {
            eprintln!("Failed to fetch batches: {}", e);
            return StatusCode::INTERNAL_SERVER_ERROR.into_response();
        }
    };

    // Fetch related farms separately (find_also_related supports at most 2 joins)
    let farm_ids: HashSet<i32> = records
        .iter()
        .filter_map(|(batch, _, _)| batch.farm_id)
        .collect();

    let farms_map: HashMap<i32, farms::Model> = if farm_ids.is_empty() {
        HashMap::new()
    } else {
        match farms::Entity::find()
            .filter(farms::Column::FarmId.is_in(farm_ids.into_iter().collect::<Vec<_>>()))
            .all(&db)
            .await
        {
            Ok(list) => list.into_iter().map(|f| (f.farm_id, f)).collect(),
            Err(e) => {
                eprintln!("Failed to fetch farms: {}", e);
                return StatusCode::INTERNAL_SERVER_ERROR.into_response();
            }
        }
    };

    let data: Vec<BatchResponse> = records
        .into_iter()
        .filter_map(|(batch, user_opt, farmer_opt)| {
            let farm = batch
                .farm_id
                .and_then(|fid| farms_map.get(&fid))
                .cloned()
                .map(FarmInfo::from);
            Some(BatchResponse {
                batch_id: batch.batch_id,
                line_id: batch.line_id,
                supervisor_id: batch.supervisor_id,
                supervisor_name: user_opt?.name, // unwrap supervisor
                farmer_id: batch.farmer_id,
                farmer_name: farmer_opt?.name, // unwrap farmer
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
            })
        })
        .collect();

    Json(data).into_response()
}
// BATCH_REQUIREMENTS -> reduce query time
pub async fn get_batch_requirements_handler(
    State(db): State<DatabaseConnection>,
) -> impl IntoResponse {
    // 1) fetch requirements + optionally related line and item (single query)
    let req_with_rel = match batch_requirements::Entity::find()
        .find_also_related(production_lines::Entity)
        .find_also_related(items::Entity)
        .all(&db)
        .await
    {
        Ok(r) => r,
        Err(e) => {
            eprintln!("Failed to fetch batch requirements: {}", e);
            return StatusCode::INTERNAL_SERVER_ERROR.into_response();
        }
    };

    // collect batch_ids referenced by the requirements
    let batch_ids: HashSet<i32> = req_with_rel
        .iter()
        .map(|(req, _, _)| req.batch_id)
        .collect();

    // 2) fetch batches for those batch_ids (single query)
    let batches_vec = if batch_ids.is_empty() {
        vec![]
    } else {
        match batches::Entity::find()
            .filter(batches::Column::BatchId.is_in(batch_ids.iter().cloned().collect::<Vec<_>>()))
            .all(&db)
            .await
        {
            Ok(v) => v,
            Err(e) => {
                eprintln!("Failed to fetch batches: {}", e);
                return StatusCode::INTERNAL_SERVER_ERROR.into_response();
            }
        }
    };

    // map batch_id -> batch model
    let batches_map: HashMap<i32, batches::Model> =
        batches_vec.into_iter().map(|b| (b.batch_id, b)).collect();

    // collect supervisor_ids and farmer_ids from batches
    let mut supervisor_ids = HashSet::<i32>::new();
    let mut farmer_ids = HashSet::<i32>::new();
    for batch in batches_map.values() {
        supervisor_ids.insert(batch.supervisor_id);
        farmer_ids.insert(batch.farmer_id);
    }

    // 3) fetch users (supervisors) referenced (single query)
    let users_vec = if supervisor_ids.is_empty() {
        vec![]
    } else {
        match users::Entity::find()
            .filter(users::Column::UserId.is_in(supervisor_ids.iter().cloned().collect::<Vec<_>>()))
            .all(&db)
            .await
        {
            Ok(v) => v,
            Err(e) => {
                eprintln!("Failed to fetch users: {}", e);
                return StatusCode::INTERNAL_SERVER_ERROR.into_response();
            }
        }
    };
    let users_map: HashMap<i32, String> =
        users_vec.into_iter().map(|u| (u.user_id, u.name)).collect();

    // 4) fetch farmers referenced (single query)
    let farmers_vec = if farmer_ids.is_empty() {
        vec![]
    } else {
        match farmers::Entity::find()
            .filter(farmers::Column::FarmerId.is_in(farmer_ids.iter().cloned().collect::<Vec<_>>()))
            .all(&db)
            .await
        {
            Ok(v) => v,
            Err(e) => {
                eprintln!("Failed to fetch farmers: {}", e);
                return StatusCode::INTERNAL_SERVER_ERROR.into_response();
            }
        }
    };
    let farmers_map: HashMap<i32, String> = farmers_vec
        .into_iter()
        .map(|f| (f.farmer_id, f.name))
        .collect();

    // 5) assemble final response
    let response: Vec<BatchRequirementResponse> = req_with_rel
        .into_iter()
        .map(|(req, line_opt, item_opt)| {
            // find batch, then lookup supervisor & farmer names
            let supervisor_name = batches_map
                .get(&req.batch_id)
                .and_then(|b| users_map.get(&b.supervisor_id))
                .cloned();
            let farmer_name = batches_map
                .get(&req.batch_id)
                .and_then(|b| farmers_map.get(&b.farmer_id))
                .cloned();

            BatchRequirementResponse {
                requirement_id: req.requirement_id,
                line_id: req.line_id,
                // borrow and clone the inner fields so we don't move `line_opt`
                line_name: line_opt.as_ref().map(|l| l.line_name.clone()),
                batch_id: req.batch_id,
                item_code: req.item_code.clone(),
                // borrow and clone item fields so item_opt is not moved
                item_name: item_opt.as_ref().map(|i| i.item_name.clone()),
                item_unit: item_opt.as_ref().and_then(|i| i.unit.clone()),
                quantity: req.quantity,
                // convert enum to string (assuming RequirementStatus implements Display/DeriveActiveEnum -> to_string works)
                status: req.status,
                request_date: req.request_date,
                supervisor_name,
                farmer_name,
            }
        })
        .collect();
    Json(response).into_response()
}
// BATCH_ALLOCATIONS
pub async fn get_batch_allocations_handler(
    State(db): State<DatabaseConnection>,
) -> impl IntoResponse {
    match batch_allocations::Entity::find().all(&db).await {
        Ok(data) => Json(data).into_response(),
        Err(e) => {
            eprintln!("Failed to fetch batch allocations: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR.into_response()
        }
    }
}

// FARMERS
pub async fn get_farmers_handler(State(db): State<DatabaseConnection>) -> impl IntoResponse {
    match farmers::Entity::find().all(&db).await {
        Ok(data) => Json(data).into_response(),
        Err(e) => {
            eprintln!("Failed to fetch farmers: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR.into_response()
        }
    }
}

// FARMS
pub async fn get_farms_handler(State(db): State<DatabaseConnection>) -> impl IntoResponse {
    match farms::Entity::find().all(&db).await {
        Ok(data) => Json(data).into_response(),
        Err(e) => {
            eprintln!("Failed to fetch farms: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR.into_response()
        }
    }
}

// TRADERS
pub async fn get_traders_handler(State(db): State<DatabaseConnection>) -> impl IntoResponse {
    let sql = r#"
        SELECT 
            t.*,
            (
                -- Sum of all Credit Sales (Receivables)
                COALESCE((
                    SELECT SUM(value) 
                    FROM batch_sales 
                    WHERE trader_id = t.trader_id 
                      AND payment_type = 'RECEIVABLE'
                ), 0) 
                - 
                -- Sum of all payments received
                COALESCE((
                    SELECT SUM(amount) 
                    FROM trader_payments 
                    WHERE trader_id = t.trader_id
                ), 0)
            ) AS amount_due
        FROM traders t
        ORDER BY t.trader_id ASC
    "#;

    let result = traders::Entity::find()
        .from_raw_sql(Statement::from_string(DbBackend::Postgres, sql.to_string()))
        .into_json()
        .all(&db)
        .await;

    match result {
        Ok(data) => Json(data).into_response(),
        Err(e) => {
            eprintln!("Failed to fetch traders with balance: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR.into_response()
        }
    }
}

pub async fn get_suppliers_handler(State(db): State<DatabaseConnection>) -> impl IntoResponse {
    // 1. Construct the Raw SQL
    // We use subqueries to safely calculate sums without joining duplicate rows
    let sql = r#"
        SELECT 
            s.*,
            (
                -- Sum of all 'PAYABLE' (credit) purchases
                COALESCE((
                    SELECT SUM(total_cost) 
                    FROM purchases 
                    WHERE supplier_id = s.supplier_id 
                      AND payment_type = 'PAYABLE'
                ), 0) 
                - 
                -- Sum of all payments made
                COALESCE((
                    SELECT SUM(amount) 
                    FROM supplier_payments 
                    WHERE supplier_id = s.supplier_id
                ), 0)
            ) AS amount_due
        FROM suppliers s
        ORDER BY s.supplier_id ASC
    "#;

    // 2. Execute the query
    // .into_json() automatically maps the result (including your new 'amount_due') to JSON
    let result = suppliers::Entity::find()
        .from_raw_sql(Statement::from_string(DbBackend::Postgres, sql.to_string()))
        .into_json()
        .all(&db)
        .await;

    // 3. Return response
    match result {
        Ok(data) => Json(data).into_response(),
        Err(e) => {
            eprintln!("Failed to fetch suppliers with balance: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR.into_response()
        }
    }
}

// BIRD_COUNT_HISTORY
pub async fn get_bird_count_history_handler(
    State(db): State<DatabaseConnection>,
) -> impl IntoResponse {
    match bird_count_history::Entity::find().all(&db).await {
        Ok(data) => Json(data).into_response(),
        Err(e) => {
            eprintln!("Failed to fetch bird count history: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR.into_response()
        }
    }
}

// BIRD_SELL_HISTORY
pub async fn get_bird_sell_history_handler(
    State(db): State<DatabaseConnection>,
) -> impl IntoResponse {
    match bird_sell_history::Entity::find().all(&db).await {
        Ok(data) => Json(data).into_response(),
        Err(e) => {
            eprintln!("Failed to fetch bird sell history: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR.into_response()
        }
    }
}

pub async fn get_supervisors_handler(State(db): State<DatabaseConnection>) -> impl IntoResponse {
    match users::Entity::find()
        .filter(users::Column::Role.eq(UserRole::Supervisor)) // only supervisors
        .all(&db)
        .await
    {
        Ok(data) => {
            let supervisors: Vec<UserSimplified> = data
                .into_iter()
                .map(|u| UserSimplified {
                    user_id: u.user_id,
                    name: u.name,
                    role: u.role, // convert enum -> string
                })
                .collect();

            Json(supervisors).into_response()
        }
        Err(e) => {
            eprintln!("Failed to fetch supervisors: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR.into_response()
        }
    }
}

// INVENTORY
pub async fn get_inventory_handler(State(db): State<DatabaseConnection>) -> impl IntoResponse {
    match inventory::Entity::find().all(&db).await {
        Ok(data) => Json(data).into_response(),
        Err(e) => {
            eprintln!("Failed to fetch inventory: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR.into_response()
        }
    }
}

pub async fn get_inventory_movements_handler(
    State(db): State<DatabaseConnection>,
) -> impl IntoResponse {
    match inventory_movements::Entity::find().all(&db).await {
        Ok(data) => Json(data).into_response(),
        Err(e) => {
            eprintln!("Failed to fetch inventory movements: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR.into_response()
        }
    }
}

pub async fn get_ledger_entries_handler(State(db): State<DatabaseConnection>) -> impl IntoResponse {
    match ledger_entries::Entity::find().all(&db).await {
        Ok(data) => Json(data).into_response(),
        Err(e) => {
            eprintln!("Failed to fetch ledger entries: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR.into_response()
        }
    }
}

pub async fn get_batch_allocation_lines_handler(
    State(db): State<DatabaseConnection>,
) -> impl IntoResponse {
    match batch_allocation_lines::Entity::find().all(&db).await {
        Ok(data) => Json(data).into_response(),
        Err(e) => {
            eprintln!("Failed to fetch batch allocation lines: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR.into_response()
        }
    }
}

pub async fn get_stock_receipts_handler(
    State(db): State<DatabaseConnection>,
    Query(params): Query<StockReceiptsQuery>,
) -> Result<Json<Vec<stock_receipts::Model>>, StatusCode> {
    let mut query = stock_receipts::Entity::find();
    if let Some(item_code) = params.item_code {
        query = query.filter(stock_receipts::Column::ItemCode.eq(item_code));
    }
    match query.all(&db).await {
        Ok(data) => Ok(Json(data)),
        Err(e) => {
            eprintln!("Failed to fetch stock receipts: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

pub async fn get_ledger_accounts_handler(
    State(db): State<DatabaseConnection>,
) -> Result<Json<Vec<ledger_accounts::Model>>, StatusCode> {
    match ledger_accounts::Entity::find().all(&db).await {
        Ok(data) => Ok(Json(data)),
        Err(e) => {
            eprintln!("Failed to fetch ledger accounts: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

pub async fn get_all_farmer_commission_history_handler(
    State(db): State<DatabaseConnection>,
) -> Result<Json<Vec<farmer_commission_history::Model>>, StatusCode> {
    match farmer_commission_history::Entity::find()
        .order_by_desc(farmer_commission_history::Column::CreatedAt)
        .all(&db)
        .await
    {
        Ok(data) => Ok(Json(data)),
        Err(e) => {
            eprintln!("Failed to fetch farmer commission history: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

pub async fn get_batch_closure_summary_handler(
    State(db): State<DatabaseConnection>,
) -> impl IntoResponse {
    match batch_closure_summary::Entity::find().all(&db).await {
        Ok(data) => Json(data).into_response(),
        Err(e) => {
            eprintln!("Failed to fetch batch closure summaries: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR.into_response()
        }
    }
}

pub async fn get_batch_sales_handler(State(db): State<DatabaseConnection>) -> impl IntoResponse {
    match batch_sales::Entity::find().all(&db).await {
        Ok(data) => Json(data).into_response(),
        Err(e) => {
            eprintln!("Failed to fetch batch sales: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR.into_response()
        }
    }
}

// LOANS
pub async fn get_loans_handler(State(db): State<DatabaseConnection>) -> impl IntoResponse {
    match loans::Entity::find()
        .order_by_desc(loans::Column::LoanDate)
        .all(&db)
        .await
    {
        Ok(data) => Json(data).into_response(),
        Err(e) => {
            eprintln!("Failed to fetch loans: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR.into_response()
        }
    }
}

// LOAN_PAYMENTS
pub async fn get_loan_payments_handler(State(db): State<DatabaseConnection>) -> impl IntoResponse {
    match loan_payments::Entity::find()
        .order_by_desc(loan_payments::Column::PaymentDate)
        .all(&db)
        .await
    {
        Ok(data) => Json(data).into_response(),
        Err(e) => {
            eprintln!("Failed to fetch loan payments: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR.into_response()
        }
    }
}

pub async fn get_paginated_returns_handler(
    State(db): State<DatabaseConnection>,
    Query(params): Query<PaginationParams>,
) -> Result<Json<Vec<stock_returns::Model>>, StatusCode> {
    let query = stock_returns::Entity::find().order_by_desc(stock_returns::Column::ReturnDate);

    let page_size = params.page_size.unwrap_or(25);
    let page = params.page.unwrap_or(0);

    let paginator = query.paginate(&db, page_size);

    match paginator.fetch_page(page).await {
        Ok(data) => Ok(Json(data)),
        Err(e) => {
            eprintln!("Pagination error: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}
