import { BirdCountHistory, BirdCountHistoryPayload } from '../types/interfaces';
import api from '../utils/api';
import { toast } from 'react-toastify';

export const fetchBirdCountHistory = async (): Promise<BirdCountHistory[]> => {
    const response = await api.get('/getall/bird_count_history');
    return response.data;
};

export const handleAddBirdCountHistory = async (
    payload: BirdCountHistoryPayload,
    queryClient: any,
    setLoading: (loading: boolean) => void,
    onSuccess?: () => void
) => {
    if (
        typeof payload.batch_id !== 'number' || isNaN(payload.batch_id) ||
        typeof payload.record_date !== 'string' || !payload.record_date.trim() ||
        typeof payload.deaths !== 'number' || isNaN(payload.deaths) ||
        typeof payload.additions !== 'number' || isNaN(payload.additions)
    ) {
        toast.error('Please fill in all required fields');
        return;
    }

    setLoading(true);
    toast.info('Adding bird count record...');

    try {
        await api.post('/insert/bird_count_history', payload);

        queryClient.invalidateQueries(['bird_count_history']);

        toast.success('Bird count record added successfully!');
        if (onSuccess) onSuccess();
    } catch (error) {
        console.error('Error adding bird count record:', error);
        toast.error('Error adding bird count record');
    } finally {
        setLoading(false);
    }
};

export const handleDeleteBirdCountHistory = async (
    recordId: number,
    queryClient?: any
) => {
    try {
        await api.delete(`/delete/bird_count_history/${recordId}`);

        toast.success(`Bird count record #${recordId} deleted!`);
        queryClient?.invalidateQueries(['bird_count_history']);
    } catch (error) {
        console.error('Error deleting bird count record:', error);
        toast.error('Error deleting bird count record');
    }
};