//! SeaORM entity for the `chicken_prices` table.
//!
//! One row per quoted day. A missing row means no quote for that day; it is
//! never stored as zero.

use sea_orm::entity::prelude::*;
use serde::Serialize;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize)]
#[sea_orm(table_name = "chicken_prices")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub price_date: Date,
    #[sea_orm(column_type = "Decimal(Some((10, 2)))")]
    pub price: Decimal,
    pub quote_source: String,
    pub note: Option<String>,
    pub updated_at: DateTimeWithTimeZone,
    pub updated_by: Option<i32>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::users::Entity",
        from = "Column::UpdatedBy",
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
