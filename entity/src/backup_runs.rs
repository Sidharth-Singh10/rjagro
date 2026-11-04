//! SeaORM Entity for the `backup_runs` table

use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq, Serialize, Deserialize)]
#[sea_orm(table_name = "backup_runs")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub started_at: DateTimeWithTimeZone,
    pub finished_at: Option<DateTimeWithTimeZone>,
    pub status: String,
    pub triggered_by: String,
    pub dump_bytes: Option<i64>,
    pub filename: Option<String>,
    pub remote_host: Option<String>,
    pub remote_ok: bool,
    #[sea_orm(column_type = "Text", nullable)]
    pub error: Option<String>,
    pub duration_ms: Option<i32>,
    pub created_at: DateTimeWithTimeZone,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
