import { AllocatedRequirement, BatchAllocation, PaginatedAllocations } from '../types/interfaces';
import api from '../utils/api';
// import { toast } from 'react-toastify';

export const ALLOCATIONS_PAGE_SIZE = 25;

export const fetchBatchAllocations = async (): Promise<BatchAllocation[]> => {
  const response = await api.get("/getall/batch_allocations");
  return response.data;
};

export const fetchAllocationsPage = async (
  page: number = 1,
  pageSize: number = ALLOCATIONS_PAGE_SIZE,
  batchId?: number
): Promise<PaginatedAllocations> => {
  const params: Record<string, unknown> = { page, page_size: pageSize };
  if (batchId) params.batch_id = batchId;

  const response = await api.get('/getall/batch_allocations/paginated', { params });
  const data = response.data ?? {};
  return {
    items: data.items ?? [],
    page: Number(data.page ?? 1),
    page_size: Number(data.page_size ?? pageSize),
    total_count: Number(data.total_count ?? 0),
    total_pages: Number(data.total_pages ?? 0),
  };
};

export const fetchAllocationsByBatchId = async (batch_id: number): Promise<AllocatedRequirement[]> => {
  const response = await api.get(`getbyid/accepted_allocations/${batch_id}`);
  return response.data;
};

