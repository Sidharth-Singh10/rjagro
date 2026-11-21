/**
 * Pure adapters for the Analytics model picker.
 *
 * The three forecast surfaces (production payload, ledger cohort, challenger
 * archive) have different shapes and live behind different endpoints. They are
 * normalised here into one daily series. Nothing is recomputed: every number is
 * what the model actually issued.
 *
 * This module deliberately imports types only, so the check script can load it
 * in plain Node without pulling in the HTTP client.
 */
import type { AnalyticsPayload } from '@/app/utils/analytics';
import type { ChallengerEnvelope, LedgerBatch, LedgerModel } from '@/app/utils/forecast_ledger_types';

export type ModelId = 'published' | 'event_ar' | 'hybrid' | 'ar1' | 'naive';
export type Horizon = 30 | 90 | 180 | 'all';

export interface ModelOption {
    id: ModelId;
    label: string;
    role: 'published' | 'challenger' | 'benchmark';
    note: string;
}

/** Five options. `published` is the same equation as the ledger's `existing`,
 *  so the ledger duplicate is left out instead of shown twice. */
export const MODEL_OPTIONS: readonly ModelOption[] = [
    { id: 'published', label: 'Published forecast', role: 'published', note: 'anchor_events — what the app shows' },
    { id: 'event_ar', label: 'Event-aligned AR (new)', role: 'challenger', note: 'challenger — not the published forecast' },
    { id: 'hybrid', label: 'Frozen hybrid', role: 'benchmark', note: 'ledger benchmark' },
    { id: 'ar1', label: 'AR(1)', role: 'benchmark', note: 'ledger benchmark' },
    { id: 'naive', label: 'Last price', role: 'benchmark', note: 'no-change benchmark' },
];

export const HORIZONS: readonly { value: Horizon; label: string }[] = [
    { value: 30, label: '30 days' },
    { value: 90, label: '90 days' },
    { value: 180, label: '180 days' },
    { value: 'all', label: 'Through Dec 2027' },
];

export interface ChartDay {
    date: string;
    forecast: number;
    /** Only the published model exposes an event-off counterfactual. */
    baseline: number | null;
    lo80: number;
    hi80: number;
    lo95: number;
    hi95: number;
    /** Display names, so the tooltip reads the same for every model. */
    events?: string[];
}

const num = (v: unknown): number | null =>
    typeof v === 'number' && Number.isFinite(v) ? v : null;

const DAY = 86_400_000;

/** Mirrors `eventName` in analytics.ts; inlined to keep this module type-only. */
const displayName = (payload: AnalyticsPayload, id: string): string =>
    payload?.events?.items?.find((e) => e.id === id)?.name ?? id;

/** Keep the first `horizon` forecast days; 'all' keeps the full issued path. */
export function trimHorizon<T extends { date: string }>(days: T[], horizon: Horizon, anchor?: string): T[] {
    if (horizon === 'all' || days.length === 0) return days;
    const start = Date.parse(`${anchor ?? days[0].date}T00:00:00Z`);
    if (!Number.isFinite(start)) return days.slice(0, horizon);
    return days.filter((d) => (Date.parse(`${d.date}T00:00:00Z`) - start) / DAY < horizon);
}

export function publishedDays(payload: AnalyticsPayload): ChartDay[] {
    return (payload.forecast?.daily ?? []).flatMap((r) => {
        const forecast = num(r.forecast);
        const lo80 = num(r.lo80);
        const hi80 = num(r.hi80);
        const lo95 = num(r.lo95);
        const hi95 = num(r.hi95);
        if (forecast === null || lo80 === null || hi80 === null || lo95 === null || hi95 === null) return [];
        return [{
            date: r.date, forecast, baseline: num(r.baseline), lo80, hi80, lo95, hi95,
            events: (r.events ?? []).map((id) => displayName(payload, id)),
        }];
    });
}

export function challengerDays(envelope: ChallengerEnvelope | undefined): ChartDay[] {
    const challenger = envelope?.latest?.challenger;
    if (!challenger || challenger.status !== 'ready') return [];
    return challenger.daily.map((d) => ({
        date: d.date, forecast: d.prediction, baseline: null,
        lo80: d.lo80, hi80: d.hi80, lo95: d.lo95, hi95: d.hi95, events: [],
    }));
}

export function ledgerDays(batch: LedgerBatch | undefined, model: LedgerModel): ChartDay[] {
    if (!batch || batch.status !== 'published') return [];
    return batch.predictions
        .filter((p) => p.model === model)
        .sort((a, b) => a.date.localeCompare(b.date))
        .flatMap((p) => (p.lo80 === null || p.hi80 === null || p.lo95 === null || p.hi95 === null ? [] : [{
            date: p.date, forecast: p.prediction, baseline: null,
            lo80: p.lo80, hi80: p.hi80, lo95: p.lo95, hi95: p.hi95,
            events: p.events.map((e) => e.name),
        }]));
}
