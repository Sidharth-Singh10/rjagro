use sea_orm::entity::prelude::*;
use serde::Serialize;

use crate::sea_orm_active_enums::PaymentType;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq, Serialize)]
#[sea_orm(table_name = "batch_sales")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    #[sea_orm(column_type = "Text")]
    pub item_code: String,
    pub batch_id: i32,
    pub trader_id: i32,
    pub avg_weight: Decimal,
    pub rate: Decimal,
    pub quantity: Decimal,
    pub value: Decimal,
    pub payment_type: PaymentType,
    pub sale_date: Date,
    pub created_at: DateTimeWithTimeZone,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::items::Entity",
        from = "Column::ItemCode",
        to = "super::items::Column::ItemCode",
        on_update = "NoAction",
        on_delete = "Cascade"
    )]
    Items,

    #[sea_orm(
        belongs_to = "super::batches::Entity",
        from = "Column::BatchId",
        to = "super::batches::Column::BatchId",
        on_update = "NoAction",
        on_delete = "Cascade"
    )]
    Batches,

    #[sea_orm(
        belongs_to = "super::traders::Entity",
        from = "Column::TraderId",
        to = "super::traders::Column::TraderId",
        on_update = "NoAction",
        on_delete = "Cascade"
    )]
    Traders,
}

impl Related<super::items::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Items.def()
    }
}

impl Related<super::batches::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Batches.def()
    }
}

impl Related<super::traders::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Traders.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
