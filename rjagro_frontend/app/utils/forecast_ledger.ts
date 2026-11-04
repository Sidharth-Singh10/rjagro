import api from './api';
import { isBatchSummary, isLedgerBatch, isLedgerScore, type BatchList, type LedgerBatch, type ScoreResponse } from './forecast_ledger_types';

export async function ledgerBatches(protocol: string, kind: string, offset: number): Promise<BatchList> {
    const { data } = await api.get<BatchList>('/analytics/ledger/batches', { params: { protocol: protocol || undefined, kind, offset, limit: 30 } });
    if (!data || !Array.isArray(data.batches) || !data.batches.every(isBatchSummary) || !Array.isArray(data.protocols)) throw new Error('Invalid ledger history response');
    return data;
}
export async function ledgerBatch(id: string): Promise<LedgerBatch> {
    const { data } = await api.get<unknown>(`/analytics/ledger/batches/${encodeURIComponent(id)}`);
    if (!isLedgerBatch(data)) throw new Error('Invalid forecast batch response');
    return data;
}
export interface ScoreFilters { protocol: string; kind: string; segment: string; event?: string; from?: string; to?: string }
export async function ledgerScores(filters: ScoreFilters): Promise<ScoreResponse> {
    const { data } = await api.get<ScoreResponse>('/analytics/ledger/scores', { params: { ...filters, protocol: filters.protocol || undefined } });
    if (!data || !Array.isArray(data.scores) || !data.scores.every(isLedgerScore) || !Number.isFinite(Date.parse(data.generatedAt))) throw new Error('Invalid ledger score response');
    return data;
}
export async function downloadLedgerReport(filters: ScoreFilters) {
    const { data } = await api.get<string>('/analytics/ledger/report', { params: { ...filters, protocol: filters.protocol || undefined }, responseType: 'text' });
    const url = URL.createObjectURL(new Blob([data], { type: 'text/markdown;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url; link.download = 'forecast-evaluation.md'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function ledgerError(error: unknown): string {
    if (typeof error === 'object' && error !== null && 'response' in error) {
        const response = error.response as { data?: { error?: { message?: string } } } | undefined;
        if (response?.data?.error?.message) return response.data.error.message;
    }
    return error instanceof Error ? error.message : 'Could not load forecast ledger';
}
