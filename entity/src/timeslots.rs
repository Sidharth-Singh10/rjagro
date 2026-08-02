//! SeaORM Entity for the `timeslots` table

use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq, Serialize, Deserialize)]
#[sea_orm(table_name = "timeslots")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub timeslot_id: i32,
    pub batch_id: i32,
    pub slot_start: Time,
    pub slot_end: Time,
    pub created_at: DateTimeWithTimeZone,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::batches::Entity",
        from = "Column::BatchId",
        to = "super::batches::Column::BatchId",
        on_update = "NoAction",
        on_delete = "Cascade"
    )]
    Batches,

    #[sea_orm(has_many = "super::orders::Entity")]
    Orders,
}

impl Related<super::batches::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Batches.def()
    }
}

impl Related<super::orders::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Orders.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
