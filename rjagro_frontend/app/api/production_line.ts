import { ProductionLine, ProductionLinePayload } from '../types/interfaces';
import api from '../utils/api';
import { toast } from 'react-toastify';

export const fetchProductionLines = async (): Promise<ProductionLine[]> => {
    const response = await api.get('/getall/production_lines');
    return response.data;
};


export const handleAddProductionLine = async (
    payload: ProductionLinePayload,
    queryClient: any,
    setLoading: (loading: boolean) => void
) => {
    if (!payload.line_name || !payload.supervisor_id) {
        toast.error('Please fill in all required fields');
        return;
    }

    setLoading(true);
    toast.info('Adding production line...');

    try {
        await api.post('/insert/production_lines', payload);

        // Invalidate react-query cache so it refetches automatically
        queryClient.invalidateQueries(['production_lines']);

        toast.success('Production line added successfully!');
    } catch (error) {
        console.error('Error adding production line:', error);
        toast.error('Error adding production line');
    } finally {
        setLoading(false);
    }
};