import { PaginatedPurchases, Purchase, PurchaseOrderPayload, PurchasePayload } from '../types/interfaces';
import api from '../utils/api';
import { toast } from 'react-toastify';

export const PURCHASES_PAGE_SIZE = 25;

export const fetchPurchases = async (): Promise<Purchase[]> => {
    const response = await api.get('/getall/purchases');
    return response.data;
};

export interface PurchasesPageFilters {
    supplierId?: number;
    /** Free-text match on purchase id or item code (for pickers). */
    search?: string;
    /** Inclusive ISO date, YYYY-MM-DD. */
    from?: string;
    /** Inclusive ISO date, YYYY-MM-DD. */
    to?: string;
    sort?: string;
    dir?: 'asc' | 'desc';
}

export const fetchPurchasesPage = async (
    page: number = 1,
    pageSize: number = PURCHASES_PAGE_SIZE,
    filters: PurchasesPageFilters = {}
): Promise<PaginatedPurchases> => {
    const params: Record<string, unknown> = { page, page_size: pageSize };
    if (filters.supplierId) params.supplier_id = filters.supplierId;
    if (filters.search) params.search = filters.search;
    if (filters.from) params.from = filters.from;
    if (filters.to) params.to = filters.to;
    if (filters.sort) {
        params.sort = filters.sort;
        params.dir = filters.dir ?? 'desc';
    }

    const response = await api.get('/getall/purchases/paginated', { params });
    const data = response.data ?? {};
    return {
        items: data.items ?? [],
        page: Number(data.page ?? 1),
        page_size: Number(data.page_size ?? pageSize),
        total_count: Number(data.total_count ?? 0),
        total_pages: Number(data.total_pages ?? 0),
        total_amount: Number(data.total_amount ?? 0),
    };
};

/** Lines of one purchase order, fetched when its edit form opens. */
export const fetchPurchaseOrderLines = async (orderId: number): Promise<Purchase[]> => {
    const response = await api.get(`/getall/purchases/order/${orderId}`);
    return response.data;
};

export const handleAddPurchase = async (
    payload: PurchasePayload,
    queryClient: any,
    setLoading: (loading: boolean) => void
) => {
    if (
        !payload.item_code ||
        !payload.cost_per_unit ||
        !payload.purchase_date ||
        !payload.supplier ||
        !payload.created_by ||
        !payload.inventory_account_id ||
        !payload.payment_account_id
    ) {
        toast.error('Please fill in all required fields');
        return;
    }

    setLoading(true);
    toast.info('Adding purchase...');

    try {
        await api.post('/insert/purchases', payload);
        // Invalidate cache -> refetch purchases
        queryClient.invalidateQueries(['purchases']);
        toast.success('Purchase added successfully!');
    } catch (error) {
        console.error('Error adding purchase:', error);
        toast.error('Error adding purchase');
    } finally {
        setLoading(false);
    }
};

export const handleDeletePurchase = async (
    purchaseId: number,
    queryClient?: any
) => {
    try {
        await api.delete(`/delete/purchases/${purchaseId}`);
        toast.success(`Purchase #${purchaseId} deleted!`);
        queryClient?.invalidateQueries(['purchases']);
    } catch (error) {
        console.error('Error deleting purchase:', error);
        toast.error('Error deleting purchase');
    }
};

export const handleAddPurchaseOrder = async (
    payload: PurchaseOrderPayload,
    queryClient: any,
    setLoading: (loading: boolean) => void,
    onSuccess?: () => void
) => {
    if (
        !payload.supplier_id ||
        !payload.purchase_date ||
        !payload.created_by ||
        !payload.payment_type ||
        payload.items.length === 0
    ) {
        toast.error('Please fill in all required fields and add at least one item');
        return;
    }

    setLoading(true);
    toast.info('Adding purchase order...');

    try {
        await api.post('/insert/purchase_orders', payload);
        queryClient.invalidateQueries(['purchases']);
        toast.success('Purchase order added successfully!');
        if (onSuccess) onSuccess();
    } catch (error) {
        console.error('Error adding purchase order:', error);
        toast.error('Error adding purchase order');
    } finally {
        setLoading(false);
    }
};

export const handleUpdatePurchaseOrder = async (
    purchaseOrderId: number,
    payload: PurchaseOrderPayload,
    queryClient: any,
    setLoading: (loading: boolean) => void,
    onSuccess?: () => void
) => {
    if (
        !payload.supplier_id ||
        !payload.purchase_date ||
        !payload.created_by ||
        !payload.payment_type ||
        payload.items.length === 0
    ) {
        toast.error('Please fill in all required fields and add at least one item');
        return;
    }

    setLoading(true);
    toast.info('Updating purchase order...');

    try {
        await api.patch(`/update/purchase_orders/${purchaseOrderId}`, payload);
        queryClient.invalidateQueries(['purchases']);
        toast.success('Purchase order updated successfully!');
        if (onSuccess) onSuccess();
    } catch (error: any) {
        console.error('Error updating purchase order:', error);
        const message =
            error?.response?.data?.message ||
            error?.response?.data ||
            'Error updating purchase order';
        toast.error(typeof message === 'string' ? message : 'Error updating purchase order');
    } finally {
        setLoading(false);
    }
};
