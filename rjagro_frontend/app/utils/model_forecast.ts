'use client';
/**
 * Data loading for the Analytics model picker. The shape rules live in
 * `model_series.ts`; this module only decides which endpoint to call and when.
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ledgerBatch, ledgerBatches, ledgerChallenger } from '@/app/utils/forecast_ledger';
import type { AnalyticsPayload } from '@/app/utils/analytics';
import {
    challengerDays, ledgerDays, publishedDays, trimHorizon,
    type ChartDay, type Horizon, type ModelId,
} from '@/app/utils/model_series';

export * from '@/app/utils/model_series';

export interface ModelForecast {
    days: ChartDay[];
    issuedAt: string | null;
    source: string;
    published: boolean;
    isLoading: boolean;
    error: unknown;
}

const isBenchmark = (m: ModelId): m is 'hybrid' | 'ar1' | 'naive' =>
    m === 'hybrid' || m === 'ar1' || m === 'naive';

/**
 * Loads only the surface the selected model needs. The challenger payload is
 * ~100 KB and a ledger batch larger, so neither is fetched until selected.
 */
export function useModelForecast(model: ModelId, horizon: Horizon, payload: AnalyticsPayload): ModelForecast {
    const benchmark = isBenchmark(model);
    const list = useQuery({
        queryKey: ['analytics', 'model-forecast', 'batches'],
        queryFn: () => ledgerBatches('', 'all', 0),
        enabled: benchmark,
        staleTime: 60_000,
        retry: 1,
    });
    const batchId = useMemo(() => {
        const rows = list.data?.batches ?? [];
        return (rows.find((b) => b.status === 'published') ?? rows[0])?.id ?? '';
    }, [list.data]);
    const batch = useQuery({
        queryKey: ['analytics', 'model-forecast', 'batch', batchId],
        queryFn: () => ledgerBatch(batchId),
        enabled: benchmark && !!batchId,
        staleTime: 60_000,
        retry: 1,
    });
    const challenger = useQuery({
        queryKey: ['analytics', 'model-forecast', 'challenger'],
        queryFn: () => ledgerChallenger(''),
        enabled: model === 'event_ar',
        staleTime: 60_000,
        retry: 1,
    });

    const all = useMemo<ChartDay[]>(() => {
        if (model === 'published') return publishedDays(payload);
        if (model === 'event_ar') return challengerDays(challenger.data);
        if (benchmark) return ledgerDays(batch.data, model);
        return [];
    }, [model, payload, challenger.data, batch.data, benchmark]);

    const anchor = model === 'published' ? payload.forecast?.start : all[0]?.date;
    const days = useMemo(() => trimHorizon(all, horizon, anchor), [all, horizon, anchor]);

    const issuedAt = model === 'published'
        ? payload.meta?.generatedAt ?? null
        : model === 'event_ar'
            ? challenger.data?.latest?.publishedAt ?? null
            : batch.data?.publishedAt ?? null;

    const source = model === 'published'
        ? 'production analytics run'
        : model === 'event_ar'
            ? 'ledger challenger archive'
            : 'forecast ledger, latest published batch';

    const active = model === 'published' ? null : model === 'event_ar' ? challenger : batch;
    return {
        days,
        issuedAt,
        source,
        published: model === 'published',
        isLoading: active?.isLoading ?? false,
        error: active?.error ?? null,
    };
}
