import {
    LedgerEntry,
    LedgerEntryPayload,
    LedgerMonthAccountSummary,
    PaginatedLedgerEntries,
} from "../types/interfaces";
import api from "../utils/api";
import { toast } from "react-toastify";

export const LEDGER_ENTRIES_PAGE_SIZE = 25;

/** Entry types the app writes into ledger_entries.reference_table. */
export const LEDGER_ENTRY_TYPES: { value: string; label: string }[] = [
    { value: "purchases", label: "Purchases" },
    { value: "batch_sales", label: "Batch Sales" },
    { value: "farmer_commission_history", label: "Farmer Commission" },
    { value: "other_expenses", label: "Other Expenses" },
    { value: "supplier_payments", label: "Supplier Payments" },
    { value: "trader_payments", label: "Trader Payments" },
    { value: "allocations", label: "Allocations" },
    { value: "stock_returns", label: "Stock Returns" },
    { value: "batches", label: "Batches" },
    { value: "loans", label: "Loans" },
    { value: "loan_payments", label: "Loan Payments" },
];

export interface LedgerEntriesPageFilters {
    accountId?: number;
    /** Inclusive ISO date, YYYY-MM-DD. */
    from?: string;
    /** Inclusive ISO date, YYYY-MM-DD. */
    to?: string;
    /** ledger_entries.reference_table, e.g. "purchases". */
    referenceTable?: string;
    sort?: string;
    dir?: "asc" | "desc";
}

const num = (value: unknown): number | undefined =>
    value === null || value === undefined || value === "" ? undefined : Number(value);

export const fetchLedgerEntriesPage = async (
    page: number = 1,
    pageSize: number = LEDGER_ENTRIES_PAGE_SIZE,
    filters: LedgerEntriesPageFilters = {}
): Promise<PaginatedLedgerEntries> => {
    const params: Record<string, unknown> = { page, page_size: pageSize };
    if (filters.accountId) params.account_id = filters.accountId;
    if (filters.from) params.from = filters.from;
    if (filters.to) params.to = filters.to;
    if (filters.referenceTable) params.reference_table = filters.referenceTable;
    if (filters.sort) {
        params.sort = filters.sort;
        params.dir = filters.dir ?? "asc";
    }

    const response = await api.get("/getall/ledger_entries/paginated", { params });
    const data = response.data ?? {};
    return {
        items: (data.items ?? []).map((entry: LedgerEntry) => ({
            ...entry,
            debit: num(entry.debit),
            credit: num(entry.credit),
        })),
        page: Number(data.page ?? 1),
        page_size: Number(data.page_size ?? pageSize),
        total_count: Number(data.total_count ?? 0),
        total_pages: Number(data.total_pages ?? 0),
        total_debit: Number(data.total_debit ?? 0),
        total_credit: Number(data.total_credit ?? 0),
    };
};

export const fetchLedgerEntriesSummary = async (
    from: string,
    to: string
): Promise<LedgerMonthAccountSummary[]> => {
    const response = await api.get("/getall/ledger_entries/summary", {
        params: { from, to },
    });
    return (response.data ?? []).map((row: any) => ({
        month: row.month,
        account_id: Number(row.account_id),
        total_debit: Number(row.total_debit),
        total_credit: Number(row.total_credit),
        count: Number(row.count),
    }));
};

export const handleAddLedgerEntry = async (
    payload: LedgerEntryPayload,
    queryClient: any,
    setLoading: (loading: boolean) => void,
    onSuccess?: () => void
) => {
    if (
        !payload.txn_date ||
        (!payload.debit && !payload.credit) ||
        (payload.debit && payload.credit)
    ) {
        toast.error("Please fill in required fields and ensure only debit OR credit is entered");
        return;
    }


    setLoading(true);
    toast.info("Adding ledger entry...");

    try {
        await api.post("/insert/ledger_entry", payload);

        queryClient.invalidateQueries(["ledger_entries"]);

        toast.success("Ledger entry added successfully!");
        if (onSuccess) onSuccess();
    } catch (error) {
        console.error("Error adding ledger entry:", error);
        toast.error("Error adding ledger entry");
    } finally {
        setLoading(false);
    }
};