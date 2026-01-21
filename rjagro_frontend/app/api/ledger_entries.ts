import { LedgerEntry, LedgerEntryPayload } from "../types/interfaces";
import api from "../utils/api";
import { toast } from "react-toastify";

export const fetchLedgerEntries = async (): Promise<LedgerEntry[]> => {
    const response = await api.get("/getall/ledger_entries");
    return response.data;
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