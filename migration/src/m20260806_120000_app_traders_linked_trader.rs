use sea_orm_migration::prelude::*;

use crate::m20250810_161418_iteration1::Traders;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // App traders were created independently of the legacy `traders` table.
        // Add a nullable FK column linking each app_trader to its legacy trader
        // record (bank details, address, etc.).
        manager
            .alter_table(
                Table::alter()
                    .table(AppTraders::Table)
                    .add_column(ColumnDef::new(AppTraders::LinkedTraderId).integer())
                    .to_owned(),
            )
            .await?;

        manager
            .create_foreign_key(
                ForeignKey::create()
                    .name("fk-app_traders-linked_trader_id")
                    .from(AppTraders::Table, AppTraders::LinkedTraderId)
                    .to(Traders::Table, Traders::TraderId)
                    .on_delete(ForeignKeyAction::SetNull)
                    .on_update(ForeignKeyAction::Cascade)
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_foreign_key(
                ForeignKey::drop()
                    .name("fk-app_traders-linked_trader_id")
                    .table(AppTraders::Table)
                    .to_owned(),
            )
            .await?;

        manager
            .alter_table(
                Table::alter()
                    .table(AppTraders::Table)
                    .drop_column(AppTraders::LinkedTraderId)
                    .to_owned(),
            )
            .await
    }
}

#[derive(DeriveIden)]
enum AppTraders {
    Table,
    LinkedTraderId,
}
