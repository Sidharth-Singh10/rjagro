import { Purchase, PurchaseOrderPayload, PurchasePayload } from '../types/interfaces';
import api from '../utils/api';
import { toast } from 'react-toastify';

export const fetchPurchases = async (): Promise<Purchase[]> => {
    const response = await api.get('/getall/purchases');
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

// Map UI display values ("Cash"/"Payable") to backend enum values ("CASH"/"PAYABLE").
const toBackendPaymentType = (paymentType: string): string => {
    return paymentType.toUpperCase();
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
        await api.post('/insert/purchase_orders', {
            ...payload,
            payment_type: toBackendPaymentType(payload.payment_type),
        });
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

export const handleDeletePurchaseOrder = async (
    purchaseOrderId: number,
    queryClient?: any
) => {
    try {
        await api.delete(`/delete/purchase_orders/${purchaseOrderId}`);
        toast.success(`Purchase order #${purchaseOrderId} deleted!`);
        queryClient?.invalidateQueries(['purchases']);
    } catch (error) {
        console.error('Error deleting purchase order:', error);
        toast.error('Error deleting purchase order');
    }
};
