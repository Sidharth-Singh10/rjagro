use sea_orm::entity::prelude::*;
use serde::Serialize;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq, Serialize)]
#[sea_orm(table_name = "batch_allocation_lines")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub allocation_line_id: i32,
    pub allocation_id: i32,
    pub batch_id: Option<i32>,
    pub lot_id: i32,
    pub qty: Decimal,
    pub unit_cost: Decimal,
    pub line_value: Decimal,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::batch_allocations::Entity",
        from = "Column::AllocationId",
        to = "super::batch_allocations::Column::AllocationId",
        on_update = "Cascade",
        on_delete = "Cascade"
    )]
    BatchAllocations,

    #[sea_orm(
        belongs_to = "super::stock_receipts::Entity",
        from = "Column::LotId",
        to = "super::stock_receipts::Column::LotId",
        on_update = "Cascade",
        on_delete = "Restrict"
    )]
    StockReceipts,
}

impl Related<super::batch_allocations::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::BatchAllocations.def()
    }
}

impl Related<super::stock_receipts::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::StockReceipts.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
