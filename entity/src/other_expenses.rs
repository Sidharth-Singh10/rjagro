use sea_orm::entity::prelude::*;
use serde::Serialize;

use super::sea_orm_active_enums::OtherExpenseCategory;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize)]
#[sea_orm(table_name = "other_expenses")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub category: OtherExpenseCategory,
    #[sea_orm(column_type = "Decimal(Some((18, 2)))")]
    pub amount: Decimal,
    #[sea_orm(column_type = "Text", nullable)]
    pub description: Option<String>,
    pub expense_date: Date,
    pub created_by: i32,
    pub created_at: DateTimeWithTimeZone,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::users::Entity",
        from = "Column::CreatedBy",
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
