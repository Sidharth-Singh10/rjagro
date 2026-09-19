use chrono::{NaiveDate, NaiveTime};
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

#[derive(Debug, Serialize)]
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
    pub purchase_order_id: Option<i32>,
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
pub struct PurchaseOrderItem {
    pub item_code: String,
    pub quantity: Decimal,
    pub cost_per_unit: Decimal,
}

#[derive(Deserialize)]
pub struct CreatePurchaseOrder {
    pub supplier_id: i32,
    pub supplier: Option<String>,
    pub purchase_date: chrono::NaiveDate,
    pub payment_type: PaymentType,
    pub created_by: i32,
    pub items: Vec<PurchaseOrderItem>,
}

#[derive(Debug, Serialize)]
pub struct PurchaseOrderResponse {
    pub purchase_order_id: i32,
    pub supplier_id: i32,
    pub supplier_name: Option<String>,
    pub purchase_date: chrono::NaiveDate,
    pub payment_type: Option<PaymentType>,
    pub created_by: i32,
    pub total_cost: Decimal,
    pub lines: Vec<PurchaseWithItem>,
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

#[derive(Debug, Serialize)]
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
    pub avg_body_weight: Option<Decimal>,
    pub activated_at: Option<DateTimeWithTimeZone>,
    pub closed_at: Option<DateTimeWithTimeZone>,
    pub farm: Option<FarmInfo>,
}

#[derive(Debug, Serialize)]
pub struct FarmInfo {
    pub farm_id: i32,
    pub code: String,
    pub name: String,
    pub location: Option<String>,
    pub video_url: Option<String>,
    pub gmaps_url: Option<String>,
}

impl From<entity::farms::Model> for FarmInfo {
    fn from(farm: entity::farms::Model) -> Self {
        Self {
            farm_id: farm.farm_id,
            code: farm.code,
            name: farm.name,
            location: farm.location,
            video_url: farm.video_url,
            gmaps_url: farm.gmaps_url,
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct BatchListQuery {
    pub status: Option<String>,
}

#[derive(Deserialize)]
pub struct CreateFarm {
    pub farmer_id: i32,
    pub code: String,
    pub name: String,
    pub location: Option<String>,
    pub video_url: Option<String>,
    pub gmaps_url: Option<String>,
}

#[derive(Deserialize)]
pub struct CreateFarmBatch {
    /// Optional; defaults to the first production line when omitted.
    pub line_id: Option<i32>,
    /// Start date of the live-selling batch.
    pub start_date: NaiveDate,
}

#[derive(Deserialize)]
pub struct ActivateBatchPayload {
    pub avg_body_weight: Decimal,
}

#[derive(Deserialize)]
pub struct CreateTimeslot {
    pub slot_start: NaiveTime,
    pub slot_end: NaiveTime,
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
pub struct AllocateLine {
    pub lot_id: i32,
    pub qty: Decimal,
}

#[derive(serde::Deserialize)]
pub struct ApprovePayload {
    pub requirement_id: i32,
    pub lines: Vec<AllocateLine>,
    pub allocation_date: NaiveDate,
    pub allocated_by: i32,
}

#[derive(serde::Deserialize)]
pub struct StockReceiptsQuery {
    pub item_code: Option<String>,
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
    pub app_trader_id: Option<i32>,
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

#[derive(Deserialize)]
pub struct UpdateOtherExpense {
    pub category: OtherExpenseCategory,
    pub amount: Decimal,
    pub description: Option<String>,
    pub expense_date: NaiveDate,
}

#[derive(Debug, Serialize)]
pub struct PaginatedOtherExpenses {
    pub items: Vec<entity::other_expenses::Model>,
    pub page: u64,
    pub page_size: u64,
    pub total_count: u64,
    pub total_pages: u64,
    pub total_amount: Decimal,
}

#[derive(Debug, Serialize)]
pub struct OtherExpenseCategoryTotal {
    pub category: OtherExpenseCategory,
    pub total: Decimal,
    pub count: i64,
}

#[derive(Debug, Serialize)]
pub struct OtherExpenseMonthSummary {
    pub month: String,
    pub total: Decimal,
    pub count: i64,
    pub by_category: Vec<OtherExpenseCategoryTotal>,
}

#[derive(Debug, Deserialize)]
pub struct OtherExpenseSummaryQuery {
    /// Inclusive month key, e.g. "2026-08".
    pub from: String,
    /// Inclusive month key, e.g. "2026-09".
    pub to: String,
}

#[derive(Debug, Deserialize)]
pub struct LedgerEntriesQuery {
    pub page: Option<u64>,
    pub page_size: Option<u64>,
    pub account_id: Option<i32>,
    /// Inclusive date, "YYYY-MM-DD".
    pub from: Option<NaiveDate>,
    /// Inclusive date, "YYYY-MM-DD".
    pub to: Option<NaiveDate>,
    pub reference_table: Option<String>,
    /// entry_id | txn_date | account_id | debit | credit | created_at
    pub sort: Option<String>,
    /// "asc" | "desc"
    pub dir: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct PaginatedLedgerEntries {
    pub items: Vec<entity::ledger_entries::Model>,
    pub page: u64,
    pub page_size: u64,
    pub total_count: u64,
    pub total_pages: u64,
    /// Totals over the whole filtered set, for reconciliation.
    pub total_debit: Decimal,
    pub total_credit: Decimal,
}

#[derive(Debug, Deserialize)]
pub struct LedgerSummaryQuery {
    /// Inclusive month key, e.g. "2026-08".
    pub from: String,
    /// Inclusive month key, e.g. "2026-09".
    pub to: String,
}

#[derive(Debug, Serialize)]
pub struct LedgerMonthAccountSummary {
    pub month: String,
    pub account_id: i32,
    pub total_debit: Decimal,
    pub total_credit: Decimal,
    pub count: i64,
}

#[derive(Debug, Serialize)]
pub struct SupplierPaymentTotal {
    pub supplier_id: i32,
    pub total: Decimal,
    pub count: i64,
}

#[derive(Debug, Serialize)]
pub struct TraderPaymentTotal {
    pub trader_id: i32,
    pub total: Decimal,
    pub count: i64,
}

#[derive(Debug, Deserialize)]
pub struct InventoryMovementsPageQuery {
    pub page: Option<u64>,
    pub page_size: Option<u64>,
    pub item_code: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct PaginatedInventoryMovements {
    pub items: Vec<entity::inventory_movements::Model>,
    pub page: u64,
    pub page_size: u64,
    pub total_count: u64,
    pub total_pages: u64,
}

#[derive(Debug, Deserialize)]
pub struct StockReceiptsPageQuery {
    pub page: Option<u64>,
    pub page_size: Option<u64>,
    pub item_code: Option<String>,
    /// Free-text match on lot id or item code (for pickers).
    pub search: Option<String>,
    /// Only lots that still have stock on hand.
    pub has_remaining: Option<bool>,
    pub sort: Option<String>,
    pub dir: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct PaginatedStockReceipts {
    pub items: Vec<entity::stock_receipts::Model>,
    pub page: u64,
    pub page_size: u64,
    pub total_count: u64,
    pub total_pages: u64,
}

#[derive(Debug, Deserialize)]
pub struct PurchasesPageQuery {
    pub page: Option<u64>,
    pub page_size: Option<u64>,
    pub supplier_id: Option<i32>,
    /// Free-text match on purchase id or item code (for pickers).
    pub search: Option<String>,
    /// Inclusive date, "YYYY-MM-DD".
    pub from: Option<NaiveDate>,
    /// Inclusive date, "YYYY-MM-DD".
    pub to: Option<NaiveDate>,
    pub sort: Option<String>,
    pub dir: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct PaginatedPurchases {
    pub items: Vec<entity::purchases::Model>,
    pub page: u64,
    pub page_size: u64,
    pub total_count: u64,
    pub total_pages: u64,
    pub total_amount: Decimal,
}

#[derive(Debug, Deserialize)]
pub struct AllocationLinesPageQuery {
    pub page: Option<u64>,
    pub page_size: Option<u64>,
    pub batch_id: Option<i32>,
    pub allocation_id: Option<i32>,
}

#[derive(Debug, Serialize)]
pub struct PaginatedAllocationLines {
    pub items: Vec<entity::batch_allocation_lines::Model>,
    pub page: u64,
    pub page_size: u64,
    pub total_count: u64,
    pub total_pages: u64,
}

#[derive(Debug, Deserialize)]
pub struct AllocationsPageQuery {
    pub page: Option<u64>,
    pub page_size: Option<u64>,
    pub batch_id: Option<i32>,
}

#[derive(Debug, Serialize)]
pub struct PaginatedAllocations {
    pub items: Vec<entity::batch_allocations::Model>,
    pub page: u64,
    pub page_size: u64,
    pub total_count: u64,
    pub total_pages: u64,
}

#[derive(Debug, Serialize)]
pub struct FeedSummary {
    pub feed_on_hand: Decimal,
    pub avg_daily_consumption: Decimal,
    pub days_cover: Decimal,
}

#[derive(Debug, Serialize)]
pub struct AllocationCategoryTotal {
    pub month: String,
    pub category: ItemCategory,
    pub total: Decimal,
}

#[derive(Debug, Serialize)]
pub struct AllocationBatchCost {
    pub batch_id: i32,
    pub category: ItemCategory,
    pub total: Decimal,
}

#[derive(Debug, Serialize)]
pub struct BatchFcr {
    pub batch_id: i32,
    pub feed_kg: Decimal,
    pub weight_kg: Decimal,
    pub fcr: Decimal,
}

#[derive(Debug, Serialize)]
pub struct BatchFeedLine {
    pub item_code: String,
    pub item_name: String,
    pub qty: Decimal,
    pub unit: Option<String>,
    pub kg: Decimal,
}

#[derive(Debug, Deserialize)]
pub struct AllocationRangeQuery {
    /// Inclusive month key, e.g. "2026-08".
    pub from: String,
    /// Inclusive month key, e.g. "2026-09".
    pub to: String,
}

#[derive(Debug, Deserialize)]
pub struct LimitQuery {
    pub limit: Option<u64>,
}

#[derive(Debug, Deserialize)]
pub struct BatchSalesQuery {
    pub batch_id: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct SupervisorOrdersPageQuery {
    pub page: Option<u64>,
    pub page_size: Option<u64>,
    pub batch_id: Option<i32>,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct TraderOrdersPageQuery {
    pub page: Option<u64>,
    pub page_size: Option<u64>,
    pub status: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct PaginatedOrderResponses {
    pub items: Vec<OrderResponse>,
    pub page: u64,
    pub page_size: u64,
    pub total_count: u64,
    pub total_pages: u64,
}

// ─── Trader app (live selling) ───────────────────────────────────────────────

#[derive(Deserialize)]
pub struct CreateOrderPayload {
    pub batch_id: i32,
    pub timeslot_id: i32,
    pub requested_weight: Decimal,
}

#[derive(Deserialize)]
pub struct TraderOrderQuery {
    pub status: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct CreditSummary {
    pub trader_id: i32,
    pub credit_limit: Option<Decimal>,
    pub credit_terms_days: Option<i32>,
    pub total_dues: Decimal,
    pub total_paid: Decimal,
    pub remaining_credit: Option<Decimal>,
}

#[derive(Debug, Serialize)]
pub struct LiveBatchResponse {
    pub batch_id: i32,
    pub status: Option<BatchStatus>,
    pub avg_body_weight: Option<Decimal>,
    pub activated_at: Option<DateTimeWithTimeZone>,
    pub farm: FarmInfo,
}

#[derive(Debug, Serialize)]
pub struct TimeslotInfo {
    pub timeslot_id: i32,
    pub slot_start: NaiveTime,
    pub slot_end: NaiveTime,
}

#[derive(Debug, Serialize)]
pub struct BatchDetailResponse {
    pub batch_id: i32,
    pub status: Option<BatchStatus>,
    pub avg_body_weight: Option<Decimal>,
    pub activated_at: Option<DateTimeWithTimeZone>,
    pub closed_at: Option<DateTimeWithTimeZone>,
    pub created_at: DateTimeWithTimeZone,
    pub farm: FarmInfo,
    pub timeslots: Vec<TimeslotInfo>,
    pub supervisor_name: Option<String>,
    pub supervisor_email: Option<String>,
    pub supervisor_phone: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct OrderResponse {
    pub order_id: i32,
    pub inquiry_number: String,
    pub trader_id: i32,
    pub batch_id: i32,
    pub timeslot_id: i32,
    pub requested_weight: Decimal,
    pub status: String,
    pub actual_weight: Option<Decimal>,
    pub actual_birds: Option<i32>,
    pub entry_rate: Option<Decimal>,
    pub total_amount: Option<Decimal>,
    pub rejection_reason: Option<String>,
    pub created_at: DateTimeWithTimeZone,
    pub weight_entered_at: Option<DateTimeWithTimeZone>,
    pub confirmed_at: Option<DateTimeWithTimeZone>,
    pub cancelled_at: Option<DateTimeWithTimeZone>,
    pub rejected_at: Option<DateTimeWithTimeZone>,
    pub expired_at: Option<DateTimeWithTimeZone>,
    pub farm_name: Option<String>,
    pub farm_code: Option<String>,
    pub batch_status: Option<BatchStatus>,
    pub slot_start: Option<NaiveTime>,
    pub slot_end: Option<NaiveTime>,
    pub trader_name: Option<String>,
    pub trader_phone: Option<String>,
    pub supervisor_name: Option<String>,
    pub supervisor_email: Option<String>,
    pub supervisor_phone: Option<String>,
}

// ─── Trader ledger (per-trader, separate from main double-entry ledger) ─────

#[derive(Deserialize)]
pub struct CreateTraderPaymentPayload {
    pub amount: Decimal,
    /// "cash" | "bank"
    pub payment_mode: String,
    pub screenshot_url: Option<String>,
}

#[derive(Deserialize)]
pub struct LedgerStatementQuery {
    pub from: Option<NaiveDate>,
    pub to: Option<NaiveDate>,
}

#[derive(Debug, Serialize)]
pub struct LedgerEntryView {
    /// Payment entry id (None for order-derived debits)
    pub id: Option<i32>,
    pub order_id: Option<i32>,
    pub inquiry_number: Option<String>,
    pub entry_type: String,
    pub amount: Decimal,
    pub payment_mode: Option<String>,
    pub screenshot_url: Option<String>,
    pub created_at: DateTimeWithTimeZone,
}

#[derive(Debug, Serialize)]
pub struct TraderLedgerResponse {
    pub trader_id: i32,
    pub total_debits: Decimal,
    pub total_payments: Decimal,
    pub balance: Decimal,
    pub entries: Vec<LedgerEntryView>,
}

// ─── Audit ───────────────────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
pub struct AuditLogView {
    pub audit_id: i32,
    pub order_id: i32,
    pub actor_type: String,
    pub actor_id: i32,
    pub actor_name: Option<String>,
    pub action: String,
    pub field_changed: Option<String>,
    pub old_value: Option<String>,
    pub new_value: Option<String>,
    pub created_at: DateTimeWithTimeZone,
}

// ─── Supervisor app (live selling) ───────────────────────────────────────────

#[derive(Deserialize)]
pub struct WeightPayload {
    pub actual_weight: Decimal,
    pub actual_birds: i32,
}

#[derive(Deserialize)]
pub struct CloseOrderPayload {
    pub actual_weight: Decimal,
    pub actual_birds: i32,
    pub entry_rate: Decimal,
}

#[derive(Deserialize)]
pub struct RejectOrderPayload {
    pub reason: String,
}

#[derive(Deserialize)]
pub struct SupervisorOrderQuery {
    pub batch_id: Option<i32>,
    pub status: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct SupervisorBatchResponse {
    pub batch_id: i32,
    pub status: Option<BatchStatus>,
    pub avg_body_weight: Option<Decimal>,
    pub activated_at: Option<DateTimeWithTimeZone>,
    pub closed_at: Option<DateTimeWithTimeZone>,
    pub farm: FarmInfo,
    pub pending_orders: i32,
}

#[derive(Debug, Serialize)]
pub struct AppTraderView {
    pub id: i32,
    pub name: String,
    pub phone: String,
    pub email: String,
    pub credit_limit: Option<Decimal>,
    pub credit_terms_days: Option<i32>,
    pub linked_trader_id: Option<i32>,
}

// ─── Stored metrics history ──────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct MetricSnapshotQuery {
    /// 'day' | 'month' (defaults to all when omitted)
    pub period_type: Option<String>,
    /// Inclusive lower bound period key ('YYYY-MM' or 'YYYY-MM-DD')
    pub from: Option<String>,
    /// Inclusive upper bound period key ('YYYY-MM' or 'YYYY-MM-DD')
    pub to: Option<String>,
    /// Comma-separated metric keys to include
    pub metrics: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct RefreshMetricsBody {
    /// 'day' | 'month' | omitted for both
    pub period_type: Option<String>,
    /// First period key to recompute; defaults to the earliest recorded activity
    pub from: Option<String>,
    /// Last period key to recompute; defaults to the current period
    pub to: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct RefreshMetricsResponse {
    pub refreshed: usize,
}
