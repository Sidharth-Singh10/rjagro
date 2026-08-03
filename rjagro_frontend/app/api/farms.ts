import { Farm, FarmPayload } from "../types/interfaces";
import api from "../utils/api";
import { toast } from "react-toastify";

export const fetchFarms = async (): Promise<Farm[]> => {
    const response = await api.get("/getall/farms");
    return response.data;
};

export const handleAddFarm = async (
    payload: FarmPayload,
    queryClient: any,
    setLoading: (loading: boolean) => void,
    onSuccess?: () => void
) => {
    if (!payload.farmer_id || !payload.code || !payload.name) {
        toast.error("Please fill in all required fields");
        return;
    }

    setLoading(true);
    toast.info("Adding farm...");

    try {
        await api.post("/insert/farms", payload);
        queryClient.invalidateQueries(["farms"]);
        toast.success("Farm added successfully!");
        if (onSuccess) onSuccess();
    } catch (error) {
        console.error("Error adding farm:", error);
        toast.error("Error adding farm");
    } finally {
        setLoading(false);
    }
};
