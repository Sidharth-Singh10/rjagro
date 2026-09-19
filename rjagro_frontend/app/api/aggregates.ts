// Aggregate endpoints for the Overview dashboard. These replace full-table
// fetches (stock receipts, allocation lines, allocations) with server-side math.
import {
    AllocationBatchCost,
    AllocationCategoryTotal,
    BatchFcr,
    BatchFeedLine,
    FeedSummary,
} from "../types/interfaces";
import api from "../utils/api";

const toNumber = (value: unknown): number => Number(value ?? 0);

export const fetchFeedSummary = async (): Promise<FeedSummary> => {
    const response = await api.get("/getall/inventory/feed_summary");
    const data = response.data ?? {};
    return {
        feed_on_hand: toNumber(data.feed_on_hand),
        avg_daily_consumption: toNumber(data.avg_daily_consumption),
        days_cover: toNumber(data.days_cover),
    };
};

export const fetchAllocationCategoryTotals = async (
    from: string,
    to: string
): Promise<AllocationCategoryTotal[]> => {
    const response = await api.get("/getall/allocations/category_totals", {
        params: { from, to },
    });
    return (response.data ?? []).map((row: any) => ({
        month: row.month,
        category: row.category,
        total: toNumber(row.total),
    }));
};

export const fetchAllocationBatchCosts = async (
    limit: number = 10
): Promise<AllocationBatchCost[]> => {
    const response = await api.get("/getall/allocations/batch_costs", {
        params: { limit },
    });
    return (response.data ?? []).map((row: any) => ({
        batch_id: Number(row.batch_id),
        category: row.category,
        total: toNumber(row.total),
    }));
};

export const fetchAllocationFcr = async (limit: number = 10): Promise<BatchFcr[]> => {
    const response = await api.get("/getall/allocations/fcr", { params: { limit } });
    return (response.data ?? []).map((row: any) => ({
        batch_id: Number(row.batch_id),
        feed_kg: toNumber(row.feed_kg),
        weight_kg: toNumber(row.weight_kg),
        fcr: toNumber(row.fcr),
    }));
};

export const fetchBatchFeedLines = async (batchId: number): Promise<BatchFeedLine[]> => {
    const response = await api.get(`/getall/allocations/batch_feed/${batchId}`);
    return (response.data ?? []).map((row: any) => ({
        item_code: row.item_code,
        item_name: row.item_name,
        qty: toNumber(row.qty),
        unit: row.unit ?? undefined,
        kg: toNumber(row.kg),
    }));
};
