import { ItemCategory } from "./enums";

export interface Item {
  item_code: string;
  item_name: string;
  item_category: ItemCategory;
  unit: string;
}

export interface Purchase {
  payment_method: string;
  purchase_id: number;
  item_code: string;
  item_name: string;
  cost_per_unit: number;
  total_cost: number;
  quantity: number;
  purchase_date: string;
  supplier: string;
  created_by: number;
  payment_account?: LedgerAccountType;
}

export interface NewPurchase {
  item_code: string;
  item_name: string;
  cost_per_unit: number | '';
  quantity: number | '';
  supplier: string;
  payment_method?: string;
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
  lot_id: number;
  qty: number;
  unit_cost: number;
  line_value: number;
  // Related data for display
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
  total_cost: number;
  purchase_date: string;
  supplier: string;
  quantity: number;
  created_by: number;
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
  farmer_name: string;
  trader_id: number;
  trader_name: string;
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
  value: number;
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