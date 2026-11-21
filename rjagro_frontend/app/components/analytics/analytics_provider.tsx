'use client'
import { createContext, useCallback, useContext, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ratePoints } from '@/app/utils/rate_tracker';
import {
    analyticsIsLive, bundledPayload, fetchPayload, fetchPrices, formatDate, isPayload,
    type AnalyticsPayload,
} from '@/app/utils/analytics';

interface AnalyticsState {
    payload: AnalyticsPayload;
    /** Observed prices near the forecast start, for the chart join. */
    history: Array<{ date: string; price: number }>;
    /** The full observed series, so the monthly and weekly charts stay in step. */
    points: Array<{ date: string; rate: number }>;
    live: boolean;
    /** True when the observed quotes came from the API rather than the bundle. */
    historyLive: boolean;
    historyError: Error | null;
    refetch: () => void;
    isLoading: boolean;
    error: Error | null;
}

const Ctx = createContext<AnalyticsState | null>(null);

const bundledHistory = () => ratePoints.map((p) => ({ date: p.date, price: p.rate }));

export const AnalyticsProvider = ({ children }: { children: React.ReactNode }) => {
    const query = useQuery({
        queryKey: ['analytics', 'payload'],
        queryFn: fetchPayload,
        enabled: analyticsIsLive,
        staleTime: 30_000,
        refetchOnWindowFocus: true,
    });

    // never hand a component something it cannot render: an older run or a
    // stale bundle falls back to the bundled export, and if that is also
    // unusable the page says so instead of throwing
    const candidate = analyticsIsLive ? query.data : bundledPayload;
    const payload = isPayload(candidate) ? candidate : bundledPayload;
    const payloadProblem = !isPayload(payload)
        ? 'This build shipped a price_forecast.json the app cannot read. Run the pipeline and redeploy.'
        : null;

    // Waiting for the live payload matters: the first render still holds the
    // bundled fallback, so fetching now would request the bundled date range.
    // The range is in the key so a later payload resolves to a fresh fetch
    // instead of reusing a cached response for a different window.
    const prices = useQuery({
        queryKey: ['analytics', 'all-prices', payload.data.first, payload.meta.dataThrough],
        queryFn: () => fetchPrices(payload.data.first, payload.meta.dataThrough),
        enabled: analyticsIsLive && !!query.data,
        staleTime: 30_000,
    });

    const points = useMemo(
        () => (analyticsIsLive && prices.data
            ? prices.data.prices.map((p) => ({ date: p.date, rate: p.price }))
            : ratePoints),
        [prices.data],
    );

    const history = useMemo(
        () => (analyticsIsLive ? points.map((p) => ({ date: p.date, price: p.rate })) : bundledHistory()),
        [points],
    );

    // Distinguishes "observed quotes are live" from "we fell back to the bundle",
    // so the chart can say so instead of quietly drawing stale history.
    const historyLive = analyticsIsLive && !!prices.data;
    const historyError = (prices.error as Error) ?? null;
    const queryLoading = query.isLoading;
    const payloadError = useMemo(
        () => (query.error as Error) ?? (payloadProblem ? new Error(payloadProblem) : null),
        [query.error, payloadProblem],
    );
    const queryRefetch = query.refetch;
    const refetch = useCallback(() => { void queryRefetch(); }, [queryRefetch]);

    const value = useMemo<AnalyticsState>(() => ({
        payload,
        history,
        points,
        live: analyticsIsLive,
        historyLive,
        historyError,
        refetch,
        isLoading: analyticsIsLive && queryLoading,
        error: payloadError,
    }), [payload, history, points, historyLive, historyError, refetch, queryLoading, payloadError]);

    return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useAnalytics = (): AnalyticsState => {
    const ctx = useContext(Ctx);
    if (!ctx) throw new Error('useAnalytics must be used inside AnalyticsProvider');
    return ctx;
};

export const Provenance = () => {
    const { payload, live, isLoading, error } = useAnalytics();
    const m = payload.meta;
    return (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-gray-500">
            <span className={`h-1.5 w-1.5 rounded-full ${live ? 'bg-emerald-500' : 'bg-amber-500'}`} aria-hidden />
            <span>
                {live ? 'live run' : 'bundled export'} · {m.model} · generated{' '}
                {formatDate(m.generatedAt)}
            </span>
            <span className="text-gray-300">·</span>
            <span>data through {formatDate(m.dataThrough)}</span>
            {isLoading && <span className="text-gray-400">· refreshing…</span>}
            {error && <span className="text-red-600">· {error.message}</span>}
        </div>
    );
};
