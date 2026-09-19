use std::collections::{HashMap, HashSet};

use crate::handlers::metrics::{month_end, month_start};
use crate::models::{
    AllocationLinesPageQuery, AllocationsPageQuery, BatchListQuery, BatchRequirementResponse,
    BatchResponse, BatchSalesQuery, FarmInfo, InventoryMovementsPageQuery, LedgerEntriesQuery,
    LedgerMonthAccountSummary, LedgerSummaryQuery, PaginatedAllocationLines, PaginatedAllocations,
    PaginatedInventoryMovements, PaginatedLedgerEntries, PaginatedPurchases,
    PaginatedStockReceipts, PaginationParams, ProductionLineWithSupervisor, PurchaseWithItem,
    PurchasesPageQuery, StockReceiptsPageQuery, StockReceiptsQuery, SupplierPaymentTotal,
    TraderPaymentTotal, UserSimplified,
};
use axum::extract::Query;
use axum::{extract::State, http::StatusCode, response::IntoResponse, Json};
use entity::{
    sea_orm_active_enums::{BatchStatus, UserRole},
    *,
};
use sea_orm::prelude::Decimal;
use sea_orm::sea_query::{Expr, NullOrdering, Order};
use sea_orm::{ColumnTrait, ConnectionTrait, PaginatorTrait, QuerySelect};
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

pub async fn get_batch_sales_handler(
    State(db): State<DatabaseConnection>,
    Query(params): Query<BatchSalesQuery>,
) -> impl IntoResponse {
    let mut query = batch_sales::Entity::find();
    if let Some(batch_id) = params.batch_id {
        query = query.filter(batch_sales::Column::BatchId.eq(batch_id));
    }

    match query.all(&db).await {
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

// LEDGER ENTRIES — one page for the ledger screen (1-based page).
pub async fn get_ledger_entries_paginated_handler(
    State(db): State<DatabaseConnection>,
    Query(params): Query<LedgerEntriesQuery>,
) -> Result<Json<PaginatedLedgerEntries>, StatusCode> {
    let page_size = params.page_size.unwrap_or(25).clamp(1, 200);
    let page = params.page.unwrap_or(1).max(1);

    let mut query = ledger_entries::Entity::find();

    if let Some(account_id) = params.account_id {
        query = query.filter(ledger_entries::Column::AccountId.eq(account_id));
    }
    if let Some(from) = params.from {
        query = query.filter(ledger_entries::Column::TxnDate.gte(from));
    }
    if let Some(to) = params.to {
        query = query.filter(ledger_entries::Column::TxnDate.lte(to));
    }
    if let Some(reference_table) = params.reference_table.as_deref() {
        query = query.filter(ledger_entries::Column::ReferenceTable.eq(reference_table));
    }

    // Totals over the whole filtered set (not only this page) so the ledger
    // footer can reconcile debits against credits.
    let totals = query
        .clone()
        .select_only()
        .column_as(Expr::col(ledger_entries::Column::Debit).sum(), "total_debit")
        .column_as(
            Expr::col(ledger_entries::Column::Credit).sum(),
            "total_credit",
        )
        .into_tuple::<(Option<Decimal>, Option<Decimal>)>()
        .one(&db)
        .await
        .map_err(|e| {
            eprintln!("Failed to total ledger entries: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

    let (total_debit, total_credit) = totals.unwrap_or((None, None));

    let descending = params.dir.as_deref() != Some("asc");
    let direction = if descending { Order::Desc } else { Order::Asc };
    // NULL means "no debit/credit on this side" — keep those rows at the end.
    let nulls = NullOrdering::Last;

    let query = match params.sort.as_deref().unwrap_or("txn_date") {
        "entry_id" => query.order_by(ledger_entries::Column::EntryId, direction),
        "account_id" => query.order_by(ledger_entries::Column::AccountId, direction),
        "debit" => query.order_by_with_nulls(ledger_entries::Column::Debit, direction, nulls),
        "credit" => query.order_by_with_nulls(ledger_entries::Column::Credit, direction, nulls),
        "created_at" => query.order_by(ledger_entries::Column::CreatedAt, direction),
        // Newest first by default, oldest entry first within the same date.
        _ => query
            .order_by(ledger_entries::Column::TxnDate, direction)
            .order_by(ledger_entries::Column::EntryId, Order::Asc),
    };

    let paginator = query.paginate(&db, page_size);
    let total_count = paginator.num_items().await.map_err(|e| {
        eprintln!("Failed to count ledger entries: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;
    let items = paginator.fetch_page(page - 1).await.map_err(|e| {
        eprintln!("Failed to fetch ledger entry page {}: {}", page, e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    let total_pages = if total_count == 0 {
        0
    } else {
        (total_count + page_size - 1) / page_size
    };

    Ok(Json(PaginatedLedgerEntries {
        items,
        page,
        page_size,
        total_count,
        total_pages,
        total_debit: total_debit.unwrap_or_default(),
        total_credit: total_credit.unwrap_or_default(),
    }))
}

// LEDGER ENTRIES — per month + account totals for the Overview dashboard.
pub async fn get_ledger_entries_summary_handler(
    State(db): State<DatabaseConnection>,
    Query(params): Query<LedgerSummaryQuery>,
) -> Result<Json<Vec<LedgerMonthAccountSummary>>, (StatusCode, String)> {
    let Some(from) = month_start(&params.from) else {
        return Err((
            StatusCode::BAD_REQUEST,
            format!("Invalid from month '{}', expected YYYY-MM", params.from),
        ));
    };
    let Some(to) = month_end(&params.to) else {
        return Err((
            StatusCode::BAD_REQUEST,
            format!("Invalid to month '{}', expected YYYY-MM", params.to),
        ));
    };
    if from > to {
        return Err((
            StatusCode::BAD_REQUEST,
            "from month must not be after to month".to_string(),
        ));
    }

    let stmt = Statement::from_sql_and_values(
        DbBackend::Postgres,
        r#"
        SELECT
            to_char(txn_date, 'YYYY-MM') AS month,
            account_id,
            COALESCE(SUM(debit), 0) AS total_debit,
            COALESCE(SUM(credit), 0) AS total_credit,
            COUNT(*)::bigint AS count
        FROM
            ledger_entries
        WHERE
            txn_date >= $1
            AND txn_date <= $2
        GROUP BY
            1, 2
        ORDER BY
            1, 2
        "#,
        vec![from.into(), to.into()],
    );

    let rows = db.query_all(stmt).await.map_err(|e| {
        eprintln!("Failed to summarize ledger entries: {}", e);
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            "Failed to summarize ledger entries".to_string(),
        )
    })?;

    let mut summaries = Vec::with_capacity(rows.len());
    let decode = |e: sea_orm::DbErr| {
        eprintln!("Failed to decode ledger summary: {}", e);
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            "Failed to decode ledger summary".to_string(),
        )
    };

    for row in rows {
        let month: String = row.try_get("", "month").map_err(decode)?;
        let account_id: i32 = row.try_get("", "account_id").map_err(decode)?;
        let total_debit: Decimal = row.try_get("", "total_debit").map_err(decode)?;
        let total_credit: Decimal = row.try_get("", "total_credit").map_err(decode)?;
        let count: i64 = row.try_get("", "count").map_err(decode)?;

        summaries.push(LedgerMonthAccountSummary {
            month,
            account_id,
            total_debit,
            total_credit,
            count,
        });
    }

    Ok(Json(summaries))
}

// PAYMENTS — per-entity totals so the Overview does not fetch one list per entity.
pub async fn get_supplier_payment_totals_handler(
    State(db): State<DatabaseConnection>,
) -> Result<Json<Vec<SupplierPaymentTotal>>, StatusCode> {
    let stmt = Statement::from_string(
        DbBackend::Postgres,
        "SELECT supplier_id, COALESCE(SUM(amount), 0) AS total, COUNT(*)::bigint AS count \
         FROM supplier_payments GROUP BY supplier_id ORDER BY supplier_id"
            .to_string(),
    );

    let rows = db.query_all(stmt).await.map_err(|e| {
        eprintln!("Failed to total supplier payments: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    let mut totals = Vec::with_capacity(rows.len());
    for row in rows {
        let supplier_id = row.try_get::<i32>("", "supplier_id").map_err(|e| {
            eprintln!("Failed to decode supplier payment total: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;
        let total = row
            .try_get::<Decimal>("", "total")
            .unwrap_or_default();
        let count = row.try_get::<i64>("", "count").unwrap_or(0);

        totals.push(SupplierPaymentTotal {
            supplier_id,
            total,
            count,
        });
    }

    Ok(Json(totals))
}

pub async fn get_trader_payment_totals_handler(
    State(db): State<DatabaseConnection>,
) -> Result<Json<Vec<TraderPaymentTotal>>, StatusCode> {
    let stmt = Statement::from_string(
        DbBackend::Postgres,
        "SELECT trader_id, COALESCE(SUM(amount), 0) AS total, COUNT(*)::bigint AS count \
         FROM trader_payments GROUP BY trader_id ORDER BY trader_id"
            .to_string(),
    );

    let rows = db.query_all(stmt).await.map_err(|e| {
        eprintln!("Failed to total trader payments: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    let mut totals = Vec::with_capacity(rows.len());
    for row in rows {
        let trader_id = row.try_get::<i32>("", "trader_id").map_err(|e| {
            eprintln!("Failed to decode trader payment total: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;
        let total = row
            .try_get::<Decimal>("", "total")
            .unwrap_or_default();
        let count = row.try_get::<i64>("", "count").unwrap_or(0);

        totals.push(TraderPaymentTotal {
            trader_id,
            total,
            count,
        });
    }

    Ok(Json(totals))
}

// INVENTORY MOVEMENTS — one page for the inventory screen (1-based page).
pub async fn get_inventory_movements_paginated_handler(
    State(db): State<DatabaseConnection>,
    Query(params): Query<InventoryMovementsPageQuery>,
) -> Result<Json<PaginatedInventoryMovements>, StatusCode> {
    let page_size = params.page_size.unwrap_or(25).clamp(1, 200);
    let page = params.page.unwrap_or(1).max(1);

    let mut query = inventory_movements::Entity::find();
    if let Some(item_code) = params.item_code.as_deref() {
        query = query.filter(inventory_movements::Column::ItemCode.eq(item_code));
    }

    let query = query
        .order_by_desc(inventory_movements::Column::MovementDate)
        .order_by_desc(inventory_movements::Column::MovementId);

    let paginator = query.paginate(&db, page_size);
    let total_count = paginator.num_items().await.map_err(|e| {
        eprintln!("Failed to count inventory movements: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;
    let items = paginator.fetch_page(page - 1).await.map_err(|e| {
        eprintln!("Failed to fetch inventory movement page {}: {}", page, e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    let total_pages = if total_count == 0 {
        0
    } else {
        (total_count + page_size - 1) / page_size
    };

    Ok(Json(PaginatedInventoryMovements {
        items,
        page,
        page_size,
        total_count,
        total_pages,
    }))
}

// STOCK RECEIPTS — one page, server-side sort (1-based page).
pub async fn get_stock_receipts_paginated_handler(
    State(db): State<DatabaseConnection>,
    Query(params): Query<StockReceiptsPageQuery>,
) -> Result<Json<PaginatedStockReceipts>, StatusCode> {
    let page_size = params.page_size.unwrap_or(25).clamp(1, 200);
    let page = params.page.unwrap_or(1).max(1);

    let mut query = stock_receipts::Entity::find();
    if let Some(item_code) = params.item_code.as_deref() {
        query = query.filter(stock_receipts::Column::ItemCode.eq(item_code));
    }

    let descending = params.dir.as_deref() != Some("asc");
    let direction = if descending { Order::Desc } else { Order::Asc };
    let nulls = NullOrdering::Last;

    let query = match params.sort.as_deref().unwrap_or("lot_id") {
        "purchase_id" => query.order_by_with_nulls(stock_receipts::Column::PurchaseId, direction, nulls),
        "item_code" => query.order_by(stock_receipts::Column::ItemCode, direction),
        "received_qty" => query.order_by(stock_receipts::Column::ReceivedQty, direction),
        "remaining_qty" => query.order_by(stock_receipts::Column::RemainingQty, direction),
        "unit_cost" => query.order_by(stock_receipts::Column::UnitCost, direction),
        "received_date" => query.order_by(stock_receipts::Column::ReceivedDate, direction),
        "supplier" => query.order_by_with_nulls(stock_receipts::Column::Supplier, direction, nulls),
        _ => query.order_by(stock_receipts::Column::LotId, direction),
    };

    let paginator = query.paginate(&db, page_size);
    let total_count = paginator.num_items().await.map_err(|e| {
        eprintln!("Failed to count stock receipts: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;
    let items = paginator.fetch_page(page - 1).await.map_err(|e| {
        eprintln!("Failed to fetch stock receipt page {}: {}", page, e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    let total_pages = if total_count == 0 {
        0
    } else {
        (total_count + page_size - 1) / page_size
    };

    Ok(Json(PaginatedStockReceipts {
        items,
        page,
        page_size,
        total_count,
        total_pages,
    }))
}

// PURCHASES — one page of purchase lines with a running total (1-based page).
pub async fn get_purchases_paginated_handler(
    State(db): State<DatabaseConnection>,
    Query(params): Query<PurchasesPageQuery>,
) -> Result<Json<PaginatedPurchases>, StatusCode> {
    let page_size = params.page_size.unwrap_or(25).clamp(1, 200);
    let page = params.page.unwrap_or(1).max(1);

    let mut query = purchases::Entity::find();
    if let Some(supplier_id) = params.supplier_id {
        query = query.filter(purchases::Column::SupplierId.eq(supplier_id));
    }
    if let Some(from) = params.from {
        query = query.filter(purchases::Column::PurchaseDate.gte(from));
    }
    if let Some(to) = params.to {
        query = query.filter(purchases::Column::PurchaseDate.lte(to));
    }

    // Total spend over the whole filtered set, not just this page.
    let total_amount = query
        .clone()
        .select_only()
        .column_as(
            Expr::col(purchases::Column::TotalCost).sum(),
            "total_amount",
        )
        .into_tuple::<Option<Decimal>>()
        .one(&db)
        .await
        .map_err(|e| {
            eprintln!("Failed to total purchases: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?
        .flatten()
        .unwrap_or_default();

    let descending = params.dir.as_deref() != Some("asc");
    let direction = if descending { Order::Desc } else { Order::Asc };
    let nulls = NullOrdering::Last;

    let query = match params.sort.as_deref().unwrap_or("purchase_date") {
        "purchase_id" => query.order_by(purchases::Column::PurchaseId, direction),
        "item_code" => query.order_by(purchases::Column::ItemCode, direction),
        "quantity" => query.order_by(purchases::Column::Quantity, direction),
        "cost_per_unit" => query.order_by(purchases::Column::CostPerUnit, direction),
        "total_cost" => query.order_by_with_nulls(purchases::Column::TotalCost, direction, nulls),
        "supplier_id" => query.order_by(purchases::Column::SupplierId, direction),
        _ => query
            .order_by(purchases::Column::PurchaseDate, direction)
            .order_by(purchases::Column::PurchaseId, Order::Desc),
    };

    let paginator = query.paginate(&db, page_size);
    let total_count = paginator.num_items().await.map_err(|e| {
        eprintln!("Failed to count purchases: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;
    let items = paginator.fetch_page(page - 1).await.map_err(|e| {
        eprintln!("Failed to fetch purchase page {}: {}", page, e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    let total_pages = if total_count == 0 {
        0
    } else {
        (total_count + page_size - 1) / page_size
    };

    Ok(Json(PaginatedPurchases {
        items,
        page,
        page_size,
        total_count,
        total_pages,
        total_amount,
    }))
}

// PURCHASES — the lines of one order, for the edit form.
pub async fn get_purchase_order_lines_handler(
    State(db): State<DatabaseConnection>,
    axum::extract::Path(order_id): axum::extract::Path<i32>,
) -> Result<Json<Vec<purchases::Model>>, StatusCode> {
    match purchases::Entity::find()
        .filter(purchases::Column::PurchaseOrderId.eq(Some(order_id)))
        .order_by_asc(purchases::Column::PurchaseId)
        .all(&db)
        .await
    {
        Ok(lines) => Ok(Json(lines)),
        Err(e) => {
            eprintln!("Failed to fetch purchase order lines: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

// BATCH ALLOCATION LINES — one page (1-based page).
pub async fn get_batch_allocation_lines_paginated_handler(
    State(db): State<DatabaseConnection>,
    Query(params): Query<AllocationLinesPageQuery>,
) -> Result<Json<PaginatedAllocationLines>, StatusCode> {
    let page_size = params.page_size.unwrap_or(25).clamp(1, 200);
    let page = params.page.unwrap_or(1).max(1);

    let mut query = batch_allocation_lines::Entity::find();
    if let Some(batch_id) = params.batch_id {
        query = query.filter(batch_allocation_lines::Column::BatchId.eq(Some(batch_id)));
    }
    if let Some(allocation_id) = params.allocation_id {
        query = query.filter(batch_allocation_lines::Column::AllocationId.eq(allocation_id));
    }

    let query = query.order_by_desc(batch_allocation_lines::Column::AllocationLineId);

    let paginator = query.paginate(&db, page_size);
    let total_count = paginator.num_items().await.map_err(|e| {
        eprintln!("Failed to count allocation lines: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;
    let items = paginator.fetch_page(page - 1).await.map_err(|e| {
        eprintln!("Failed to fetch allocation line page {}: {}", page, e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    let total_pages = if total_count == 0 {
        0
    } else {
        (total_count + page_size - 1) / page_size
    };

    Ok(Json(PaginatedAllocationLines {
        items,
        page,
        page_size,
        total_count,
        total_pages,
    }))
}

// BATCH ALLOCATIONS — one page (1-based page).
pub async fn get_batch_allocations_paginated_handler(
    State(db): State<DatabaseConnection>,
    Query(params): Query<AllocationsPageQuery>,
) -> Result<Json<PaginatedAllocations>, StatusCode> {
    let page_size = params.page_size.unwrap_or(25).clamp(1, 200);
    let page = params.page.unwrap_or(1).max(1);

    let mut query = batch_allocations::Entity::find();
    if let Some(batch_id) = params.batch_id {
        // Allocations are batch-agnostic headers; filter through their lines.
        let allocation_ids: Vec<i32> = batch_allocation_lines::Entity::find()
            .filter(batch_allocation_lines::Column::BatchId.eq(Some(batch_id)))
            .all(&db)
            .await
            .map_err(|e| {
                eprintln!("Failed to resolve allocation ids for batch: {}", e);
                StatusCode::INTERNAL_SERVER_ERROR
            })?
            .into_iter()
            .map(|line| line.allocation_id)
            .collect();
        query = query.filter(batch_allocations::Column::AllocationId.is_in(allocation_ids));
    }

    let query = query.order_by_desc(batch_allocations::Column::AllocationId);

    let paginator = query.paginate(&db, page_size);
    let total_count = paginator.num_items().await.map_err(|e| {
        eprintln!("Failed to count allocations: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;
    let items = paginator.fetch_page(page - 1).await.map_err(|e| {
        eprintln!("Failed to fetch allocation page {}: {}", page, e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    let total_pages = if total_count == 0 {
        0
    } else {
        (total_count + page_size - 1) / page_size
    };

    Ok(Json(PaginatedAllocations {
        items,
        page,
        page_size,
        total_count,
        total_pages,
    }))
}
