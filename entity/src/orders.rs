//! SeaORM Entity for the `orders` table

use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

use super::sea_orm_active_enums::OrderStatus;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "orders")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub order_id: i32,
    #[sea_orm(unique)]
    pub inquiry_number: String,
    pub trader_id: i32,
    pub batch_id: i32,
    pub timeslot_id: i32,
    #[sea_orm(column_type = "Decimal(Some((12, 2)))")]
    pub requested_weight: Decimal,
    pub status: OrderStatus,
    #[sea_orm(column_type = "Decimal(Some((12, 2)))", nullable)]
    pub actual_weight: Option<Decimal>,
    pub actual_birds: Option<i32>,
    #[sea_orm(column_type = "Decimal(Some((12, 2)))", nullable)]
    pub entry_rate: Option<Decimal>,
    #[sea_orm(column_type = "Decimal(Some((18, 2)))", nullable)]
    pub total_amount: Option<Decimal>,
    #[sea_orm(column_type = "Text", nullable)]
    pub rejection_reason: Option<String>,
    pub created_at: DateTimeWithTimeZone,
    pub weight_entered_at: Option<DateTimeWithTimeZone>,
    pub confirmed_at: Option<DateTimeWithTimeZone>,
    pub cancelled_at: Option<DateTimeWithTimeZone>,
    pub rejected_at: Option<DateTimeWithTimeZone>,
    pub expired_at: Option<DateTimeWithTimeZone>,
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
        belongs_to = "super::batches::Entity",
        from = "Column::BatchId",
        to = "super::batches::Column::BatchId",
        on_update = "NoAction",
        on_delete = "NoAction"
    )]
    Batches,

    #[sea_orm(
        belongs_to = "super::timeslots::Entity",
        from = "Column::TimeslotId",
        to = "super::timeslots::Column::TimeslotId",
        on_update = "NoAction",
        on_delete = "NoAction"
    )]
    Timeslots,

    #[sea_orm(has_many = "super::audit_log::Entity")]
    AuditLog,
}

impl Related<super::app_traders::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::AppTraders.def()
    }
}

impl Related<super::batches::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Batches.def()
    }
}

impl Related<super::timeslots::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Timeslots.def()
    }
}

impl Related<super::audit_log::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::AuditLog.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
