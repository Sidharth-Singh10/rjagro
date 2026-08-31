import { BatchSale, BatchSalePayload } from "../types/interfaces";
import api from "../utils/api";
import { toast } from "react-toastify";

export const fetchBatchSales = async (): Promise<BatchSale[]> => {
  const response = await api.get("/getall/batch_sales");
  return response.data;
};

export const fetchBatchSalesByBatchId = async (batch_id: number): Promise<BatchSale[]> => {
  const response = await api.get(`/getbyid/sales/${batch_id}`);
  return response.data;
};

export const handleAddBatchSale = async (
  payload: BatchSalePayload,
  queryClient: any,
  setLoading: (loading: boolean) => void,
  onSuccess?: () => void
) => {
  if (
    !payload.item_code ||
    !payload.batch_id ||
    (payload.trader_id === undefined && !payload.app_trader_id) ||
    (!payload.trader_id && !payload.app_trader_id) ||
    !payload.avg_weight ||
    !payload.rate ||
    !payload.quantity ||
    !payload.payment_type
  ) {
    toast.error("Please fill in all required fields");
    return;
  }

  setLoading(true);
  toast.info("Adding batch sale...");

  try {
    await api.post("/insert/batch_sales", payload);

    queryClient.invalidateQueries(["batch_sales"]);

    toast.success("Batch sale added successfully!");
    if (onSuccess) onSuccess();
  } catch (error) {
    console.error("Error adding batch sale:", error);
    toast.error("Error adding batch sale");
  } finally {
    setLoading(false);
  }
};

// Delete a batch sale
export const handleDeleteBatchSale = async (
  saleId: number,
  queryClient?: any
) => {
  try {
    await api.delete(`/delete/batch_sales/${saleId}`);

    toast.success(`Batch sale #${saleId} deleted!`);
    queryClient?.invalidateQueries(["batch_sales"]);
  } catch (error) {
    console.error("Error deleting batch sale:", error);
    toast.error("Error deleting batch sale");
  }
};
