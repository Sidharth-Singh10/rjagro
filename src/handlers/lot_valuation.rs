//! Deterministic lot valuation.
//!
//! Inventory is relieved by *value*, never by `qty * rounded_unit_cost`.
//!
//! A lot's book value is the exact amount it was purchased for. Chick bills are
//! quoted as a rupee total over a bird count, so the per-bird rate
//! (`total / qty`) has no finite decimal expansion and the rate stored in
//! `stock_receipts.unit_cost` is only an approximation. Relieving stock at
//! `qty * unit_cost` therefore takes a slightly different amount out of the
//! inventory account than the purchase put in, and a fully depleted lot leaves
//! a permanent rounding stub behind (which is how `inventory-chicks` reached
//! -8.86 while holding no birds at all).
//!
//! Taking the value from the lot instead means the last quantity taken carries
//! whatever value is left on that lot, so exhausting a lot relieves exactly
//! what it cost and the account nets to zero by construction.

use entity::{batch_allocation_lines, purchases, stock_receipts, stock_returns};
use sea_orm::{prelude::Decimal, ColumnTrait, ConnectionTrait, EntityTrait, QueryFilter};

/// Value already taken out of a lot, and value already put back into it.
#[derive(Debug, Default)]
struct LotTotals {
    relieved: Decimal,
    returned: Decimal,
}

/// Sums the allocation lines drawn from a lot and the returns recorded against
/// them. Reads go through the caller's connection, so lines and returns written
/// earlier in the same transaction are included.
async fn lot_totals<C: ConnectionTrait>(db: &C, lot_id: i32) -> Result<LotTotals, String> {
    let lines = batch_allocation_lines::Entity::find()
        .filter(batch_allocation_lines::Column::LotId.eq(lot_id))
        .all(db)
        .await
        .map_err(|e| format!("Failed to load allocation lines for lot {}: {}", lot_id, e))?;

    let relieved: Decimal = lines.iter().map(|line| line.line_value).sum();

    let mut totals = LotTotals {
        relieved,
        returned: Decimal::ZERO,
    };

    if !lines.is_empty() {
        let line_ids: Vec<i32> = lines.iter().map(|line| line.allocation_line_id).collect();
        let returns = stock_returns::Entity::find()
            .filter(stock_returns::Column::AllocationLineId.is_in(line_ids))
            .all(db)
            .await
            .map_err(|e| format!("Failed to load stock returns for lot {}: {}", lot_id, e))?;

        totals.returned = returns.iter().map(|entry| entry.return_value).sum();
    }

    Ok(totals)
}

/// What a lot cost when it was bought: the purchase's exact total when the lot
/// came from a purchase, otherwise `received_qty * unit_cost`.
pub async fn lot_purchased_value<C: ConnectionTrait>(
    db: &C,
    receipt: &stock_receipts::Model,
) -> Result<Decimal, String> {
    if let Some(purchase_id) = receipt.purchase_id {
        let purchase = purchases::Entity::find_by_id(purchase_id)
            .one(db)
            .await
            .map_err(|e| format!("Failed to load purchase {}: {}", purchase_id, e))?;

        if let Some(total_cost) = purchase.and_then(|purchase| purchase.total_cost) {
            return Ok(total_cost);
        }
    }

    Ok(receipt.received_qty * receipt.unit_cost)
}

/// Value to post when `take_qty` is taken out of `receipt`'s lot.
///
/// A partial take is valued pro-rata against what is left on the lot; the take
/// that exhausts the lot carries the exact remainder, so the lot is worth zero
/// once its stock is gone.
pub async fn relieve_lot<C: ConnectionTrait>(
    db: &C,
    receipt: &stock_receipts::Model,
    take_qty: Decimal,
) -> Result<Decimal, String> {
    if take_qty <= Decimal::ZERO || receipt.remaining_qty <= Decimal::ZERO {
        return Ok(Decimal::ZERO);
    }

    let purchased = lot_purchased_value(db, receipt).await?;
    let totals = lot_totals(db, receipt.lot_id).await?;
    let remaining_value = purchased - totals.relieved + totals.returned;

    if take_qty >= receipt.remaining_qty {
        // The lot is being emptied: flush its exact remainder instead of
        // re-multiplying a rounded rate, so no valuation stub survives it.
        if remaining_value < Decimal::ZERO {
            tracing::warn!(
                lot_id = receipt.lot_id,
                remaining_value = %remaining_value,
                "lot is over-relieved; clamping the final relief to zero"
            );
            return Ok(Decimal::ZERO);
        }
        return Ok(remaining_value);
    }

    let pro_rata = (remaining_value * take_qty / receipt.remaining_qty).round_dp(2);
    Ok(pro_rata.min(remaining_value))
}

/// Value to post when `return_qty` of an allocation line is returned to stock.
///
/// The return restores what the line actually took out of inventory: a partial
/// return is pro-rata against the line's value, and the return that reverses the
/// whole line restores the exact remainder.
pub async fn return_value_for_line<C: ConnectionTrait>(
    db: &C,
    line: &batch_allocation_lines::Model,
    return_qty: Decimal,
) -> Result<Decimal, String> {
    if return_qty <= Decimal::ZERO {
        return Ok(Decimal::ZERO);
    }

    let existing = stock_returns::Entity::find()
        .filter(stock_returns::Column::AllocationLineId.eq(line.allocation_line_id))
        .all(db)
        .await
        .map_err(|e| {
            format!(
                "Failed to load returns for allocation line {}: {}",
                line.allocation_line_id, e
            )
        })?;

    let returned_qty: Decimal = existing.iter().map(|entry| entry.return_qty).sum();
    let returned_value: Decimal = existing.iter().map(|entry| entry.return_value).sum();
    let remaining_qty = line.qty - returned_qty;
    let remaining_value = line.line_value - returned_value;

    if return_qty >= remaining_qty {
        return Ok(remaining_value.max(Decimal::ZERO));
    }

    if line.qty <= Decimal::ZERO {
        return Ok(Decimal::ZERO);
    }

    let pro_rata = (line.line_value * return_qty / line.qty).round_dp(2);
    Ok(pro_rata.min(remaining_value.max(Decimal::ZERO)))
}
