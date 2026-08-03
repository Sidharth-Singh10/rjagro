//! SeaORM Entity for the `trader_ledger_entries` table

use super::sea_orm_active_enums::{LedgerEntryType, PaymentMode};
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq, Serialize, Deserialize)]
#[sea_orm(table_name = "trader_ledger_entries")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub trader_id: i32,
    pub order_id: Option<i32>,
    #[sea_orm(column_name = "type")]
    pub entry_type: LedgerEntryType,
    #[sea_orm(column_type = "Decimal(Some((18, 2)))")]
    pub amount: Decimal,
    pub payment_mode: Option<PaymentMode>,
    #[sea_orm(column_type = "Text", nullable)]
    pub screenshot_url: Option<String>,
    pub created_at: DateTimeWithTimeZone,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::app_traders::Entity",
        from = "Column::TraderId",
        to = "super::app_traders::Column::Id",
        on_update = "NoAction",
        on_delete = "NoAction"
    )]
    AppTraders,

    #[sea_orm(
        belongs_to = "super::orders::Entity",
        from = "Column::OrderId",
        to = "super::orders::Column::OrderId",
        on_update = "NoAction",
        on_delete = "NoAction"
    )]
    Orders,
}

impl Related<super::app_traders::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::AppTraders.def()
    }
}

impl Related<super::orders::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Orders.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
