import { InventoryMovement, InventoryMovementPayload, PaginatedInventoryMovements } from '../types/interfaces';
import api from '../utils/api';
import { toast } from 'react-toastify';

export const INVENTORY_MOVEMENTS_PAGE_SIZE = 25;

export const fetchInventoryMovements = async (): Promise<InventoryMovement[]> => {
    const response = await api.get("/getall/inventory_movements");
    return response.data;
};

export const fetchInventoryMovementsPage = async (
    page: number = 1,
    pageSize: number = INVENTORY_MOVEMENTS_PAGE_SIZE,
    itemCode?: string
): Promise<PaginatedInventoryMovements> => {
    const params: Record<string, unknown> = { page, page_size: pageSize };
    if (itemCode) params.item_code = itemCode;

    const response = await api.get("/getall/inventory_movements/paginated", { params });
    const data = response.data ?? {};
    return {
        items: data.items ?? [],
        page: Number(data.page ?? 1),
        page_size: Number(data.page_size ?? pageSize),
        total_count: Number(data.total_count ?? 0),
        total_pages: Number(data.total_pages ?? 0),
    };
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
