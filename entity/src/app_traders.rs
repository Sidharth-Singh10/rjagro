//! SeaORM Entity for the `app_traders` table (trader mobile app users)

use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq, Serialize, Deserialize)]
#[sea_orm(table_name = "app_traders")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    #[sea_orm(unique)]
    pub email: String,
    pub name: String,
    #[sea_orm(unique)]
    pub phone: String,
    pub credit_limit: Option<Decimal>,
    pub credit_terms_days: Option<i32>,
    pub linked_trader_id: Option<i32>,
    pub created_at: DateTimeWithTimeZone,
    pub password_hash: String,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(has_many = "super::orders::Entity")]
    Orders,
    #[sea_orm(
        belongs_to = "super::traders::Entity",
        from = "Column::LinkedTraderId",
        to = "super::traders::Column::TraderId"
    )]
    Traders,
}

impl Related<super::orders::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Orders.def()
    }
}

impl Related<super::traders::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Traders.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
