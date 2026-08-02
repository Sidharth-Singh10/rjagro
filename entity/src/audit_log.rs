//! SeaORM Entity for the `audit_log` table

use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq, Serialize, Deserialize)]
#[sea_orm(table_name = "audit_log")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub audit_id: i32,
    pub order_id: i32,
    pub actor_type: String,
    pub actor_id: i32,
    pub action: String,
    pub field_changed: Option<String>,
    #[sea_orm(column_type = "Text", nullable)]
    pub old_value: Option<String>,
    #[sea_orm(column_type = "Text", nullable)]
    pub new_value: Option<String>,
    pub created_at: DateTimeWithTimeZone,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::orders::Entity",
        from = "Column::OrderId",
        to = "super::orders::Column::OrderId",
        on_update = "NoAction",
        on_delete = "NoAction"
    )]
    Orders,
}

impl Related<super::orders::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Orders.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
