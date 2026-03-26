import { BatchRequirement } from "../types/interfaces";
import api from "../utils/api";
import { toast } from "react-toastify";

// Fetch all batch requirements
export const fetchBatchRequirements = async (): Promise<BatchRequirement[]> => {
  const response = await api.get("/getall/batch_requirements");
  return response.data;
};

// Add a new batch requirement
export const handleAddBatchRequirement = async (
  payload: any,
  queryClient: any,
  setLoading: (loading: boolean) => void,
  onSuccess?: () => void
) => {
  if (
    !payload.batch_id ||
    !payload.line_id ||
    !payload.supervisor_id ||
    !payload.item_code ||
    !payload.quantity
  ) {
    toast.error("Please fill in all required fields");
    return;
  }

  setLoading(true);
  toast.info("Adding requirement...");

  try {
    await api.post("/insert/batch_requirements", {
      ...payload,
      request_date: new Date().toISOString().slice(0, 10), // today
    });

    queryClient.invalidateQueries(["batch_requirements"]);

    toast.success("Requirement added!");
    if (onSuccess) onSuccess();
  } catch (error) {
    console.error("Error adding batch requirement:", error);
    toast.error("Error adding requirement");
  } finally {
    setLoading(false);
  }
};

// Reject a requirement
export const handleRejectRequirement = async (
  requirement_id: number,
  queryClient?: any
) => {
  try {
    await api.put(`/admin/decline_batch_requirement/${requirement_id}`);
    toast.success(`Requirement #${requirement_id} rejected!`);

    queryClient?.invalidateQueries(["batch_requirements"]);
  } catch (error) {
    console.error("Error rejecting requirement:", error);
    toast.error("Error rejecting requirement");
  }
};

// Approve a requirement
export const handleApproveRequirement = async (
  requirement: BatchRequirement,
  allocatedQty: number,
  user_id?: number,
  queryClient?: any
) => {
  try {
    const payload = {
      requirement_id: requirement.requirement_id,
      allocated_qty: allocatedQty,
      allocation_date: new Date().toISOString().slice(0, 10),
      allocated_by: user_id || 1, // fallback
    };

    await api.post("/admin/approve_batch_requirement", payload);

    toast.success(`Requirement #${requirement.requirement_id} approved!`);

    queryClient?.invalidateQueries(["batch_requirements"]);
  } catch (error) {
    console.error("Error approving requirement:", error);
    toast.error("Error approving requirement");
  }
};
