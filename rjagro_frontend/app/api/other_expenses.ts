import {
    OtherExpense,
    CreateOtherExpensePayload,
    UpdateOtherExpensePayload,
    PaginatedOtherExpenses,
    OtherExpenseMonthSummary,
} from "../types/interfaces";
import api from "../utils/api";
import { toast } from "react-toastify";

export const OTHER_EXPENSES_PAGE_SIZE = 15;

const toNumber = (value: unknown): number => Number(value ?? 0);

export const fetchOtherExpensesPage = async (
    page: number = 1,
    pageSize: number = OTHER_EXPENSES_PAGE_SIZE
): Promise<PaginatedOtherExpenses> => {
    const response = await api.get("/getall/other_expenses/paginated", {
        params: { page, page_size: pageSize },
    });
    const data = response.data ?? {};
    return {
        items: (data.items ?? []).map((expense: OtherExpense) => ({
            ...expense,
            amount: toNumber(expense.amount),
        })),
        page: toNumber(data.page),
        page_size: toNumber(data.page_size),
        total_count: toNumber(data.total_count),
        total_pages: toNumber(data.total_pages),
        total_amount: toNumber(data.total_amount),
    };
};

export const fetchOtherExpensesSummary = async (
    from: string,
    to: string
): Promise<OtherExpenseMonthSummary[]> => {
    const response = await api.get("/getall/other_expenses/summary", {
        params: { from, to },
    });
    return (response.data ?? []).map((summary: any) => ({
        month: summary.month,
        total: toNumber(summary.total),
        count: toNumber(summary.count),
        by_category: (summary.by_category ?? []).map((row: any) => ({
            category: row.category,
            total: toNumber(row.total),
            count: toNumber(row.count),
        })),
    }));
};

export const handleAddOtherExpense = async (
    payload: CreateOtherExpensePayload,
    queryClient: any,
    setLoading: (loading: boolean) => void,
    onSuccess?: () => void
) => {
    if (!payload.category || !payload.amount || !payload.expense_date) {
        toast.error("Please fill in all required fields");
        return;
    }

    setLoading(true);
    toast.info("Adding other expense...");

    try {
        await api.post("/insert/other_expenses", payload);

        queryClient.invalidateQueries(["other_expenses"]);
        queryClient.invalidateQueries(["ledger_entries"]);
        queryClient.invalidateQueries(["ledger_accounts"]);
        queryClient.invalidateQueries(["metric_snapshots"]);

        toast.success("Other expense added successfully!");
        if (onSuccess) onSuccess();
    } catch (error) {
        console.error("Error adding other expense:", error);
        toast.error("Error adding other expense");
    } finally {
        setLoading(false);
    }
};

export const handleUpdateOtherExpense = async (
    id: number,
    payload: UpdateOtherExpensePayload,
    queryClient: any,
    setLoading: (loading: boolean) => void,
    onSuccess?: () => void
) => {
    if (!payload.category || !payload.amount || !payload.expense_date) {
        toast.error("Please fill in all required fields");
        return;
    }

    setLoading(true);
    toast.info("Updating other expense...");

    try {
        await api.patch(`/update/other_expenses/${id}`, payload);

        queryClient.invalidateQueries(["other_expenses"]);
        queryClient.invalidateQueries(["ledger_entries"]);
        queryClient.invalidateQueries(["ledger_accounts"]);
        queryClient.invalidateQueries(["metric_snapshots"]);

        toast.success("Other expense updated successfully!");
        if (onSuccess) onSuccess();
    } catch (error) {
        console.error("Error updating other expense:", error);
        toast.error("Error updating other expense");
    } finally {
        setLoading(false);
    }
};
