import { Supplier, SupplierPayable, SupplierPayload, SupplierPayment, SupplierPaymentPayload } from "../types/interfaces";
import api from "../utils/api";
import { toast } from "react-toastify";

export const fetchSuppliers = async (): Promise<Supplier[]> => {
  const response = await api.get('/getall/suppliers');
  return response.data;
};

export const handleAddSupplier = async (
  payload: SupplierPayload,
  queryClient: any,
  setLoading: (loading: boolean) => void
) => {
  if (!payload.name || !payload.supplier_type) {
    toast.error("Please fill in all required fields");
    return;
  }

  setLoading(true);
  toast.info("Adding supplier...");

  try {
    await api.post('/insert/suppliers', payload);

    // Invalidate cache -> triggers auto-refetch
    queryClient.invalidateQueries(['suppliers']);

    toast.success("Supplier added successfully!");
  } catch (error) {
    console.error("Error adding supplier:", error);
    toast.error("Error adding supplier");
  } finally {
    setLoading(false);
  }
};

export const fetchSupplierPayables = async (supplierId: number): Promise<SupplierPayable[]> => {
  const response = await api.get(`/getbyid/get_supplier_payables/${supplierId}`);
  return response.data;
};


export const fetchSupplierPayments = async (supplierId: number): Promise<SupplierPayment[]> => {
  const response = await api.get(`/getbyid/supplier_payments/${supplierId}`);
  return response.data;
}

// fix `any` later
export const fetchSupplierLedger  = async (supplierId: number): Promise<any[]> => {
  const response = await api.get(`/getbyid/supplier_ledger/${supplierId}`);
  return response.data;
}

export const handleAddSupplierPayment = async (
  payload: SupplierPaymentPayload,
  setLoading: (loading: boolean) => void,
  onSuccess?: () => void
) => {
  if (!payload.supplier_id || !payload.amount || !payload.payment_date) {
    toast.error("Please fill in all required payment fields");
    return;
  }

  // forgot to invalidate cache here?
  setLoading(true);

  try {
    await api.post('/insert/supplier_payment', payload);

    toast.success("Payment recorded successfully!");

    if (onSuccess) onSuccess();

  } catch (error) {
    console.error("Error recording payment:", error);
    toast.error("Error recording payment");
  } finally {
    setLoading(false);
  }
};