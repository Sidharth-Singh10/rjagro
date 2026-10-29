'use client'
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Check, ChevronLeft, ChevronRight, Loader2, RotateCw } from 'lucide-react';
import {
    analyticsIsLive, fetchPrices, fetchStatus, formatDate, formatInr, formatMonth,
    savePrices, type PriceRow,
} from '@/app/utils/analytics';
import { ratePoints } from '@/app/utils/rate_tracker';
import { useAnalytics } from './analytics_provider';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const TODAY = new Date();
const TODAY_ISO = `${TODAY.getFullYear()}-${String(TODAY.getMonth() + 1).padStart(2, '0')}-${String(TODAY.getDate()).padStart(2, '0')}`;

const iso = (y: number, m: number, d: number) =>
    `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

const monthRange = (y: number, m: number) => ({
    from: iso(y, m, 1),
    to: iso(y, m, new Date(Date.UTC(y, m + 1, 0)).getUTCDate()),
});

type Edits = Record<string, number>;

const bundledMap = () => {
    const map = new Map<string, number>();
    for (const p of ratePoints) map.set(p.date, p.rate);
    return map;
};

export const PricesCalendar = () => {
    const { payload, live, refetch } = useAnalytics();
    const qc = useQueryClient();

    const lastMonth = useMemo(() => {
        const last = new Date(`${payload.meta.dataThrough}T00:00:00Z`);
        return { y: last.getUTCFullYear(), m: last.getUTCMonth() };
    }, [payload.meta.dataThrough]);

    const [cursor, setCursor] = useState(lastMonth);
    const [edits, setEdits] = useState<Edits>({});
    const [draft, setDraft] = useState<{ date: string; value: string } | null>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const range = monthRange(cursor.y, cursor.m);

    const priceQuery = useQuery({
        queryKey: ['analytics', 'prices', range.from, range.to],
        queryFn: () => fetchPrices(range.from, range.to),
        enabled: analyticsIsLive,
        staleTime: 15_000,
    });

    const statusQuery = useQuery({
        queryKey: ['analytics', 'status'],
        queryFn: fetchStatus,
        enabled: analyticsIsLive,
        refetchInterval: (q) => {
            const s = q.state.data?.status;
            return s === 'queued' || s === 'running' ? 2000 : false;
        },
    });

    // when a run finishes, pull the new numbers
    const status = statusQuery.data;
    useEffect(() => {
        if (status?.status === 'succeeded') {
            void qc.invalidateQueries({ queryKey: ['analytics', 'payload'] });
            void qc.invalidateQueries({ queryKey: ['analytics', 'prices'] });
        }
    }, [status?.status, status?.finishedAt, qc]);

    const priceMap = useMemo(() => {
        if (!analyticsIsLive) return bundledMap();
        const map = new Map<string, number>();
        for (const row of priceQuery.data?.prices ?? []) map.set(row.date, row.price);
        return map;
    }, [priceQuery.data]);

    const dirtyCount = Object.keys(edits).length;
    const daysInMonth = new Date(Date.UTC(cursor.y, cursor.m + 1, 0)).getUTCDate();
    const firstWeekday = (new Date(Date.UTC(cursor.y, cursor.m, 1)).getUTCDay() + 6) % 7;

    const move = (delta: number) => {
        setCursor((c) => {
            const d = new Date(Date.UTC(c.y, c.m + delta, 1));
            return { y: d.getUTCFullYear(), m: d.getUTCMonth() };
        });
    };

    const commitDraft = useCallback(() => {
        if (!draft) return;
        const raw = draft.value.trim();
        if (raw === '') {
            setDraft(null);
            return;
        }
        const value = Number(raw);
        if (!Number.isFinite(value) || value <= 0 || value > 10000) {
            setError('Price must be between 0 and 10,000 INR/kg');
            return;
        }
        setEdits((e) => ({ ...e, [draft.date]: value }));
        setDraft(null);
        setError(null);
    }, [draft]);

    const save = async () => {
        if (!analyticsIsLive) {
            setError('Editing needs the live pipeline (NEXT_PUBLIC_ANALYTICS_SOURCE=api).');
            return;
        }
        setSaving(true);
        setError(null);
        try {
            const rows: PriceRow[] = Object.entries(edits).map(([date, price]) => ({ date, price }));
            await savePrices(rows);
            setEdits({});
            await qc.invalidateQueries({ queryKey: ['analytics', 'status'] });
            refetch();
        } catch (e: any) {
            setError(e?.message ?? 'Could not save');
        } finally {
            setSaving(false);
        }
    };

    const statusPill = () => {
        if (!live) {
            return (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] text-amber-700">
                    bundled export · read only
                </span>
            );
        }
        const s = status?.status ?? 'idle';
        if (s === 'queued' || s === 'running') {
            return (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] text-sky-700">
                    <Loader2 size={11} className="animate-spin" />
                    {s === 'queued' ? 'queued' : 'recomputing'} · every number follows
                </span>
            );
        }
        if (s === 'failed') {
            return (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] text-red-700">
                    <AlertCircle size={11} /> last run failed
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] text-emerald-700">
                <Check size={11} />
                {status?.finishedAt ? `updated ${formatDate(status.finishedAt.slice(0, 10))}` : 'up to date'}
            </span>
        );
    };

    return (
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div>
                    <h3 className="text-sm font-semibold text-gray-700">Price history</h3>
                    <p className="mt-0.5 max-w-2xl text-[11px] text-gray-500">
                        Click any day to correct or add a quote. Saving re-runs the whole pipeline — event
                        estimates, backtest, forecast, conclusions — and the numbers below update themselves.
                        A blank day means no quote; it is never read as zero.
                    </p>
                </div>
                <div className="flex items-center gap-2">{statusPill()}</div>
            </div>

            <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        onClick={() => move(-1)}
                        className="rounded-md p-1.5 text-gray-500 hover:bg-gray-50"
                        aria-label="Previous month"
                    >
                        <ChevronLeft size={16} />
                    </button>
                    <span className="min-w-[110px] text-center text-xs font-medium text-gray-700">
                        {formatMonth(`${cursor.y}-${String(cursor.m + 1).padStart(2, '0')}`)}
                    </span>
                    <button
                        type="button"
                        onClick={() => move(1)}
                        className="rounded-md p-1.5 text-gray-500 hover:bg-gray-50"
                        aria-label="Next month"
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-gray-500">
                    <span className="inline-flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> quoted
                    </span>
                    <span className="inline-flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-gray-200" /> no quote
                    </span>
                    <span className="inline-flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> unsaved
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-7 gap-1 text-[10px] uppercase tracking-wide text-gray-400">
                {WEEKDAYS.map((d) => <div key={d} className="px-1 pb-1">{d}</div>)}
            </div>

            <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: firstWeekday }).map((_, i) => <div key={`pad-${i}`} />)}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const date = iso(cursor.y, cursor.m, day);
                    const isFuture = date > TODAY_ISO;
                    const edited = edits[date];
                    const price = edited ?? priceMap.get(date);
                    const isToday = date === TODAY_ISO;
                    const editing = draft?.date === date;

                    return (
                        <button
                            key={date}
                            type="button"
                            disabled={isFuture || !live}
                            onClick={() => setDraft({ date, value: price ? String(price) : '' })}
                            className={[
                                'relative flex h-[58px] flex-col items-start justify-between rounded-lg border px-2 py-1.5 text-left transition',
                                edited !== undefined
                                    ? 'border-amber-300 bg-amber-50'
                                    : price !== undefined
                                        ? 'border-gray-100 bg-white hover:border-gray-300'
                                        : 'border-dashed border-gray-200 bg-gray-50/60 hover:border-gray-300',
                                isFuture ? 'cursor-default opacity-40' : '',
                                isToday ? 'ring-1 ring-emerald-300' : '',
                            ].join(' ')}
                        >
                            <span className={`text-[10px] ${isToday ? 'font-semibold text-emerald-700' : 'text-gray-400'}`}>
                                {day}
                            </span>
                            {editing ? (
                                <input
                                    autoFocus
                                    type="number"
                                    inputMode="decimal"
                                    defaultValue={draft.value}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) => setDraft({ date, value: e.target.value })}
                                    onBlur={commitDraft}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') commitDraft();
                                        if (e.key === 'Escape') setDraft(null);
                                    }}
                                    className="w-full rounded border border-gray-300 px-1 py-0.5 text-[11px] tabular-nums focus:border-gray-500 focus:outline-none"
                                />
                            ) : (
                                <span className={`text-[11px] tabular-nums ${price !== undefined ? 'font-medium text-gray-700' : 'text-gray-300'}`}>
                                    {price !== undefined ? `₹${price}` : '—'}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {error && (
                <p className="mt-3 flex items-center gap-1.5 text-[11px] text-red-600">
                    <AlertCircle size={12} /> {error}
                </p>
            )}

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3">
                <p className="text-[11px] text-gray-400">
                    {dirtyCount === 0
                        ? `${payload.data.observations} quoted days · ${payload.data.missingDays} blank (${payload.data.missingPct}%) · last ${formatDate(payload.data.last)}`
                        : `${dirtyCount} unsaved ${dirtyCount === 1 ? 'change' : 'changes'}`}
                </p>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setEdits({})}
                        disabled={dirtyCount === 0 || saving}
                        className="rounded-md border border-gray-200 px-3 py-1.5 text-[11px] text-gray-600 disabled:opacity-40"
                    >
                        Discard
                    </button>
                    <button
                        type="button"
                        onClick={save}
                        disabled={dirtyCount === 0 || saving}
                        className="inline-flex items-center gap-1.5 rounded-md bg-gray-900 px-3 py-1.5 text-[11px] font-medium text-white disabled:opacity-40"
                    >
                        {saving ? <Loader2 size={12} className="animate-spin" /> : <RotateCw size={12} />}
                        Save &amp; recompute
                    </button>
                </div>
            </div>

            {live && status?.error && status.status === 'failed' && (
                <pre className="mt-3 max-h-32 overflow-auto rounded-md bg-red-50 p-2 text-[10px] leading-relaxed text-red-700">
                    {status.error}
                </pre>
            )}
        </div>
    );
};

PricesCalendar.displayName = 'PricesCalendar';
