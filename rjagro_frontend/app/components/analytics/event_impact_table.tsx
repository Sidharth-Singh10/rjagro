'use client'
import { Fragment, memo, useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { formatEventRange } from '@/app/utils/event_calendar';
import {
    benchmarkScope, directionArrow, formatDelta, formatPValue, ordinal,
    verdictLabel, verdictMark, verdictShortLabel,
    type EventImpact, type ImpactVerdict,
} from '@/app/utils/event_price_impact';

const assumedLabel: Record<EventImpact['event']['impact'], string> = {
    positive: 'Uptick',
    negative: 'Downturn',
    mixed: 'Mixed',
    unknown: 'Unknown',
};

const assumedArrow: Record<EventImpact['event']['impact'], string> = {
    positive: '↑',
    negative: '↓',
    mixed: '~',
    unknown: '?',
};

const verdictRank: Record<ImpactVerdict, number> = {
    consistent: 0,
    contradicted: 1,
    fragile: 2,
    notable: 3,
    typical: 4,
    insufficient: 5,
    pending: 6,
};

const verdictClass: Record<ImpactVerdict, string> = {
    consistent: 'text-emerald-700',
    contradicted: 'text-red-700',
    fragile: 'text-amber-700',
    notable: 'text-sky-700',
    typical: 'text-gray-500',
    insufficient: 'text-gray-500',
    pending: 'text-gray-400',
};

type SortKey = 'date' | 'delta' | 'verdict';

export const EventImpactTable = memo(({ impacts }: { impacts: EventImpact[] }) => {
    const [includePending, setIncludePending] = useState(false);
    const [sortKey, setSortKey] = useState<SortKey>('date');
    const [ascending, setAscending] = useState(true);
    const [expanded, setExpanded] = useState<string | null>(null);

    const rows = useMemo(() => {
        const base = impacts.filter((row) => includePending || row.observable);
        const sorted = [...base].sort((a, b) => {
            if (sortKey === 'delta') {
                const left = a.deltaPct ?? Number.POSITIVE_INFINITY;
                const right = b.deltaPct ?? Number.POSITIVE_INFINITY;
                return left - right;
            }
            if (sortKey === 'verdict') {
                return verdictRank[a.verdict] - verdictRank[b.verdict];
            }
            return a.event.startDate.localeCompare(b.event.startDate);
        });
        return ascending ? sorted : sorted.reverse();
    }, [impacts, includePending, sortKey, ascending]);

    const onSort = (key: SortKey) => {
        if (key === sortKey) {
            setAscending((value) => !value);
            return;
        }
        setSortKey(key);
        setAscending(true);
    };

    return (
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                    <h4 className="text-sm font-semibold text-gray-700">How each label was calculated</h4>
                    <p className="mt-0.5 text-[11px] text-gray-500">
                        Average during the event vs the equal window before it, then ranked against every other window
                        of the same length nearby. Expand a row for the exact windows and arithmetic.
                    </p>
                </div>
                <label className="inline-flex cursor-pointer items-center gap-1.5 text-[11px] text-gray-600">
                    <input
                        type="checkbox"
                        checked={includePending}
                        onChange={(event) => setIncludePending(event.target.checked)}
                        className="h-3.5 w-3.5 rounded border-gray-300 text-green-600 focus:ring-green-600"
                    />
                    Include future events
                </label>
            </div>

            <div className="max-h-[440px] overflow-auto rounded-lg border border-gray-100">
                <table className="w-full min-w-[780px] border-collapse text-left text-xs">
                    <thead className="sticky top-0 z-10 bg-gray-50 text-[10px] uppercase tracking-wide text-gray-500">
                        <tr>
                            <th className="px-3 py-2 font-medium" aria-sort={sortKey === 'date' ? (ascending ? 'ascending' : 'descending') : 'none'}>
                                <button type="button" onClick={() => onSort('date')} className="hover:text-gray-800">
                                    Dates
                                </button>
                            </th>
                            <th className="px-3 py-2 font-medium">Event</th>
                            <th className="whitespace-nowrap px-3 py-2 font-medium">Assumed</th>
                            <th className="px-3 py-2 text-right font-medium" aria-sort={sortKey === 'delta' ? (ascending ? 'ascending' : 'descending') : 'none'}>
                                <button type="button" onClick={() => onSort('delta')} className="hover:text-gray-800">
                                    Change
                                </button>
                            </th>
                            <th className="px-3 py-2 font-medium" aria-sort={sortKey === 'verdict' ? (ascending ? 'ascending' : 'descending') : 'none'}>
                                <button type="button" onClick={() => onSort('verdict')} className="hover:text-gray-800">
                                    Verdict
                                </button>
                            </th>
                            <th className="px-3 py-2 text-right font-medium">Pre avg</th>
                            <th className="px-3 py-2 text-right font-medium">During avg</th>
                            <th className="w-8 px-2 py-2" aria-label="Expand" />
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row) => {
                            const open = expanded === row.id;
                            return (
                                <Fragment key={row.id}>
                                    <tr
                                        className="border-t border-gray-100 align-top hover:bg-gray-50/60"
                                    >
                                        <td className="whitespace-nowrap px-3 py-2 text-gray-600">
                                            <span className="block">{formatEventRange(row.event.startDate, row.event.endDate)}</span>
                                            <span className="text-[10px] text-gray-400">{row.durationDays}d window {row.windowDays}d</span>
                                        </td>
                                        <td className="px-3 py-2 text-gray-800">{row.event.name}</td>
                                        <td className="whitespace-nowrap px-3 py-2 text-gray-600">
                                            {assumedLabel[row.event.impact]} {assumedArrow[row.event.impact]}
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums font-medium text-gray-800">
                                            {row.deltaPct === null
                                                ? '—'
                                                : `${directionArrow[row.direction]} ${formatDelta(row.deltaPct)}`}
                                        </td>
                                        <td
                                            className={`whitespace-nowrap px-3 py-2 font-medium ${verdictClass[row.verdict]}`}
                                            title={verdictLabel[row.verdict]}
                                        >
                                            <span className="block">
                                                <span aria-hidden>{verdictMark[row.verdict]}</span> {verdictShortLabel[row.verdict]}
                                            </span>
                                            {row.benchmark !== null && (
                                                <span className="block text-[10px] font-normal text-gray-400">
                                                    {ordinal(row.benchmark.percentile)} percentile
                                                </span>
                                            )}
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-gray-700">
                                            {row.pre.average === null ? '—' : `₹${row.pre.average.toFixed(2)}`}
                                            <span className="ml-1 text-[10px] text-gray-400">({row.pre.quotes})</span>
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-gray-700">
                                            {row.during.average === null ? '—' : `₹${row.during.average.toFixed(2)}`}
                                            <span className="ml-1 text-[10px] text-gray-400">({row.during.quotes})</span>
                                        </td>
                                        <td className="px-2 py-2">
                                            <button
                                                type="button"
                                                onClick={() => setExpanded(open ? null : row.id)}
                                                aria-expanded={open}
                                                aria-label={`${open ? 'Hide' : 'Show'} calculation for ${row.event.name}`}
                                                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
                                            >
                                                <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
                                            </button>
                                        </td>
                                    </tr>
                                    {open && (
                                        <tr key={`${row.id}-detail`} className="border-t border-gray-100 bg-gray-50/70">
                                            <td colSpan={8} className="px-4 py-3 text-[11px] leading-relaxed text-gray-600">
                                                <div className="sticky left-0 max-w-[600px]">
                                                    <p>
                                                        <span className="font-medium text-gray-700">Pre window</span>{' '}
                                                        {formatEventRange(row.pre.from, row.pre.to)} · {row.pre.quotes} quoted day{row.pre.quotes === 1 ? '' : 's'}
                                                        {row.pre.average !== null ? ` · average ₹${row.pre.average.toFixed(2)}` : ''}
                                                    </p>
                                                    <p>
                                                        <span className="font-medium text-gray-700">During window</span>{' '}
                                                        {formatEventRange(row.during.from, row.during.to)} · {row.during.quotes} quoted day{row.during.quotes === 1 ? '' : 's'}
                                                        {row.during.average !== null ? ` · average ₹${row.during.average.toFixed(2)}` : ''}
                                                    </p>
                                                    {row.reason !== null ? (
                                                        <p className="mt-1">{row.reason}</p>
                                                    ) : (
                                                        <>
                                                            <p className="mt-1">
                                                                <span className="font-medium text-gray-700">Raw change</span>{' '}
                                                                ({row.during.average?.toFixed(2)} − {row.pre.average?.toFixed(2)}) ÷ {row.pre.average?.toFixed(2)} ={' '}
                                                                {formatDelta(row.deltaPct)}.
                                                            </p>
                                                            <p>
                                                                <span className="font-medium text-gray-700">Move vs the pre-window trend</span>{' '}
                                                                {formatDelta(row.trendPct)} over {row.trendQuotes} quotes
                                                                {row.benchmark !== null && (
                                                                    <>
                                                                        {' · '}ranked against {benchmarkScope(row.benchmark)}: {ordinal(row.benchmark.percentile)} percentile,
                                                                        p = {formatPValue(row.benchmark.p)}
                                                                    </>
                                                                )}.
                                                            </p>
                                                            {row.stability !== null && (
                                                                <p>
                                                                    <span className="font-medium text-gray-700">Baseline shift</span>{' '}
                                                                    starting the pre-window up to {row.stability.shifts - 1} days earlier gives{' '}
                                                                    {formatDelta(row.stability.min)} to {formatDelta(row.stability.max)}
                                                                    {row.stability.stable ? '' : ' — the sign depends on that choice'}.
                                                                </p>
                                                            )}
                                                            {row.qValue !== null && (
                                                                <p className="text-gray-500">
                                                                    q = {formatPValue(row.qValue)} after Benjamini–Hochberg across the testable rows.
                                                                </p>
                                                            )}
                                                            <p className="mt-1">
                                                                Assumed {assumedLabel[row.event.impact].toLowerCase()}; {verdictLabel[row.verdict].toLowerCase()}.
                                                            </p>
                                                        </>
                                                    )}
                                                    {row.confounders.length > 0 && (
                                                        <p className="mt-1 text-gray-500">
                                                            <span className="font-medium text-gray-600">Also in these windows:</span>{' '}
                                                            {row.confounders.map((item) => item.name).join(', ')} — the move may reflect these too.
                                                        </p>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <p className="mt-2 text-[10px] text-gray-400">
                Rates are ₹/kg. Only quoted days are counted; a side with fewer than four days before, or three during,
                is reported as “not enough data”. A move is called unusual only when it beats 95% of comparable windows
                (p ≤ 0.05); co-movement is not causation.
            </p>
        </div>
    );
});
EventImpactTable.displayName = 'EventImpactTable';
