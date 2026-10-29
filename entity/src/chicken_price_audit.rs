//! SeaORM entity for the `chicken_price_audit` table.
//!
//! One row per price change, so a correction always has an explanation.

use sea_orm::entity::prelude::*;
use serde::Serialize;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize)]
#[sea_orm(table_name = "chicken_price_audit")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i64,
    pub price_date: Date,
    #[sea_orm(column_type = "Decimal(Some((10, 2)))", nullable)]
    pub old_price: Option<Decimal>,
    #[sea_orm(column_type = "Decimal(Some((10, 2)))", nullable)]
    pub new_price: Option<Decimal>,
    pub action: String,
    pub changed_at: DateTimeWithTimeZone,
    pub changed_by: Option<i32>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::users::Entity",
        from = "Column::ChangedBy",
        to = "super::users::Column::UserId",
        on_update = "NoAction",
        on_delete = "SetNull"
    )]
    Users,
}

impl Related<super::users::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Users.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
