import { OtherExpense, CreateOtherExpensePayload } from "../types/interfaces";
import api from "../utils/api";
import { toast } from "react-toastify";

export const fetchOtherExpenses = async (): Promise<OtherExpense[]> => {
    const response = await api.get("/getall/other_expenses");
    return response.data;
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

        toast.success("Other expense added successfully!");
        if (onSuccess) onSuccess();
    } catch (error) {
        console.error("Error adding other expense:", error);
        toast.error("Error adding other expense");
    } finally {
        setLoading(false);
    }
};
