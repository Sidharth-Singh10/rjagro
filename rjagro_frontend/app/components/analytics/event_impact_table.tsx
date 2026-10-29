'use client'
import { memo, useMemo, useState } from 'react';
import {
    RELIABILITY_MEANING, categoryColor, formatInr, formatPct, reliabilityStyle,
    type EventEstimate,
} from '@/app/utils/analytics';

const arrow: Record<EventEstimate['hypothesis'], string> = { positive: '↑', negative: '↓', mixed: '~' };
const arrowTitle: Record<EventEstimate['hypothesis'], string> = {
    positive: 'calendar expects higher prices',
    negative: 'calendar expects lower prices',
    mixed: 'direction not assumed',
};

type SortKey = 'pooled' | 'raw' | 'occurrences' | 'name';

export const EventImpactTable = memo(({ impacts }: { impacts: EventEstimate[] }) => {
    const [onlyEvidence, setOnlyEvidence] = useState(false);
    const [sortKey, setSortKey] = useState<SortKey>('pooled');

    const rows = useMemo(() => {
        const base = onlyEvidence ? impacts.filter((r) => r.occurrences > 0) : impacts;
        return [...base].sort((a, b) => {
            if (sortKey === 'name') return a.name.localeCompare(b.name);
            if (sortKey === 'occurrences') return b.occurrences - a.occurrences;
            if (sortKey === 'raw') return (b.rawPct ?? -99) - (a.rawPct ?? -99);
            return b.pooledPct - a.pooledPct;
        });
    }, [impacts, onlyEvidence, sortKey]);

    return (
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-sm font-semibold text-gray-700">Every event, with what the evidence supports</h4>
                <div className="flex flex-wrap items-center gap-2 text-[11px]">
                    <label className="inline-flex cursor-pointer items-center gap-1.5 text-gray-500">
                        <input
                            type="checkbox"
                            checked={onlyEvidence}
                            onChange={(e) => setOnlyEvidence(e.target.checked)}
                            className="h-3 w-3 rounded border-gray-300"
                        />
                        only events with quotes
                    </label>
                    <select
                        value={sortKey}
                        onChange={(e) => setSortKey(e.target.value as SortKey)}
                        className="rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] text-gray-600"
                        aria-label="Sort events"
                    >
                        <option value="pooled">sort by pooled effect</option>
                        <option value="raw">sort by raw effect</option>
                        <option value="occurrences">sort by occurrences</option>
                        <option value="name">sort by name</option>
                    </select>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                    <thead>
                        <tr className="border-b border-gray-100 text-[10px] uppercase tracking-wide text-gray-400">
                            <th className="py-2 pr-3 font-medium">Event</th>
                            <th className="py-2 pr-3 text-right font-medium">Occurrences</th>
                            <th className="py-2 pr-3 text-right font-medium">Days</th>
                            <th className="py-2 pr-3 text-right font-medium">Observed</th>
                            <th className="py-2 pr-3 text-right font-medium">Baseline</th>
                            <th className="py-2 pr-3 text-right font-medium">Raw</th>
                            <th className="py-2 pr-3 text-right font-medium">Pooled (80%)</th>
                            <th className="py-2 pr-1 text-right font-medium">Grade</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row) => {
                            const style = reliabilityStyle(row.reliability);
                            const tone = row.pooledPct > 0 ? 'text-emerald-700'
                                : row.pooledPct < 0 ? 'text-red-700' : 'text-gray-500';
                            return (
                                <tr key={row.id} className="border-b border-gray-50 last:border-0 align-top">
                                    <td className="py-2 pr-3">
                                        <div className="flex items-center gap-1.5">
                                            <span
                                                className="h-1.5 w-1.5 shrink-0 rounded-full"
                                                style={{ backgroundColor: categoryColor[row.category] ?? '#94a3b8' }}
                                            />
                                            <span className="text-gray-700">{row.name}</span>
                                            <span className="text-[10px] text-gray-400" title={arrowTitle[row.hypothesis]}>
                                                {arrow[row.hypothesis]}
                                            </span>
                                        </div>
                                        {row.occurrences === 0 && (
                                            <p className="mt-0.5 text-[10px] text-gray-400">
                                                no quotes in the window — category prior only
                                            </p>
                                        )}
                                    </td>
                                    <td className="py-2 pr-3 text-right tabular-nums text-gray-500">{row.occurrences}</td>
                                    <td className="py-2 pr-3 text-right tabular-nums text-gray-500">{row.observedDays}</td>
                                    <td className="py-2 pr-3 text-right tabular-nums text-gray-700">
                                        {row.occurrences === 0 ? '—' : formatInr(row.observedPrice)}
                                    </td>
                                    <td className="py-2 pr-3 text-right tabular-nums text-gray-500">
                                        {row.occurrences === 0 ? '—' : formatInr(row.baselinePrice)}
                                    </td>
                                    <td className="py-2 pr-3 text-right tabular-nums text-gray-500">
                                        {formatPct(row.rawPct, 2)}
                                        <span className="ml-1 text-[10px] text-gray-400">
                                            {row.rawLo95 === null ? '' : `${formatPct(row.rawLo95, 0)} to ${formatPct(row.rawHi95, 0)}`}
                                        </span>
                                    </td>
                                    <td className={`py-2 pr-3 text-right tabular-nums font-medium ${tone}`}>
                                        {formatPct(row.pooledPct, 2)}
                                        <span className="ml-1 text-[10px] font-normal text-gray-400">
                                            {formatPct(row.pooledLo80, 1)} to {formatPct(row.pooledHi80, 1)}
                                        </span>
                                    </td>
                                    <td className="py-2 pr-1 text-right">
                                        <span
                                            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] ${style.text} ${style.bg} ${style.border}`}
                                            title={RELIABILITY_MEANING[row.reliability]}
                                        >
                                            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: style.dot }} />
                                            {row.reliability}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <p className="mt-3 text-[11px] leading-relaxed text-gray-400">
                <span className="text-gray-500">Raw</span> compares the event window with a matched 14-day window
                either side, 95% interval from a block bootstrap.{' '}
                <span className="text-gray-500">Pooled</span> shrinks that toward the category mean so a single
                observed day cannot masquerade as a measured effect; it is the number the forecast applies.
            </p>
        </div>
    );
});

EventImpactTable.displayName = 'EventImpactTable';
