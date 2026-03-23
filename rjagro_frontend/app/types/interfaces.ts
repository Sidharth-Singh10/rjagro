import { ItemCategory } from "./enums";

export interface Item {
  item_code: string;
  item_name: string;
  item_category: ItemCategory;
  unit: string;
}

export interface Purchase {
  payment_type: string;
  purchase_id: number;
  item_code: string;
  item_name: string;
  cost_per_unit: number;
  total_cost: number;
  quantity: number;
  purchase_date: string;
  supplier_id: number;
  created_by: number;
  payment_account?: LedgerAccountType;
}

export interface NewPurchase {
  item_code: string;
  item_name: string;
  cost_per_unit: number | '';
  quantity: number | '';
  supplier: string;
  purchase_date: string;
  payment_type: string;
  supplier_id?: number;
  payment_account?: LedgerAccountType;
  inventory_account_id?: number;
  payment_account_id?: number;
}

export interface Farmer {
  farmer_id: number;
  name: string;
  phone_number: string;
  address: string;
  bank_account_no: string;
  bank_name: string;
  ifsc_code: string;
  area_size: number;
  created_at: string;
}

export interface NewFarmer {
  name: string;
  phone_number: string;
  address: string;
  bank_account_no: string;
  bank_name: string;
  ifsc_code: string;
  area_size: number | '';
}

export interface Supplier {
  supplier_id: number;
  supplier_type: SupplierType;
  name: string;
  phone_number: string;
  address: string;
  bank_account_no: string;
  bank_name: string;
  ifsc_code: string;
  created_at: string;
  amount_due: string;
}

export interface SupplierPayload {
  supplier_type: SupplierType;
  name: string;
  phone_number: string;
  address: string;
  bank_account_no: string;
  bank_name: string;
  ifsc_code: string;
}
export enum SupplierType {
  Feed = 'Feed',
  Chick = 'Chick',
  Medicine = 'Medicine',
}


export interface Trader {
  trader_id: number;
  name: string;
  amount_due: string;
  phone_number: string;
  address: string;
  bank_account_no: string;
  bank_name: string;
  ifsc_code: string;
  created_at: string;
}

export interface NewTrader {
  name: string;
  phone_number: string;
  address: string;
  bank_account_no: string;
  bank_name: string;
  ifsc_code: string;
}

export interface ProductionLine {
  line_id: number;
  line_name: string;
  supervisor_id: number;
  supervisor_name: string;
  created_at: string;
}

export interface ProductionLinePayload {
  line_name: string;
  supervisor_id: number | '';
}

export interface SupervisorSimplified {
  user_id: number;
  name: string;
  role: string;
}

export interface Batch {
  batch_id: number;
  line_id: number;
  supervisor_id: number;
  supervisor_name: string;
  farmer_id: number;
  farmer_name: string;
  start_date: string;
  end_date: string;
  initial_bird_count: number;
  current_bird_count: number;
  status: string;
  created_at: string;
}

export interface BatchPayload {
  line_id: number | '';
  supervisor_id: number | '';
  farmer_id: number | '';
  start_date: string;
  end_date: string;
  initial_bird_count: number | '';
  current_bird_count: number | '';
  chick_item_code: string[];
  created_by: number | '';
}

export interface BatchRequirement {
  requirement_id: number;
  line_id: number;
  line_name: string;
  batch_id: number;
  supervisor_name: string;
  farmer_name: string;
  item_code: string;
  item_name: string;
  item_unit: string;
  quantity: string;
  status: string;
  request_date: string;
}

export interface NewBatchRequirement {
  batch_id: number | '';
  line_id: number | '';
  farmer_id: number | '';
  supervisor_id: number | '';
  item_code: string;
  quantity: number | '';
}

export interface BatchAllocation {
  allocation_id: number;
  requirement_id: number;
  allocated_qty: string;
  allocation_date: string;
  allocated_value: string;
  allocated_by: number;
}

export interface NewBatchAllocation {
  requirement_id: number | '';
  allocated_qty: number | '';
  allocated_by: number | '';
}


export interface Inventory {
  item_code: string;
  current_qty: number;
  last_updated: string;
}

export interface InventoryWithItemDetails extends Inventory {
  item_name?: string; // Joined from items table on frontend
  unit?: string; // Joined from items table on frontend
}

export interface NewInventory {
  item_code: string;
  item_name: string;
  current_qty: number | '';
}

export interface InventoryPayload {
  item_code: string;
  current_qty: number;
}

export enum MovementType {
  PURCHASE = 'purchase',
  ALLOCATION = 'allocation',
  ADJUSTMENT = 'adjustment',
  TRANSFER = 'transfer'
}

export interface InventoryMovement {
  movement_id: number;
  item_code: string;
  qty_change: number;
  movement_type: MovementType;
  reference_id?: number;
  movement_date: string;
}

export interface InventoryMovementPayload {
  item_code: string;
  qty_change: number;
  movement_type: MovementType;
  reference_id?: number;
  movement_date: string;
}

export interface NewInventoryMovement {
  item_code: string;
  item_name: string;
  qty_change: number | '';
  movement_type: MovementType;
  reference_id: number | '';
  movement_date: string;
}

export enum LedgerAccountType {
  Asset = "Asset",
  Liability = "Liability",
  Equity = "Equity",
  Revenue = "Revenue",
  Expense = "Expense"
}

export interface LedgerEntry {
  entry_id: number;
  account_id: number;
  account_name?: string;
  account_type?: string;
  debit?: number;
  credit?: number;
  txn_date: string;
  reference_table?: string;
  reference_id?: number;
  narration?: string;
  txn_group_id: string;
  created_at: string;
  created_by?: number;
  created_by_name?: string;
}

export interface LedgerEntryPayload {
  account_id: number;
  debit?: number;
  credit?: number;
  txn_date: string;
  reference_table?: string;
  reference_id?: number;
  narration?: string;
  created_by?: number;
}

export interface NewLedgerEntry {
  account_id: number | '';
  debit: number | '';
  credit: number | '';
  txn_date: string;
  reference_table: string;
  reference_id: number | '';
  narration: string;
}

export interface StockReceiptPayload {
  purchase_id?: number;
  item_code: string;
  received_qty: number;
  unit_cost: number;
  received_date: string;
  supplier?: string;
}


export interface StockReceipt {
  lot_id: number;
  purchase_id?: number;
  item_code: string;
  item_name?: string;
  received_qty: number;
  remaining_qty: number;
  unit_cost: number;
  received_date: string;
  supplier?: string;
}

export interface NewStockReceipt {
  purchase_id: number | '';
  item_code: string;
  item_name: string;
  received_qty: number | '';
  remaining_qty: number | '';
  unit_cost: number | '';
  received_date: string;
  supplier: string;
}

export interface BatchAllocationLine {
  allocation_line_id: number;
  allocation_id: number;
  batch_id?: number;
  lot_id: number;
  qty: number;
  unit_cost: number;
  line_value: number;
  allocation_date?: string;
  requirement_id?: number;
  item_code?: string;
  item_name?: string;
  lot_number?: string;
}

export interface BatchAllocationLinePayload {
  allocation_id: number;
  lot_id: number;
  qty: number;
  unit_cost: number;
  line_value: number;
}

export interface NewBatchAllocationLine {
  allocation_id: number | '';
  lot_id: number | '';
  qty: number | '';
  unit_cost: number | '';
}

export interface LedgerAccount {
  account_id: number;
  name: string;
  account_type: string;
  current_balance: number;
  created_at: string;
}

export interface NewLedgerAccount {
  name: string;
  account_type: string;
  current_balance: number | '';
}

export interface LedgerAccountPayload {
  name: string;
  account_type: string;
  current_balance: number;
}

export interface PurchasePayload {
  item_code: string;
  cost_per_unit: number;
  total_cost?: number;
  purchase_date: string;
  supplier: string;
  supplier_id?: number;
  quantity: number;
  created_by: number;
  payment_type: string;
  payment_account: LedgerAccountType;
  inventory_account_id?: number;
  payment_account_id?: number;
}


export interface FarmerCommissionHistory {
  id: number;
  farmer_id: number;
  commission_amount: number;
  description?: string;
  created_at: string;
}

export interface CreateFarmerCommission {
  farmer_id: number;
  commission_amount: number | '';
  description: string;
  created_by?: number;
}

export interface BirdCountHistory {
  record_id: number;
  batch_id: number;
  batch_line_id?: number;
  farmer_name?: string;
  record_date: string;
  deaths: number;
  additions: number;
  notes: string;
  created_at: string;
}

export interface BirdCountHistoryPayload {
  batch_id: number;
  record_date: string;
  deaths: number;
  additions: number;
  notes?: string;
}

export interface NewBirdCountHistory {
  batch_id: number | '';
  record_date: string;
  deaths: number | '';
  additions: number | '';
  notes: string;
}

export interface BatchClosure {
  id: number;
  batch_id: number;
  start_date: string;
  end_date: string;
  initial_chicken_count: number;
  available_chicken_count: number;
  revenue: number;
  gross_profit: number;
}

export interface BatchClosurePayload {
  batch_id: number;
  start_date: string;
  end_date: string;
  initial_chicken_count: number;
  available_chicken_count: number;
  revenue: number;
  gross_profit: number;
}

export interface CreateBatchClosure {
  batch_id: number | '';
  start_date: string;
  end_date: string;
  initial_chicken_count: number | '';
  available_chicken_count: number | '';
  revenue: number | '';
  gross_profit: number | '';
}

export interface BatchSale {
  id: number;
  item_code: string;
  item_name: string;
  batch_id: number;
  trader_id: number;
  avg_weight: number;
  rate: number;
  quantity: number;
  value: number;
  created_at: string;
}

export interface BatchSalePayload {
  item_code: string;
  batch_id: number;
  trader_id: number;
  avg_weight: number;
  rate: number;
  quantity: number;
  payment_type: string;
  created_by: number;
}

export interface NewBatchSale {
  item_code: string;
  item_name: string;
  batch_id: number | '';
  farmer_name: string;
  trader_id: number | '';
  trader_name: string;
  avg_weight: number | '';
  rate: number | '';
  quantity: number | '';
  value: number | '';
  payment_type: string;
}

export interface StockReturn {
  return_id: number;
  allocation_line_id: number;
  batch_id: number;
  return_qty: number;
  unit_cost: number;
  return_value: number;
  return_date: string;
  created_at: string;
}

export interface StockReturnPayload {
  allocation_line_id: number;
  batch_id: number;
  return_qty: number;
  unit_cost: number;
  return_value: number;
  return_date: string;
}

export interface SupplierPayable {
  purchase_id: number;
  purchase_date: string;
  item_code: string;
  quantity: string;
  total_cost: string;
}

export interface SupplierPayment {
  payment_id: number,
  supplier_id: number,
  amount: number,
  payment_date: string,
  payment_mode: string,
  reference_number: string,
  txn_group_id: string,
  notes: string,
  created_at: string,
}

export interface SupplierPaymentPayload {
  supplier_id: number;
  amount: number;
  payment_date: string; // "YYYY-MM-DD"
  payment_mode: string;
  reference_number?: string;
  notes?: string;
  created_by: number;
}

export interface SupplierLedgerEntry {
  date: string,
  description: string,
  reference: string,
  amount: string,
  entry_type: string,
}

export interface TraderReceivable {
  id: number,
  batch_id: number,
  item_code: string,
  quantity: number,
  total_cost: number,
  sale_date: string,
}

export interface TraderPayment {
  payment_id: number,
  trader_id: number,
  amount: number,
  payment_date: string,
  payment_mode: string,
  reference_number: string,
  txn_group_id: string,
  notes: string,
  created_at: string,
}

export interface TraderPaymentPayload {
  trader_id: number;
  amount: number;
  payment_date: string; // "YYYY-MM-DD"
  payment_mode: string;
  reference_number?: string;
  notes?: string;
  created_by: number;
}

export interface TraderLedgerEntry {
  date: string,
  description: string,
  reference: string,
  amount: string,
  entry_type: string,
}

export interface GrowingChargesInputs {
  batch_id: number;
  bird_shortage: number;
  other_deduction: number;
  bird_shortage_cost: number;
  fcr_incentive: number;
  market_incentive: number;
  tds_per: number;
}


export interface Loan {
  loan_id: number;
  lender_name: string;
  principal_amount: number;
  interest_rate: number | null;
  loan_date: string;
  due_date: string | null;
  outstanding_balance: number;
  status: string;
  txn_group_id: string | null;
  notes: string | null;
  created_at: string;
  created_by: number | null;
}

export interface LoanPayload {
  lender_name: string;
  principal_amount: number;
  interest_rate?: number;
  loan_date: string;
  due_date?: string;
  notes?: string;
  created_by: number;
}

export interface NewLoan {
  lender_name: string;
  principal_amount: number | '';
  interest_rate: number | '';
  loan_date: string;
  due_date: string;
  notes: string;
}

export interface LoanPayment {
  payment_id: number;
  loan_id: number;
  principal_amount: number;
  interest_amount: number;
  total_amount: number;
  payment_date: string;
  payment_mode: string | null;
  reference_number: string | null;
  txn_group_id: string | null;
  notes: string | null;
  created_at: string;
  created_by: number | null;
}

export interface LoanPaymentPayload {
  loan_id: number;
  principal_amount: number;
  interest_amount: number;
  total_amount: number;
  payment_date: string;
  payment_mode?: string;
  reference_number?: string;
  notes?: string;
  created_by: number;
}

export interface NewLoanPayment {
  loan_id: number | '';
  principal_amount: number | '';
  interest_amount: number | '';
  total_amount: number | '';
  payment_date: string;
  payment_mode: string;
  reference_number: string;
  notes: string;
}

export interface AllocatedRequirement {
  requirement_id: number;
  item_code: string;
  requested_qty: string;
  allocation_id: number;
  allocated_qty: string;
  allocated_value: string;
  allocation_date: string;
}

export enum OtherExpenseCategory {
  FeedTransfer = 'feed_transfer',
  LoadingUnloading = 'loading_unloading',
  Petrol = 'petrol',
  EmployeeExpenses = 'employee_expenses',
  Misc = 'misc',
}

export const OTHER_EXPENSE_CATEGORY_LABELS: Record<OtherExpenseCategory, string> = {
  [OtherExpenseCategory.FeedTransfer]: 'Feed Transfer',
  [OtherExpenseCategory.LoadingUnloading]: 'Loading/Unloading Charges',
  [OtherExpenseCategory.Petrol]: 'Petrol',
  [OtherExpenseCategory.EmployeeExpenses]: 'Employee Expenses',
  [OtherExpenseCategory.Misc]: 'Misc',
};

export interface OtherExpense {
  id: number;
  category: OtherExpenseCategory;
  amount: number;
  description?: string;
  expense_date: string;
  created_by: number;
  created_at: string;
}

export interface CreateOtherExpensePayload {
  category: OtherExpenseCategory;
  amount: number;
  description?: string;
  expense_date: string;
  created_by: number;
}

export interface NewOtherExpense {
  category: OtherExpenseCategory | '';
  amount: number | '';
  description: string;
  expense_date: string;
}