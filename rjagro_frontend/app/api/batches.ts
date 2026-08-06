import { Batch, BatchClosure, BatchClosurePayload, BatchPayload, CreateFarmerCommission, FarmerCommissionHistory, GrowingChargesInputs, Timeslot } from '../types/interfaces';
import api from '../utils/api';
import { toast } from 'react-toastify';

export const fetchBatches = async (): Promise<Batch[]> => {
    const response = await api.get("/getall/batches");
    return response.data;
};

export const fetchBatchById = async (batchId: number): Promise<Batch> => {
    const response = await api.get(`/getbyid/batches/${batchId}`);
    return response.data;
};

// ─── Live-selling (farm-based) batch actions ────────────────────────────────

export const handleAddLiveBatch = async (
    farmId: number,
    startDate: string,
    queryClient: any,
    setLoading: (loading: boolean) => void,
    onSuccess?: () => void
) => {
    if (!farmId) {
        toast.error("Invalid farm selected");
        return;
    }

    if (!startDate) {
        toast.error("Select a start date");
        return;
    }

    setLoading(true);

    try {
        await api.post(`/insert/batches/${farmId}`, { start_date: startDate });
        queryClient.invalidateQueries(["batches"]);
        toast.success("Live batch created!");
        if (onSuccess) onSuccess();
    } catch (error) {
        console.error("Error creating live batch:", error);
        toast.error("Error creating live batch");
    } finally {
        setLoading(false);
    }
};

export const activateLiveBatch = async (
    batchId: number,
    avgBodyWeight: number,
    queryClient: any,
    setLoading: (loading: boolean) => void,
    onSuccess?: () => void
) => {
    if (!avgBodyWeight || avgBodyWeight <= 0) {
        toast.error("Please enter a valid average body weight");
        return;
    }

    setLoading(true);

    try {
        await api.post(`/insert/batches/${batchId}/activate`, { avg_body_weight: avgBodyWeight });
        queryClient.invalidateQueries(["batches"]);
        toast.success("Batch activated!");
        if (onSuccess) onSuccess();
    } catch (error) {
        console.error("Error activating batch:", error);
        toast.error("Error activating batch");
    } finally {
        setLoading(false);
    }
};

export const closeLiveBatch = async (
    batchId: number,
    queryClient: any,
    setLoading: (loading: boolean) => void,
    onSuccess?: () => void
) => {
    setLoading(true);

    try {
        await api.post(`/insert/batches/${batchId}/close`);
        queryClient.invalidateQueries(["batches"]);
        toast.success("Batch closed!");
        if (onSuccess) onSuccess();
    } catch (error) {
        console.error("Error closing batch:", error);
        toast.error("Error closing batch");
    } finally {
        setLoading(false);
    }
};

export const addBatchTimeslot = async (
    batchId: number,
    slotStart: string,
    slotEnd: string,
    queryClient: any,
    setLoading: (loading: boolean) => void,
    onSuccess?: () => void
) => {
    if (!slotStart || !slotEnd) {
        toast.error("Please enter slot start and end times");
        return;
    }

    setLoading(true);

    try {
        await api.post(`/insert/batches/${batchId}/timeslots`, {
            slot_start: slotStart,
            slot_end: slotEnd,
        });
        queryClient.invalidateQueries(["timeslots", batchId]);
        toast.success("Timeslot added!");
        if (onSuccess) onSuccess();
    } catch (error) {
        console.error("Error adding timeslot:", error);
        toast.error("Error adding timeslot");
    } finally {
        setLoading(false);
    }
};

export const fetchBatchTimeslots = async (batchId: number): Promise<Timeslot[]> => {
    const response = await api.get(`/getbyid/batches/${batchId}/timeslots`);
    return response.data;
};

export const handleAddBatch = async (
    payload: BatchPayload,
    queryClient: any,
    setLoading: (loading: boolean) => void,
    onSuccess?: () => void,
    onError?: (error: any) => void
) => {
    if (
        !payload.line_id ||
        !payload.supervisor_id ||
        !payload.farmer_id ||
        !payload.initial_bird_count
    ) {
        toast.error("Please fill in all required fields");
        return;
    }

    setLoading(true);
    toast.info("Adding batch...");

    try {
        await api.post("/insert/batches", payload);

        // Refresh cache instead of manual refetch
        queryClient.invalidateQueries(["batches"]);

        toast.success("Batch added successfully!");
        if (onSuccess) onSuccess();
    } catch (error) {
        console.error("Error adding batch:", error);
        toast.error("Error adding batch");
        if (onError) onError(error);
    } finally {
        setLoading(false);
    }
};

export const fetchFarmerCommissionHistory = async (): Promise<FarmerCommissionHistory[]> => {
    const response = await api.get("/getall/farmer_commission");
    return response.data;
};


export const fetchFarmerCommissionHistoryById = async (farmerId: number): Promise<FarmerCommissionHistory[]> => {
    const response = await api.get(`/getbyid/farmer_commission/${farmerId}`);
    return response.data;
};


export const handleAddFarmerCommission = async (
    payload: CreateFarmerCommission,
    queryClient: any,
    setLoading: (loading: boolean) => void,
    onSuccess?: () => void,
    onError?: (error: any) => void
) => {
    if (!payload.farmer_id || !payload.commission_amount || !payload.created_by || Number(payload.commission_amount) <= 0) {
        toast.error("Please fill in all required fields with valid values");
        return;
    }

    setLoading(true);
    toast.info("Adding farmer commission...");

    try {
        await api.post("/insert/farmer_commission", payload);

        // Refresh cache
        queryClient.invalidateQueries(["farmer-commission-history"]);

        toast.success("Farmer commission added successfully!");
        if (onSuccess) onSuccess();
    } catch (error) {
        console.error("Error adding farmer commission:", error);
        toast.error("Error adding farmer commission");
        if (onError) onError(error);
    } finally {
        setLoading(false);
    }
};
export const handleCloseBatch = async (
    payload: BatchClosurePayload,
    queryClient: any,
    setLoading: (loading: boolean) => void,
    onSuccess?: () => void
) => {
    if (
        !payload.batch_id ||
        !payload.start_date ||
        !payload.end_date ||
        !payload.initial_chicken_count ||
        !payload.available_chicken_count
    ) {
        toast.error("Please fill in all required fields");
        return;
    }

    setLoading(true);
    toast.info("Closing batch...");

    try {
        await api.post("/insert/batch_closure_summary", payload);
        queryClient.invalidateQueries(["batch_closures"]);
        queryClient.invalidateQueries(["batches"]);
        toast.success("Batch closed successfully!");
        if (onSuccess) onSuccess();
    } catch (error) {
        console.error("Error closing batch:", error);
        toast.error("Error closing batch");
    } finally {
        setLoading(false);
    }
};

export const fetchBatchClosures = async (): Promise<BatchClosure[]> => {
    const response = await api.get("/getall/batch_closure_summary");
    return response.data;
};

export const downloadGrowingChargesPdf = async (
    inputs: GrowingChargesInputs,
    setLoading?: (loading: boolean) => void
) => {
    if (!inputs.batch_id) {
        toast.error("Invalid Batch ID");
        return;
    }

    if (setLoading) setLoading(true);
    toast.info("Generating PDF...");

    try {
        const response = await api.post(
            "/getbyid/growing_charges",
            inputs,
            {
                responseType: 'blob',
            }
        );

        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Growing_Charges_Batch_${inputs.batch_id}.pdf`);

        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);

        toast.success("PDF downloaded successfully!");
        return true;
    } catch (error) {
        console.error("Error downloading PDF:", error);
        toast.error("Failed to download PDF");
        return false;
    } finally {
        if (setLoading) setLoading(false);
    }
};