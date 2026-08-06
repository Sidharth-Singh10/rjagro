import { StockReceipt, StockReceiptPayload } from '../types/interfaces';
import api from '../utils/api';
import { toast } from 'react-toastify';

export const fetchStockReceipts = async (itemCode?: string): Promise<StockReceipt[]> => {
    const params = itemCode ? `?item_code=${encodeURIComponent(itemCode)}` : '';
    const response = await api.get(`/getall/stock_receipts${params}`);
    return response.data;
};

export const handleAddStockReceipt = async (
    payload: StockReceiptPayload,
    queryClient: any,
    setLoading: (loading: boolean) => void,
    onSuccess?: () => void,
    onError?: (error: any) => void
) => {
    if (
        !payload.item_code ||
        !payload.received_qty ||
        !payload.unit_cost ||
        !payload.received_date
    ) {
        toast.error("Please fill in all required fields");
        return;
    }

    setLoading(true);
    toast.info("Adding stock receipt...");

    try {
        await api.post("/insert/stock_receipts", payload);

        // Refresh cache instead of manual refetch
        queryClient.invalidateQueries(["stock_receipts"]);

        toast.success("Stock receipt added successfully!");
        if (onSuccess) onSuccess();
    } catch (error) {
        console.error("Error adding stock receipt:", error);
        toast.error("Error adding stock receipt");
        if (onError) onError(error);
    } finally {
        setLoading(false);
    }
};