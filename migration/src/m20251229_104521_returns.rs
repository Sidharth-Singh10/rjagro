use sea_orm_migration::prelude::*;

use crate::{m20250810_161418_iteration1::Batches, m20250826_234204_stock_receipts::BatchAllocationLines};

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(StockReturns::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(StockReturns::ReturnId)
                            .integer()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(
                        ColumnDef::new(StockReturns::AllocationLineId)
                            .integer()
                            .not_null(),
                    )
                    .col(ColumnDef::new(StockReturns::BatchId).integer().not_null())
                    .col(
                        ColumnDef::new(StockReturns::ReturnQty)
                            .decimal_len(12, 2)
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(StockReturns::UnitCost)
                            .decimal_len(12, 2)
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(StockReturns::ReturnValue)
                            .decimal_len(12, 2)
                            .not_null(),
                    )
                    .col(ColumnDef::new(StockReturns::ReturnDate).date().not_null())
                    // Foreign Key to Allocation Lines (Source of Truth)
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk-stock_returns-allocation_line_id")
                            .from(StockReturns::Table, StockReturns::AllocationLineId)
                            .to(
                                BatchAllocationLines::Table,
                                BatchAllocationLines::AllocationLineId,
                            )
                            .on_delete(ForeignKeyAction::Restrict)
                            .on_update(ForeignKeyAction::Cascade),
                    )
                    // Foreign Key to Batches (Denormalized Lookup)
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk-stock_returns-batch_id")
                            .from(StockReturns::Table, StockReturns::BatchId)
                            .to(Batches::Table, Batches::BatchId)
                            .on_delete(ForeignKeyAction::Restrict)
                            .on_update(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        // Create an index on BatchId for fast reads
        manager
            .create_index(
                Index::create()
                    .name("idx-stock_returns-batch_id")
                    .table(StockReturns::Table)
                    .col(StockReturns::BatchId)
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(StockReturns::Table).to_owned())
            .await
    }
}

#[derive(Iden)]
enum StockReturns {
    Table,
    ReturnId,
    AllocationLineId,
    BatchId,
    ReturnQty,
    UnitCost,
    ReturnValue,
    ReturnDate,
}
