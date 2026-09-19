import { PaginatedStockReceipts, StockReceipt, StockReceiptPayload } from '../types/interfaces';
import api from '../utils/api';
import { toast } from 'react-toastify';

export const STOCK_RECEIPTS_PAGE_SIZE = 25;

export const fetchStockReceipts = async (itemCode?: string): Promise<StockReceipt[]> => {
    const params = itemCode ? `?item_code=${encodeURIComponent(itemCode)}` : '';
    const response = await api.get(`/getall/stock_receipts${params}`);
    return response.data;
};

export const fetchStockReceiptsPage = async (
    page: number = 1,
    pageSize: number = STOCK_RECEIPTS_PAGE_SIZE,
    filters: { itemCode?: string; search?: string; hasRemaining?: boolean; sort?: string; dir?: 'asc' | 'desc' } = {}
): Promise<PaginatedStockReceipts> => {
    const params: Record<string, unknown> = { page, page_size: pageSize };
    if (filters.itemCode) params.item_code = filters.itemCode;
    if (filters.search) params.search = filters.search;
    if (filters.hasRemaining) params.has_remaining = 'true';
    if (filters.sort) {
        params.sort = filters.sort;
        params.dir = filters.dir ?? 'desc';
    }

    const response = await api.get('/getall/stock_receipts/paginated', { params });
    const data = response.data ?? {};
    return {
        items: data.items ?? [],
        page: Number(data.page ?? 1),
        page_size: Number(data.page_size ?? pageSize),
        total_count: Number(data.total_count ?? 0),
        total_pages: Number(data.total_pages ?? 0),
    };
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