use chrono::NaiveDate;
use entity::sea_orm_active_enums::{
    BatchStatus, ItemCategory, LedgerAccountType, OtherExpenseCategory, PaymentType,
    RequirementStatus, SupplierType, UserRole,
};
use sea_orm::prelude::{DateTimeWithTimeZone, Decimal};
use sea_orm::FromQueryResult;
use serde::{Deserialize, Serialize};

#[derive(Serialize)]
pub struct ResponseMessage {
    pub message: String,
}

#[derive(Serialize)]
pub struct PurchaseWithItem {
    pub purchase_id: i32,
    pub item_code: String,
    pub item_name: String,
    pub cost_per_unit: Decimal,
    pub total_cost: Option<Decimal>,
    pub quantity: Decimal,
    pub payment_type: Option<PaymentType>,
    pub purchase_date: NaiveDate,
    pub supplier_id: i32,
    pub supplier_name: Option<String>,
    pub created_by: Option<i32>,
}
#[derive(serde::Deserialize)]
pub struct CreateItem {
    pub item_code: String,
    pub item_name: String,
    pub item_category: ItemCategory,
    pub unit: Option<String>,
}

#[derive(Deserialize)]
pub struct CreateProductionLine {
    pub line_name: String,
    pub supervisor_id: i32,
}

#[derive(Deserialize)]
pub struct CreatePurchase {
    pub item_code: String,
    pub cost_per_unit: Decimal,
    pub purchase_date: chrono::NaiveDate,
    pub supplier_id: i32,
    pub supplier: Option<String>,
    pub quantity: Decimal,
    pub created_by: Option<i32>,
    pub inventory_account_id: i32,
    pub payment_account_id: i32,
    pub payment_type: PaymentType,
}

#[derive(Deserialize)]
pub struct CreateBatch {
    pub line_id: i32,
    pub supervisor_id: i32,
    pub farmer_id: i32,
    pub start_date: chrono::NaiveDate,
    pub end_date: chrono::NaiveDate,
    pub initial_bird_count: i32,
    pub chick_item_code: Vec<String>,
    pub created_by: i32,
}

#[derive(Deserialize)]
pub struct CreateBatchRequirement {
    pub batch_id: i32,
    pub line_id: i32,
    pub supervisor_id: i32,
    pub item_code: String,
    pub quantity: Decimal,
    pub request_date: chrono::NaiveDate,
}

#[derive(Deserialize)]
pub struct CreateBatchAllocation {
    pub requirement_id: i32,
    pub allocated_qty: Decimal,
    pub allocation_date: chrono::NaiveDate,
    pub allocated_by: i32,
}

#[derive(Deserialize)]
pub struct CreateFarmer {
    pub name: String,
    pub phone_number: String,
    pub address: String,
    pub bank_account_no: String,
    pub bank_name: String,
    pub ifsc_code: String,
    pub area_size: Decimal,
}

#[derive(Deserialize)]
pub struct CreateTrader {
    pub name: String,
    pub phone_number: String,
    pub address: String,
    pub bank_account_no: String,
    pub bank_name: String,
    pub ifsc_code: String,
}

#[derive(Deserialize)]
pub struct CreateSupplier {
    pub supplier_type: SupplierType,
    pub name: String,
    pub phone_number: String,
    pub address: String,
    pub bank_account_no: String,
    pub bank_name: String,
    pub ifsc_code: String,
}

#[derive(Deserialize)]
pub struct CreateBirdCountHistory {
    pub batch_id: i32,
    pub record_date: chrono::NaiveDate,
    pub deaths: i32,
    pub additions: i32,
    pub notes: Option<String>,
}

#[derive(Deserialize)]
pub struct CreateBirdSellHistory {
    pub batch_id: i32,
    pub trader_id: i32,
    pub sale_date: chrono::NaiveDate,
    pub quantity_sold: i32,
    pub price_per_bird: Decimal,
    pub notes: String,
}

#[derive(Serialize)]
pub struct ProductionLineWithSupervisor {
    pub line_id: i32,
    pub line_name: String,
    pub supervisor_id: i32,
    pub supervisor_name: String,
    pub created_at: DateTimeWithTimeZone,
}

#[derive(Serialize)]
pub struct UserSimplified {
    pub user_id: i32,
    pub name: String,
    pub role: UserRole,
}

#[derive(Debug, Serialize, FromQueryResult)]
pub struct BatchResponse {
    pub batch_id: i32,
    pub line_id: i32,
    pub supervisor_id: i32,
    pub supervisor_name: String,
    pub farmer_id: i32,
    pub farmer_name: String,
    pub start_date: NaiveDate,
    pub end_date: NaiveDate,
    pub initial_bird_count: i32,
    pub current_bird_count: i32,
    pub status: Option<BatchStatus>,
    pub created_at: DateTimeWithTimeZone,
}

#[derive(Debug, Serialize)]
pub struct BatchRequirementResponse {
    pub requirement_id: i32,
    pub line_id: i32,
    pub line_name: Option<String>,
    pub batch_id: i32,
    pub supervisor_name: Option<String>,
    pub farmer_name: Option<String>,
    pub item_code: String,
    pub item_name: Option<String>,
    pub item_unit: Option<String>,
    pub quantity: Decimal,
    pub status: RequirementStatus,
    pub request_date: NaiveDate,
}

#[derive(serde::Deserialize)]
pub struct ApprovePayload {
    pub requirement_id: i32,
    pub allocated_qty: Decimal,
    pub allocation_date: NaiveDate,
    pub allocated_by: i32,
}
#[derive(Debug, Deserialize)]
pub struct CreateLedgerAccount {
    pub name: String,
    pub account_type: LedgerAccountType,
    pub current_balance: Decimal,
}

#[derive(Deserialize)]
pub struct CreateFarmerCommission {
    pub farmer_id: i32,
    pub commission_amount: Decimal,
    pub description: Option<String>,
    pub created_by: Option<i32>,
}

#[derive(Deserialize)]
pub struct CreateBatchClosureSummary {
    pub batch_id: i32,
    pub start_date: NaiveDate,
    pub end_date: NaiveDate,
    pub initial_chicken_count: i32,
    pub available_chicken_count: i32,
    pub revenue: Decimal,
}

#[derive(serde::Deserialize)]
pub struct CreateBatchSale {
    pub item_code: String,
    pub batch_id: i32,
    pub trader_id: i32,
    pub avg_weight: Decimal,
    pub rate: Decimal,
    pub quantity: Decimal,
    pub payment_type: PaymentType,
    pub created_by: i32,
}

#[derive(Debug, Deserialize)]
pub struct CreateLedgerEntry {
    pub account_id: i32,
    pub debit: Option<Decimal>,
    pub credit: Option<Decimal>,
    pub txn_date: NaiveDate,
    pub narration: Option<String>,
    pub reference_table: Option<String>,
    pub reference_id: Option<i32>,
    pub created_by: Option<i32>,
}

#[derive(Deserialize)]
pub struct CreateStockReturn {
    pub allocation_line_id: i32,
    pub batch_id: i32,
    pub return_qty: Decimal,
    pub unit_cost: Decimal,
    pub return_value: Decimal,
    pub return_date: chrono::NaiveDate,
}

#[derive(serde::Deserialize)]
pub struct PaginationParams {
    pub page: Option<u64>,
    pub page_size: Option<u64>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct CreateSupplierPayment {
    pub supplier_id: i32,
    pub amount: Decimal,
    pub payment_date: NaiveDate,
    pub payment_mode: Option<String>,
    pub reference_number: Option<String>,
    pub notes: Option<String>,
    pub created_by: i32,
}

#[derive(Serialize)]
pub struct SupplierPayable {
    pub purchase_id: i32,
    pub purchase_date: NaiveDate,
    pub item_code: String,
    pub quantity: Decimal,
    pub total_cost: Option<Decimal>,
}

#[derive(Debug, FromQueryResult, Serialize)]
pub struct SupplierLedgerEntry {
    pub date: NaiveDate,
    pub description: String,
    pub reference: String,
    pub amount: Decimal,
    pub entry_type: Option<String>,
}

#[derive(Serialize)]
pub struct TraderReceivable {
    pub id: i32,
    pub batch_id: i32,
    pub item_code: String,
    pub quantity: Decimal,
    pub total_cost: Decimal,
    pub sale_date: NaiveDate,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct CreateTraderPayment {
    pub trader_id: i32,
    pub amount: Decimal,
    pub payment_date: NaiveDate,
    pub payment_mode: Option<String>,
    pub reference_number: Option<String>,
    pub notes: Option<String>,
    pub created_by: i32,
}

#[derive(Debug, FromQueryResult, Serialize)]
pub struct TraderLedgerEntry {
    pub date: NaiveDate,
    pub description: String,
    pub reference: String,
    pub amount: Decimal,
    pub entry_type: Option<String>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct CreateLoan {
    pub lender_name: String,
    pub principal_amount: Decimal,
    pub interest_rate: Option<Decimal>,
    pub loan_date: NaiveDate,
    pub due_date: Option<NaiveDate>,
    pub notes: Option<String>,
    pub created_by: i32,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct CreateLoanPayment {
    pub loan_id: i32,
    pub principal_amount: Decimal,
    pub interest_amount: Decimal,
    pub total_amount: Decimal,
    pub payment_date: NaiveDate,
    pub payment_mode: Option<String>,
    pub reference_number: Option<String>,
    pub notes: Option<String>,
    pub created_by: i32,
}

#[derive(Debug, Serialize, FromQueryResult)]
pub struct AllocatedRequirementDTO {
    // Fields from BatchRequirements
    pub requirement_id: i32,
    pub item_code: String,
    pub requested_qty: Decimal, // Mapped via column_as

    // Fields from BatchAllocations
    pub allocation_id: i32,
    pub allocated_qty: Decimal,
    pub allocated_value: Decimal,
    pub allocation_date: NaiveDate,
}

#[derive(Deserialize)]
pub struct CreateOtherExpense {
    pub category: OtherExpenseCategory,
    pub amount: Decimal,
    pub description: Option<String>,
    pub expense_date: NaiveDate,
    pub created_by: i32,
}
