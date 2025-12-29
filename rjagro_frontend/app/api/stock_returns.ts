import { toast } from "react-toastify";
import { StockReturn, StockReturnPayload } from "../types/interfaces";
import api from "../utils/api";

export const fetchStockReturnsByBatch = async (batchId: number): Promise<StockReturn[]> => {
    const response = await api.get(`/getbyid/stock_returns/${batchId}`);
    return response.data;
};

export const fetchPaginatedStockReturns = async (
    page: number = 0,
    pageSize: number = 50
): Promise<StockReturn[]> => {
    const response = await api.get(`/getall/stock_returns`, {
        params: {
            page: page,
            page_size: pageSize
        }
    });
    return response.data;
};

export const handleAddStockReturn = async (
    payload: StockReturnPayload,
    queryClient: any,
    setLoading: (loading: boolean) => void,
    onSuccess?: () => void,
    onError?: (error: any) => void
) => {
    if (
        !payload.allocation_line_id ||
        !payload.batch_id ||
        !payload.return_qty ||
        !payload.unit_cost ||
        !payload.return_value ||
        !payload.return_date
    ) {
        toast.error("Please fill in all required fields");
        return;
    }

    if (payload.return_qty <= 0) {
        toast.error("Return quantity must be greater than zero");
        return;
    }

    const calculatedValue = payload.return_qty * payload.unit_cost;
    if (Math.abs(calculatedValue - payload.return_value) > 0.01) {
        toast.warning("Return value doesn't match quantity × unit cost. Adjusting...");
        payload.return_value = calculatedValue;
    }

    setLoading(true);
    toast.info("Processing stock return...");

    try {
        await api.post("/insert/stock_returns", payload);

        queryClient.invalidateQueries(["stock_returns"]);
        queryClient.invalidateQueries(["inventory"]);
        queryClient.invalidateQueries(["batch_allocations"]);
        queryClient.invalidateQueries(["batches"]);
        queryClient.invalidateQueries(["ledger_entries"]);

        toast.success("Stock return processed successfully!");

        if (onSuccess) onSuccess();
    } catch (error: any) {
        console.error("Error processing stock return:", error);

        const errorMessage = error.response?.data?.message || "Error processing stock return";
        toast.error(errorMessage);

        if (onError) onError(error);
    } finally {
        setLoading(false);
    }
};
