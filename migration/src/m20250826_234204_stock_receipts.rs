use sea_orm_migration::prelude::*;
use sea_orm_migration::schema::*;

use crate::m20250810_161418_iteration1::BatchAllocations;
use crate::m20250810_161418_iteration1::Items;
use crate::m20250810_161418_iteration1::Purchases;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Create stock_receipts table
        manager
            .create_table(
                Table::create()
                    .table(StockReceipts::Table)
                    .if_not_exists()
                    .col(pk_auto(StockReceipts::LotId))
                    .col(integer(StockReceipts::PurchaseId))
                    .col(string_len(StockReceipts::ItemCode, 100).not_null())
                    .col(decimal_len(StockReceipts::ReceivedQty, 12, 2).not_null())
                    .col(decimal_len(StockReceipts::RemainingQty, 12, 2).not_null())
                    .col(decimal_len(StockReceipts::UnitCost, 12, 2).not_null())
                    .col(date(StockReceipts::ReceivedDate).not_null())
                    .col(string_len(StockReceipts::Supplier, 100))
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_stock_receipts_purchase")
                            .from(StockReceipts::Table, StockReceipts::PurchaseId)
                            .to(Purchases::Table, Purchases::PurchaseId)
                            .on_update(ForeignKeyAction::Cascade)
                            .on_delete(ForeignKeyAction::SetNull),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_stock_receipts_item")
                            .from(StockReceipts::Table, StockReceipts::ItemCode)
                            .to(Items::Table, Items::ItemCode)
                            .on_update(ForeignKeyAction::Cascade)
                            .on_delete(ForeignKeyAction::Restrict),
                    )
                    .to_owned(),
            )
            .await?;

        // Create batch_allocation_lines table
        manager
            .create_table(
                Table::create()
                    .table(BatchAllocationLines::Table)
                    .if_not_exists()
                    .col(pk_auto(BatchAllocationLines::AllocationLineId))
                    .col(integer(BatchAllocationLines::AllocationId).not_null())
                    .col(integer(BatchAllocationLines::LotId).not_null())
                    .col(decimal_len(BatchAllocationLines::Qty, 12, 2).not_null())
                    .col(decimal_len(BatchAllocationLines::UnitCost, 12, 2).not_null())
                    .col(decimal_len(BatchAllocationLines::LineValue, 12, 2).not_null())
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_allocation_lines_allocation")
                            .from(
                                BatchAllocationLines::Table,
                                BatchAllocationLines::AllocationId,
                            )
                            .to(BatchAllocations::Table, BatchAllocations::AllocationId)
                            .on_update(ForeignKeyAction::Cascade)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_allocation_lines_lot")
                            .from(BatchAllocationLines::Table, BatchAllocationLines::LotId)
                            .to(StockReceipts::Table, StockReceipts::LotId)
                            .on_update(ForeignKeyAction::Cascade)
                            .on_delete(ForeignKeyAction::Restrict),
                    )
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Drop in reverse order to satisfy FK constraints
        manager
            .drop_table(Table::drop().table(BatchAllocationLines::Table).to_owned())
            .await?;

        manager
            .drop_table(Table::drop().table(StockReceipts::Table).to_owned())
            .await?;

        Ok(())
    }
}

#[derive(DeriveIden)]
enum StockReceipts {
    Table,
    LotId,
    PurchaseId,
    ItemCode,
    ReceivedQty,
    RemainingQty,
    UnitCost,
    ReceivedDate,
    Supplier,
}

#[derive(DeriveIden)]
pub enum BatchAllocationLines {
    Table,
    AllocationLineId,
    AllocationId,
    LotId,
    Qty,
    UnitCost,
    LineValue,
}
