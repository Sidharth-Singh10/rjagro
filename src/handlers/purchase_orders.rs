use crate::consts::{
    CASH_ACCOUNT_ID, CHICKS_INVENTORY_ACCOUNT_ID, FEED_INVENTORY_ACCOUNT_ID,
    LIABILITY_ACCOUNT_ID, MEDICINE_INVENTORY_ACCOUNT_ID,
};
use crate::handlers::purchases::{
    internal_error, insert_purchase_line, update_account_balance, PurchaseLineData,
};
use crate::models::{CreatePurchaseOrder, PurchaseOrderResponse, PurchaseWithItem};
use axum::{
    extract::{Path, State},
    response::IntoResponse,
    Json,
};
use entity::sea_orm_active_enums::{ItemCategory, PaymentType};
use entity::{inventory, inventory_movements, items, ledger_entries, purchase_orders, purchases, stock_receipts, suppliers};
use reqwest::StatusCode;
use sea_orm::prelude::Decimal;
use sea_orm::{
    ActiveModelTrait, ActiveValue::Set, ColumnTrait, DatabaseConnection, EntityTrait,
    QueryFilter, QueryOrder, TransactionTrait,
};
use std::collections::HashMap;

fn inventory_account_for(category: &ItemCategory) -> i32 {
    match category {
        ItemCategory::Feed => FEED_INVENTORY_ACCOUNT_ID,
        ItemCategory::Medicine => MEDICINE_INVENTORY_ACCOUNT_ID,
        ItemCategory::Chicks => CHICKS_INVENTORY_ACCOUNT_ID,
        ItemCategory::FinishedBirds => CHICKS_INVENTORY_ACCOUNT_ID,
    }
}

fn payment_account_for(payment_type: &PaymentType) -> i32 {
    match payment_type {
        PaymentType::Cash => CASH_ACCOUNT_ID,
        PaymentType::Payable | PaymentType::Receivable => LIABILITY_ACCOUNT_ID,
    }
}

pub async fn create_purchase_order(
    State(db): State<DatabaseConnection>,
    Json(payload): Json<CreatePurchaseOrder>,
) -> impl IntoResponse {
    if payload.items.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            "Purchase order must contain at least one item",
        )
            .into_response();
    }

    let txn = match db.begin().await {
        Ok(txn) => txn,
        Err(e) => {
            eprintln!("Failed to start transaction: {:?}", e);
            return StatusCode::INTERNAL_SERVER_ERROR.into_response();
        }
    };

    // Pre-fetch item categories so we can derive the per-line inventory account.
    let item_codes: Vec<String> = payload.items.iter().map(|i| i.item_code.clone()).collect();
    let item_rows = match items::Entity::find()
        .filter(items::Column::ItemCode.is_in(item_codes))
        .all(&txn)
        .await
    {
        Ok(rows) => rows,
        Err(e) => {
            eprintln!("Failed to fetch items: {:?}", e);
            txn.rollback().await.ok();
            return StatusCode::INTERNAL_SERVER_ERROR.into_response();
        }
    };
    let category_map: HashMap<String, ItemCategory> = item_rows
        .into_iter()
        .map(|i| (i.item_code, i.item_category))
        .collect();

    // 1. Insert the order header with the summed total cost.
    let total_cost: Decimal = payload
        .items
        .iter()
        .map(|i| i.cost_per_unit * i.quantity)
        .sum();

    let order = purchase_orders::ActiveModel {
        supplier_id: Set(payload.supplier_id),
        purchase_date: Set(payload.purchase_date),
        payment_type: Set(Some(payload.payment_type.clone())),
        created_by: Set(payload.created_by),
        total_cost: Set(total_cost),
        ..Default::default()
    };

    let order = match order.insert(&txn).await {
        Ok(o) => o,
        Err(e) => {
            eprintln!("Failed to insert purchase order: {:?}", e);
            txn.rollback().await.ok();
            return StatusCode::INTERNAL_SERVER_ERROR.into_response();
        }
    };

    // 2. Insert each line item, reusing the single-purchase side-effect logic.
    for item in &payload.items {
        let category = category_map
            .get(&item.item_code)
            .cloned()
            .unwrap_or(ItemCategory::Feed);

        let line = PurchaseLineData {
            item_code: item.item_code.clone(),
            quantity: item.quantity,
            cost_per_unit: item.cost_per_unit,
            purchase_date: payload.purchase_date,
            supplier_id: payload.supplier_id,
            supplier: payload.supplier.clone(),
            created_by: payload.created_by,
            inventory_account_id: inventory_account_for(&category),
            payment_account_id: payment_account_for(&payload.payment_type),
            payment_type: payload.payment_type.clone(),
        };

        if let Err(e) = insert_purchase_line(&txn, &line, Some(order.purchase_order_id)).await {
            eprintln!(
                "Failed to insert purchase line for item {}: {:?}",
                item.item_code, e
            );
            txn.rollback().await.ok();
            return StatusCode::INTERNAL_SERVER_ERROR.into_response();
        }
    }

    if let Err(e) = txn.commit().await {
        eprintln!("Failed to commit transaction: {:?}", e);
        return StatusCode::INTERNAL_SERVER_ERROR.into_response();
    }

    Json(order).into_response()
}

pub async fn delete_purchase_order(
    State(db): State<DatabaseConnection>,
    Path(order_id): Path<i32>,
) -> Result<reqwest::StatusCode, reqwest::StatusCode> {
    let txn = db
        .begin()
        .await
        .map_err(internal_error("begin transaction"))?;

    let _order = purchase_orders::Entity::find_by_id(order_id)
        .one(&txn)
        .await
        .map_err(internal_error("fetch purchase order"))?
        .ok_or(reqwest::StatusCode::NOT_FOUND)?;

    let lines = purchases::Entity::find()
        .filter(purchases::Column::PurchaseOrderId.eq(Some(order_id)))
        .all(&txn)
        .await
        .map_err(internal_error("fetch purchase lines"))?;

    // Reverse each line's side effects (ledger, inventory, movements, stock
    // receipts) by delegating to the existing line-level deletion logic.
    for line in lines {
        delete_purchase_line(&txn, line.purchase_id).await?;
    }

    // Delete the order header.
    purchase_orders::Entity::delete_by_id(order_id)
        .exec(&txn)
        .await
        .map_err(internal_error("delete purchase order"))?;

    txn.commit()
        .await
        .map_err(internal_error("commit transaction"))?;

    Ok(reqwest::StatusCode::NO_CONTENT)
}

// Reuses the same reversal steps as the single-purchase delete, but operates on
// the passed transaction so it composes inside order deletion.
async fn delete_purchase_line(
    txn: &sea_orm::DatabaseTransaction,
    purchase_id: i32,
) -> Result<(), StatusCode> {
    let purchase = purchases::Entity::find_by_id(purchase_id)
        .one(txn)
        .await
        .map_err(internal_error("fetch purchase"))?
        .ok_or(StatusCode::NOT_FOUND)?;

    let item_code = purchase.item_code.clone();
    let qty = purchase.quantity;

    // 1. Reverse ledger entries effects on account balances
    let entries = ledger_entries::Entity::find()
        .filter(ledger_entries::Column::ReferenceTable.eq(Some("purchases".to_string())))
        .filter(ledger_entries::Column::ReferenceId.eq(Some(purchase_id)))
        .all(txn)
        .await
        .map_err(internal_error("fetch ledger entries"))?;

    for entry in entries.iter() {
        if let Some(debit) = entry.debit {
            update_account_balance(txn, entry.account_id, Some(debit), false).await?;
        }
        if let Some(credit) = entry.credit {
            update_account_balance(txn, entry.account_id, Some(credit), true).await?;
        }
    }

    ledger_entries::Entity::delete_many()
        .filter(ledger_entries::Column::ReferenceTable.eq(Some("purchases".to_string())))
        .filter(ledger_entries::Column::ReferenceId.eq(Some(purchase_id)))
        .exec(txn)
        .await
        .map_err(internal_error("delete ledger entries"))?;

    // 2. Update inventory
    if let Some(inv) = inventory::Entity::find_by_id(item_code.clone())
        .one(txn)
        .await
        .map_err(internal_error("fetch inventory"))?
    {
        let mut active_inv: inventory::ActiveModel = inv.into();
        let current_qty = active_inv.current_qty.take().unwrap_or_default();
        let new_qty = current_qty - qty;

        if new_qty < Decimal::ZERO {
            return Err(StatusCode::BAD_REQUEST);
        }

        active_inv.current_qty = Set(new_qty);
        active_inv.last_updated = Set(chrono::Utc::now().into());
        active_inv
            .update(txn)
            .await
            .map_err(internal_error("update inventory"))?;
    } else {
        return Err(StatusCode::BAD_REQUEST);
    }

    // 3. Delete movement + stock receipts
    inventory_movements::Entity::delete_many()
        .filter(inventory_movements::Column::ReferenceId.eq(Some(purchase_id)))
        .exec(txn)
        .await
        .map_err(internal_error("delete inventory movements"))?;

    stock_receipts::Entity::delete_many()
        .filter(stock_receipts::Column::PurchaseId.eq(Some(purchase_id)))
        .exec(txn)
        .await
        .map_err(internal_error("delete stock receipts"))?;

    // 4. Delete the purchase line
    purchases::Entity::delete_by_id(purchase_id)
        .exec(txn)
        .await
        .map_err(internal_error("delete purchase"))?;

    Ok(())
}

pub async fn get_purchase_orders(
    State(db): State<DatabaseConnection>,
) -> Result<Json<Vec<PurchaseOrderResponse>>, StatusCode> {
    let orders = purchase_orders::Entity::find()
        .order_by_desc(purchase_orders::Column::PurchaseOrderId)
        .all(&db)
        .await
        .map_err(|e| {
            eprintln!("Failed to fetch purchase orders: {:?}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

    // Fetch suppliers for names.
    let supplier_ids: Vec<i32> = orders.iter().map(|o| o.supplier_id).collect();
    let suppliers = suppliers::Entity::find()
        .filter(suppliers::Column::SupplierId.is_in(supplier_ids))
        .all(&db)
        .await
        .unwrap_or_default();
    let supplier_map: HashMap<i32, String> =
        suppliers.into_iter().map(|s| (s.supplier_id, s.name)).collect();

    let mut responses = Vec::with_capacity(orders.len());

    for order in orders {
        let lines = purchases::Entity::find()
            .filter(purchases::Column::PurchaseOrderId.eq(Some(order.purchase_order_id)))
            .find_also_related(items::Entity)
            .all(&db)
            .await
            .map_err(|e| {
                eprintln!("Failed to fetch purchase lines: {:?}", e);
                StatusCode::INTERNAL_SERVER_ERROR
            })?;

        let lines: Vec<PurchaseWithItem> = lines
            .into_iter()
            .map(|(p, item_opt)| PurchaseWithItem {
                purchase_id: p.purchase_id,
                item_code: p.item_code,
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

        responses.push(PurchaseOrderResponse {
            purchase_order_id: order.purchase_order_id,
            supplier_id: order.supplier_id,
            supplier_name: supplier_map.get(&order.supplier_id).cloned(),
            purchase_date: order.purchase_date,
            payment_type: order.payment_type,
            created_by: order.created_by,
            total_cost: order.total_cost,
            lines,
        });
    }

    Ok(Json(responses))
}
