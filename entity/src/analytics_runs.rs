//! SeaORM entity for the `analytics_runs` table.
//!
//! One row per execution of the analytics pipeline. At most one row can be
//! `queued` at a time (partial unique index), so bursts of edits coalesce into
//! a single run.

use sea_orm::entity::prelude::*;
use serde::Serialize;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize)]
#[sea_orm(table_name = "analytics_runs")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub status: String,
    pub requested_at: DateTimeWithTimeZone,
    pub started_at: Option<DateTimeWithTimeZone>,
    pub finished_at: Option<DateTimeWithTimeZone>,
    pub requested_by: Option<i32>,
    pub dataset_hash: Option<String>,
    pub model: Option<String>,
    pub config_hash: Option<String>,
    pub trigger: String,
    pub error: Option<String>,
    #[sea_orm(column_type = "JsonBinary", nullable)]
    pub payload: Option<Json>,
    pub report_md: Option<String>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::users::Entity",
        from = "Column::RequestedBy",
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
