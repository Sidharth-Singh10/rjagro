import { Batch } from '@/app/types/interfaces';

export function calculateTotalCost(costPerUnit: string | number, quantity: string | number): number {
  const cost = Number(costPerUnit) || 0;
  const qty = Number(quantity) || 0;
  return cost * qty;
}

export function capitalizeWords(str: string): string {
  return str
    .toLowerCase()
    .replace(/\b\w/g, char => char.toUpperCase());
}

export const getBatchInfo = (batchId: number, batches: Batch[]) => {
  const batch = batches.find(b => b.batch_id === batchId);
  return batch ? `Batch ${batchId} - ${batch.farmer_name}` : `Batch ${batchId}`;
};

export const getNetChange = (deaths: number, additions: number) => {
  const net = additions - deaths;
  return {
    value: net,
    isPositive: net > 0,
    isNeutral: net === 0
  };
};