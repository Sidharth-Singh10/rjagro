/**
 * The analytics payload and the two ways to get it.
 *
 * `NEXT_PUBLIC_ANALYTICS_SOURCE=api` reads the latest pipeline run from the
 * backend; anything else reads the bundled export committed to the repo, so the
 * app still works offline and a broken backend cannot blank the page.
 */
import api from './api';
import bundled from '../data/price_forecast.json';

export type Reliability = 'A' | 'B' | 'C' | 'D' | 'E';

export interface Conclusion {
    id: string;
    kind: 'finding' | 'caveat' | 'method';
    text: string;
    refs: string[];
}

export interface EventEstimate {
    id: string;
    name: string;
    category: string;
    hypothesis: 'positive' | 'negative' | 'mixed';
    occurrences: number;
    observedDays: number;
    observedPrice: number | null;
    baselinePrice: number | null;
    rawPct: number | null;
    rawLo95: number | null;
    rawHi95: number | null;
    pooledPct: number;
    pooledLo80: number;
    pooledHi80: number;
    reliability: Reliability;
    note: string | null;
}

export interface CategoryEstimate {
    category: string;
    occurrences: number;
    rawPct: number;
    pooledPct: number;
    lo95: number;
    hi95: number;
}

export interface DailyRow {
    date: string;
    forecast: number;
    baseline: number;
    impactPct: number;
    lo80: number;
    hi80: number;
    lo95: number;
    hi95: number;
    events: string[];
    grade: Reliability;
}

export interface EventOccurrence {
    id: string;
    name: string;
    category: string;
    start: string;
    end: string;
    days: number;
    mean: number;
    baseline: number;
    impactPct: number;
    impactLo80: number;
    impactHi80: number;
    reliability: Reliability;
    occurrences: number;
    overlaps: string[];
}

export interface ModelScore {
    model: string;
    n: number;
    mae: number;
    rmse: number;
    smape: number;
    bias: number;
    biasPct: number;
}

export interface AnalyticsPayload {
    schema: number;
    meta: {
        runId: string;
        generatedAt: string;
        dataThrough: string;
        datasetHash: string;
        configHash: string;
        model: string;
        market: string;
        unit: string;
        priceDefinition: string;
        source: { kind: string; path?: string; table?: string };
    };
    data: {
        observations: number;
        first: string;
        last: string;
        spanDays: number;
        missingDays: number;
        missingPct: number;
        gapRuns: number;
        longestGap: number;
        mean: number;
        median: number;
        min: number;
        max: number;
        unchangedPct: number;
        dailyChangeSdPct: number;
    };
    events: { items: EventEstimate[]; categories: CategoryEstimate[] };
    forecast: {
        start: string;
        end: string;
        days: number;
        first: number;
        lastCentral: number;
        lastBaseline: number;
        lastLo95: number;
        lastHi95: number;
        peak: { date: string; value: number };
        trough: { date: string; value: number };
        deepestEventDay: { date: string; value: number; impactPct: number; events: string[] };
        eventDays: number;
        daily: DailyRow[];
        monthly: Array<{ month: string; forecast: number; baseline: number }>;
        eventOccurrences: EventOccurrence[];
    };
    validation: {
        models: ModelScore[];
        byHorizon: Array<{ model: string; bucket: string; smape: number }>;
        eventWindow: Array<{ model: string; eventWindow: boolean; smape: number; n: number }>;
        selected: string;
        smape1to7: number;
        smape8to28: number;
        smape29to90: number;
        sigma: { sigma0: number; power: number; anchors: Record<string, number> };
        yoySd: number;
    };
    conclusions: Conclusion[];
}

export const bundledPayload = bundled as unknown as AnalyticsPayload;

/**
 * A payload the app can render. Guards against two things that have bitten
 * before: an API run written by an older pipeline, and a bundled export that
 * shipped before the current schema.
 */
export const isPayload = (value: any): value is AnalyticsPayload =>
    !!value
    && value.schema === 2
    && Array.isArray(value?.forecast?.daily)
    && !!value?.forecast?.daily?.length
    && Array.isArray(value?.events?.items)
    && Array.isArray(value?.conclusions);

export const analyticsSource =
    process.env.NEXT_PUBLIC_ANALYTICS_SOURCE === 'api' ? 'api' : 'json';

export const analyticsIsLive = analyticsSource === 'api';

/** Latest payload: the API when configured, the bundled export otherwise. */
export async function fetchPayload(): Promise<AnalyticsPayload> {
    if (!analyticsIsLive) return bundledPayload;
    const { data } = await api.get('/analytics/forecast');
    const payload = data?.payload ?? data;
    if (!isPayload(payload)) {
        throw new Error(`analytics payload is not schema 2 (got ${payload?.schema ?? 'none'})`);
    }
    return payload;
}

// ---------------------------------------------------------------------------
// prices
// ---------------------------------------------------------------------------
export interface PriceRow {
    date: string;
    price: number;
    quoteSource?: string;
    note?: string | null;
}

export interface PriceResponse {
    prices: PriceRow[];
    coverage: { quoted: number; from?: string; to?: string; missingDays?: number };
}

export async function fetchPrices(from: string, to: string): Promise<PriceResponse> {
    const { data } = await api.get('/analytics/prices', { params: { from, to } });
    return {
        prices: (data?.prices ?? []).map((r: any) => ({
            date: String(r.date).slice(0, 10),
            price: Number(r.price),
            quoteSource: r.quote_source ?? r.quoteSource,
            note: r.note ?? null,
        })),
        coverage: data?.coverage ?? { quoted: 0 },
    };
}

export async function savePrices(rows: PriceRow[]): Promise<{ run?: { id: string; status: string } }> {
    const { data } = await api.post('/analytics/prices/import', {
        prices: rows.map((r) => ({ date: r.date, price: r.price, note: r.note ?? null })),
    });
    return data ?? {};
}

export async function savePrice(date: string, price: number, note?: string) {
    const { data } = await api.put(`/analytics/prices/${date}`, { price, note: note ?? null });
    return data;
}

export async function deletePrice(date: string) {
    const { data } = await api.delete(`/analytics/prices/${date}`);
    return data;
}

export interface RunStatus {
    id: string | null;
    status: 'idle' | 'queued' | 'running' | 'succeeded' | 'failed';
    requestedAt?: string | null;
    startedAt?: string | null;
    finishedAt?: string | null;
    error?: string | null;
    model?: string | null;
}

export async function fetchStatus(): Promise<RunStatus> {
    const { data } = await api.get('/analytics/status');
    if (!data || data.status === 'empty' || !data.status) {
        return { id: null, status: 'idle', finishedAt: null };
    }
    return data as RunStatus;
}

export async function recompute(): Promise<RunStatus> {
    const { data } = await api.post('/analytics/recompute');
    return data ?? { id: null, status: 'queued' };
}

// ---------------------------------------------------------------------------
// formatting
// ---------------------------------------------------------------------------
export const formatPct = (value: number | null | undefined, digits = 1): string => {
    if (value === null || value === undefined || Number.isNaN(value)) return '—';
    const sign = value > 0 ? '+' : value < 0 ? '−' : '';
    return `${sign}${Math.abs(value).toFixed(digits)}%`;
};

export const formatInr = (value: number | null | undefined, digits = 1): string =>
    value === null || value === undefined || Number.isNaN(value)
        ? '—'
        : `₹${value.toLocaleString('en-IN', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;

const dateFmt = new Intl.DateTimeFormat('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
});
const monthFmt = new Intl.DateTimeFormat('en-IN', { month: 'short', timeZone: 'UTC' });

const asUtc = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d));
};

/** `2026-10-29T...` or `2026-10-29` -> display date. */
export const formatDate = (iso: string): string => dateFmt.format(asUtc(String(iso).slice(0, 10)));

export const formatMonth = (key: string): string => {
    const [y, m] = key.split('-').map(Number);
    return `${monthFmt.format(new Date(Date.UTC(y, m - 1, 1)))} ${y}`;
};

export const formatRange = (start: string, end: string): string => {
    if (start === end) return formatDate(start);
    const a = asUtc(start);
    const b = asUtc(end);
    const sameMonth = start.slice(0, 7) === end.slice(0, 7);
    if (sameMonth) return `${a.getUTCDate()}–${b.getUTCDate()} ${monthFmt.format(a)} ${b.getUTCFullYear()}`;
    return `${formatDate(start)} – ${formatDate(end)}`;
};

export const RELIABILITY_MEANING: Record<Reliability, string> = {
    A: '8+ occurrences and 30+ quoted days',
    B: '4+ occurrences and 15+ quoted days',
    C: '2+ occurrences and 5+ quoted days',
    D: 'one occurrence or fewer than 5 days',
    E: 'no usable quote — category prior only',
};

export const reliabilityStyle = (grade: Reliability) => {
    switch (grade) {
        case 'A': return { text: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', dot: '#16a34a' };
        case 'B': return { text: 'text-teal-700', bg: 'bg-teal-50', border: 'border-teal-200', dot: '#0d9488' };
        case 'C': return { text: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', dot: '#a6761a' };
        case 'D': return { text: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200', dot: '#b3702e' };
        default: return { text: 'text-gray-500', bg: 'bg-gray-50', border: 'border-gray-200', dot: '#94a3b8' };
    }
};

export const categoryColor: Record<string, string> = {
    festival: '#6f6a9e',
    observance: '#2e8b64',
    islamic: '#b3702e',
    wedding: '#a6761a',
    fair: '#94a3b8',
    seasonal: '#3d7ea6',
};

export const eventName = (payload: AnalyticsPayload | undefined, id: string): string =>
    payload?.events?.items?.find((e) => e.id === id)?.name ?? id;
