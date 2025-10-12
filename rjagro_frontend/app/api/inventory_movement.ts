import { InventoryMovement, InventoryMovementPayload } from '../types/interfaces';
import api from '../utils/api';
import { toast } from 'react-toastify';

export const fetchInventoryMovements = async (): Promise<InventoryMovement[]> => {
    const response = await api.get("/getall/inventory_movements");
    return response.data;
};

export const handleAddInventoryMovement = async (
    payload: InventoryMovementPayload,
    queryClient: any,
    setLoading: (loading: boolean) => void,
    onSuccess?: () => void
) => {
    if (
        !payload.item_code ||
        !payload.qty_change ||
        !payload.movement_type ||
        !payload.movement_date
    ) {
        toast.error("Please fill in all required fields");
        return;
    }

    setLoading(true);
    toast.info("Adding inventory movement...");

    try {
        await api.post("/insert/inventory_movements", payload);

        queryClient.invalidateQueries(["inventory_movements"]);

        toast.success("Inventory movement added successfully!");
        if (onSuccess) onSuccess();
    } catch (error) {
        console.error("Error adding inventory movement:", error);
        toast.error("Error adding inventory movement");
    } finally {
        setLoading(false);
    }
};
