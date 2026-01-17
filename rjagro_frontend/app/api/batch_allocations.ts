import { AllocatedRequirement, BatchAllocation } from '../types/interfaces';
import api from '../utils/api';
// import { toast } from 'react-toastify';

export const fetchBatchAllocations = async (): Promise<BatchAllocation[]> => {
  const response = await api.get("/getall/batch_allocations");
  return response.data;
};

export const fetchAllocationsByBatchId = async (batch_id: number): Promise<AllocatedRequirement[]> => {
  const response = await api.get(`getbyid/accepted_allocations/${batch_id}`);
  return response.data;
};

