import { Batch, BatchAllocation, BatchRequirement, LedgerAccount, LedgerEntry, StockReceipt } from "../types/interfaces";
import { useTableSorting } from "./sorting";

export function useLedgerAccountsSorting(ledgerAccounts: LedgerAccount[]) {
    return useTableSorting<LedgerAccount>(
        ledgerAccounts,
        { key: 'account_id', direction: 'asc' },
        (item: LedgerAccount, key: string) => {
            switch (key) {
                case 'current_balance':
                    return parseFloat(String(item.current_balance)) || 0;
                case 'account_id':
                    return item.account_id;
                case 'name':
                    return item.name.toLowerCase();
                case 'account_type':
                    return item.account_type.toLowerCase();
                case 'created_at':
                    return new Date(item.created_at);
                default:
                    return item[key as keyof LedgerAccount] as string | number;
            }
        }
    );
}

export function useLedgerEntriesSorting(ledgerEntries: LedgerEntry[]) {
    return useTableSorting<LedgerEntry>(
        ledgerEntries,
        { key: 'txn_date', direction: 'desc' }, // Default to newest first
        (item: LedgerEntry, key: string) => {
            switch (key) {
                case 'txn_date':
                    return new Date(item.txn_date);
                case 'entry_id':
                    return item.entry_id;
                case 'account_id':
                    return item.account_id;
                case 'debit':
                    return parseFloat(String(item.debit)) || 0;
                case 'credit':
                    return parseFloat(String(item.credit)) || 0;
                case 'created_at':
                    return new Date(item.created_at);
                default:
                    return item[key as keyof LedgerEntry] as string | number;
            }
        }
    );
}

export function useBatchesSorting(batch: Batch[]) {
    return useTableSorting<Batch>(
        batch,
        { key: 'start_date', direction: 'desc' },
        (item: Batch, key: string) => {
            switch (key) {
                case 'start_date':
                    return new Date(item.start_date);
                case 'batch_id':
                    return item.batch_id;
                default:
                    return item[key as keyof Batch] as string | number;
            }
        }
    );
}

export function useBatchRequirementSorting(batch_req: BatchRequirement[]) {
    return useTableSorting<BatchRequirement>(
        batch_req,
        { key: 'req_id', direction: 'desc' },
        (item: BatchRequirement, key: string) => {
            switch (key) {
                case 'req_id':
                    return item.requirement_id;
                case 'request_date':
                    return item.request_date;
                default:
                    return item[key as keyof BatchRequirement] as string | number;
            }
        }
    );
}

export function useBatchAllocationSorting(batch_req: BatchAllocation[]) {
    return useTableSorting<BatchAllocation>(
        batch_req,
        { key: 'alloc_date', direction: 'desc' },
        (item: BatchAllocation, key: string) => {
            switch (key) {
                case 'alloc_date':
                    return new Date(item.allocation_date);
                case 'alloc_id':
                    return item.allocation_id;
                default:
                    return item[key as keyof BatchAllocation] as string | number;
            }
        }
    );
}

export function useStockReceiptsSorting(stockReceipts: StockReceipt[]) {
    return useTableSorting<StockReceipt>(
        stockReceipts,
        { key: 'lot_id', direction: 'desc' },
        (item: StockReceipt, key: string) => {
            switch (key) {
                case 'lot_id':
                    return item.lot_id;
                case 'purchase_id':
                    return item.purchase_id ?? 0;
                case 'received_qty':
                case 'remaining_qty':
                case 'unit_cost':
                    return parseFloat(String(item[key as keyof StockReceipt])) || 0;
                case 'received_date':
                    return new Date(item.received_date);
                default:
                    return item[key as keyof StockReceipt] as string | number;
            }
        }
    );
}
