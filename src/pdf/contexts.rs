use ::entity::{batch_allocation_lines, batches, bird_count_history, items, stock_receipts, stock_returns};
use sea_orm::*;

use crate::pdf::view_models::{BatchSalesInfo, Inputs};

pub struct BatchExpensesCalculationContext {
    pub batch: batches::Model,
    pub bird_history: Vec<bird_count_history::Model>,
    pub allocations_with_category: Vec<(batch_allocation_lines::Model, String)>,
    pub returns_with_category: Vec<(stock_returns::Model, String)>,
    pub sales_info: BatchSalesInfo,
    pub input: Inputs,
}

impl BatchExpensesCalculationContext {
    pub fn builder() -> CalculationContextBuilder {
        CalculationContextBuilder::default()
    }

    pub async fn load(
        batch_id: i32,
        sales_info: BatchSalesInfo,
        input: Inputs,
        db: &DatabaseConnection,
    ) -> Result<Self, DbErr> {
        Self::builder()
            .with_batch(batch_id, db)
            .await?
            .with_bird_history(batch_id, db)
            .await?
            .with_allocations(batch_id, db)
            .await?
            .with_returns(batch_id, db)
            .await?
            .set_sales_info(sales_info)
            .set_input(input)
            .build()
            .map_err(|e| DbErr::Custom(e))
    }
}

#[derive(Default)]
pub struct CalculationContextBuilder {
    batch: Option<batches::Model>,
    bird_history: Option<Vec<bird_count_history::Model>>,
    allocations_with_category: Option<Vec<(batch_allocation_lines::Model, String)>>,
    returns_with_category: Option<Vec<(stock_returns::Model, String)>>,
    sales_info: Option<BatchSalesInfo>,
    input: Option<Inputs>,
}

// 3. Builder Methods
impl CalculationContextBuilder {
    /// Fetches the Batch model by ID
    pub async fn with_batch(
        mut self,
        batch_id: i32,
        db: &DatabaseConnection,
    ) -> Result<Self, DbErr> {
        let batch = batches::Entity::find_by_id(batch_id)
            .one(db)
            .await?
            .ok_or_else(|| DbErr::Custom(format!("Batch with ID {} not found", batch_id)))?;

        self.batch = Some(batch);
        Ok(self)
    }

    /// Fetches Bird History for the given Batch ID
    pub async fn with_bird_history(
        mut self,
        batch_id: i32,
        db: &DatabaseConnection,
    ) -> Result<Self, DbErr> {
        let history = bird_count_history::Entity::find()
            .filter(bird_count_history::Column::BatchId.eq(batch_id))
            .all(db)
            .await?;

        self.bird_history = Some(history);
        Ok(self)
    }

    /// Fetches Allocations and joins with Items to get Categories
    pub async fn with_allocations(
        mut self,
        batch_id: i32,
        db: &DatabaseConnection,
    ) -> Result<Self, DbErr> {
        let allocations: Vec<(batch_allocation_lines::Model, String)> =
            batch_allocation_lines::Entity::find()
                .filter(batch_allocation_lines::Column::BatchId.eq(batch_id))
                .join(
                    JoinType::InnerJoin,
                    batch_allocation_lines::Relation::StockReceipts.def(),
                )
                .join(JoinType::InnerJoin, stock_receipts::Relation::Items.def())
                .select_also(items::Entity)
                .all(db)
                .await?
                .into_iter()
                .filter_map(|(allocation, item_opt)| {
                    item_opt.map(|item| (allocation, item.item_category.to_string()))
                })
                .collect();

        self.allocations_with_category = Some(allocations);
        Ok(self)
    }

    /// Fetches Returns and joins with Items to get Categories
    pub async fn with_returns(
        mut self,
        batch_id: i32,
        db: &DatabaseConnection,
    ) -> Result<Self, DbErr> {
        let returns: Vec<(stock_returns::Model, String)> = stock_returns::Entity::find()
            .filter(stock_returns::Column::BatchId.eq(batch_id))
            .join(
                JoinType::InnerJoin,
                stock_returns::Relation::BatchAllocationLines.def(),
            )
            .join(
                JoinType::InnerJoin,
                batch_allocation_lines::Relation::StockReceipts.def(),
            )
            .join(JoinType::InnerJoin, stock_receipts::Relation::Items.def())
            .select_also(items::Entity)
            .all(db)
            .await?
            .into_iter()
            .filter_map(|(ret, item_opt)| {
                item_opt.map(|item| (ret, item.item_category.to_string()))
            })
            .collect();

        self.returns_with_category = Some(returns);
        Ok(self)
    }

    // Setters for non-DB data
    pub fn set_sales_info(mut self, info: BatchSalesInfo) -> Self {
        self.sales_info = Some(info);
        self
    }

    pub fn set_input(mut self, input: Inputs) -> Self {
        self.input = Some(input);
        self
    }

    // 4. The Build Method
    pub fn build(self) -> Result<BatchExpensesCalculationContext, String> {
        Ok(BatchExpensesCalculationContext {
            batch: self.batch.ok_or("Batch is required")?,
            bird_history: self.bird_history.ok_or("Bird history is required")?,
            allocations_with_category: self.allocations_with_category.unwrap_or_default(),
            returns_with_category: self.returns_with_category.unwrap_or_default(),
            sales_info: self.sales_info.ok_or("Sales info is required")?,
            input: self.input.ok_or("Input is required")?,
        })
    }
}
