import { BatchAllocationLine, BatchAllocationLinePayload } from "../types/interfaces";
import api from "../utils/api";
import { toast } from "react-toastify";

export const fetchBatchAllocationLines = async (): Promise<BatchAllocationLine[]> => {
  const response = await api.get("/getall/batch_allocation_lines");
  return response.data;
};

export const handleAddBatchAllocationLine = async (
  payload: BatchAllocationLinePayload,
  queryClient: any,
  setLoading: (loading: boolean) => void,
  onSuccess?: () => void
) => {
  if (
    !payload.allocation_id ||
    !payload.lot_id ||
    !payload.qty ||
    !payload.unit_cost
  ) {
    toast.error("Please fill in all required fields");
    return;
  }

  setLoading(true);
  toast.info("Adding allocation line...");

  try {
    await api.post("/insert/batch_allocation_lines", payload);

    queryClient.invalidateQueries(["batch_allocation_lines"]);

    toast.success("Allocation line added successfully!");
    if (onSuccess) onSuccess();
  } catch (error) {
    console.error("Error adding batch allocation line:", error);
    toast.error("Error adding allocation line");
  } finally {
    setLoading(false);
  }
};

export const handleUpdateBatchAllocationLine = async (
  allocationLineId: number,
  payload: Partial<BatchAllocationLinePayload>,
  queryClient: any
) => {
  try {
    await api.put(`/update/batch_allocation_lines/${allocationLineId}`, payload);
    
    queryClient.invalidateQueries(["batch_allocation_lines"]);
    toast.success(`Allocation line #${allocationLineId} updated!`);
  } catch (error) {
    console.error("Error updating batch allocation line:", error);
    toast.error("Error updating allocation line");
  }
};

export const handleDeleteBatchAllocationLine = async (
  allocationLineId: number,
  queryClient?: any
) => {
  try {
    await api.delete(`/delete/batch_allocation_lines/${allocationLineId}`);
    
    toast.success(`Allocation line #${allocationLineId} deleted!`);
    queryClient?.invalidateQueries(["batch_allocation_lines"]);
  } catch (error) {
    console.error("Error deleting batch allocation line:", error);
    toast.error("Error deleting allocation line");
  }
};
