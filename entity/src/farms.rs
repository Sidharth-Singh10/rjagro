//! SeaORM Entity for the `farms` table

use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "farms")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub farm_id: i32,
    pub farmer_id: i32,
    #[sea_orm(unique)]
    pub code: String,
    pub name: String,
    #[sea_orm(column_type = "Decimal(Some((10, 7)))", nullable)]
    pub latitude: Option<Decimal>,
    #[sea_orm(column_type = "Decimal(Some((10, 7)))", nullable)]
    pub longitude: Option<Decimal>,
    #[sea_orm(column_type = "Text", nullable)]
    pub video_url: Option<String>,
    #[sea_orm(column_type = "Text", nullable)]
    pub maps_url: Option<String>,
    pub created_at: DateTimeWithTimeZone,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::farmers::Entity",
        from = "Column::FarmerId",
        to = "super::farmers::Column::FarmerId",
        on_update = "NoAction",
        on_delete = "NoAction"
    )]
    Farmers,

    #[sea_orm(has_many = "super::batches::Entity")]
    Batches,
}

impl Related<super::farmers::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Farmers.def()
    }
}

impl Related<super::batches::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Batches.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
