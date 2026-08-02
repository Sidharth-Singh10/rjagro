//! SeaORM Entity for the `app_traders` table (trader mobile app users)

use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq, Serialize, Deserialize)]
#[sea_orm(table_name = "app_traders")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    #[sea_orm(unique)]
    pub google_sub: String,
    #[sea_orm(unique)]
    pub email: String,
    pub name: String,
    pub phone: Option<String>,
    pub credit_limit: Option<Decimal>,
    pub credit_terms_days: Option<i32>,
    pub created_at: DateTimeWithTimeZone,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
