import { toast } from "react-toastify";
import {
    ReturnableAllocationLine,
    StockReturn,
    StockReturnPayload,
} from "../types/interfaces";
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

    setLoading(true);
    toast.info("Processing stock return...");

    try {
        await api.post("/insert/stock_returns", payload);

        // The batch page keys its returns query as ["stock_returns_new", batchId],
        // so invalidate every stock-return query, not just the bare root key.
        queryClient.invalidateQueries({
            predicate: (query: any) =>
                Array.isArray(query.queryKey) &&
                String(query.queryKey[0]).startsWith("stock_returns"),
        });
        queryClient.invalidateQueries(["inventory"]);
        queryClient.invalidateQueries(["batch_allocations"]);
        queryClient.invalidateQueries(["batches"]);
        queryClient.invalidateQueries(["batch_new"]);
        queryClient.invalidateQueries(["ledger_entries"]);
        queryClient.invalidateQueries(["allocation_fcr"]);
        queryClient.invalidateQueries(["inventory_feed_summary"]);

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

/**
 * Lists the allocation lines of a batch/item that still have quantity left to
 * return. Returns are always priced from these lines by the server, so the
 * form lets the user pick a line (lot) rather than assuming the latest one.
 */
export const fetchReturnableAllocationLines = async (
    batchId: number,
    itemCode: string
): Promise<ReturnableAllocationLine[]> => {
    const response = await api.get(
        `getbyid/returnable_lines/${batchId}/${encodeURIComponent(itemCode)}`
    );
    return response.data ?? [];
};