'use client';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ledgerChallenger, ledgerError } from '@/app/utils/forecast_ledger';
import type { ChallengerDay } from '@/app/utils/forecast_ledger_types';
import { formatDate, formatInr } from '@/app/utils/analytics';

const WINDOWS = [
    { label: 'Next 14 days', days: 14 },
    { label: 'Next 30 days', days: 30 },
    { label: 'December 2026', from: '2026-12-01', to: '2026-12-31' },
    { label: 'January 2027', from: '2027-01-01', to: '2027-01-31' },
    { label: 'February 2027', from: '2027-02-01', to: '2027-02-28' },
];

const pct = (logValue: number) => `${logValue >= 0 ? '+' : ''}${((Math.exp(logValue) - 1) * 100).toFixed(2)}%`;
// Hoisted so the memo dependency stays referentially stable while the query is empty.
const EMPTY_DAYS: ChallengerDay[] = [];

export function ChallengerForecast({ protocol }: { protocol: string }) {
    const [windowIndex, setWindowIndex] = useState(0);
    const query = useQuery({
        queryKey: ['analytics', 'forecast-ledger', 'challenger', protocol],
        queryFn: () => ledgerChallenger(protocol),
        staleTime: 60_000,
        retry: 1,
    });
    const selected = WINDOWS[windowIndex];
    const daily = query.data?.latest?.challenger.daily ?? EMPTY_DAYS;
    const rows = useMemo(() => daily.filter((d, index) => selected.from
        ? d.date >= selected.from && d.date <= selected.to!
        : index < (selected.days ?? 0)), [daily, selected]);

    if (query.isLoading) return <p role="status" className="text-sm text-gray-600">Loading archived challenger…</p>;
    if (query.error) return <p role="alert" className="text-sm text-red-700">{ledgerError(query.error)}</p>;
    if (!query.data?.latest) return (
        <div role="status" className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
            No event-aware challenger is archived in this protocol. It is recorded only when the ledger worker runs with
            <code className="mx-1 rounded bg-white px-1">--event-challenger</code>; nothing is substituted or inferred.
        </div>
    );
    const { challenger, originDate, publishedAt } = query.data.latest;
    if (challenger.status === 'unavailable') return (
        <div role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            The challenger did not issue for {formatDate(originDate)}: {challenger.error ?? 'unknown failure'}.
            The published four-model cohort is unaffected.
        </div>
    );
    const rho = challenger.metadata?.rho;
    const eventShare = rows.reduce((sum, r) => sum + r.eventLog, 0) / rows.length;
    const recentShare = rows.reduce((sum, r) => sum + r.recentLog, 0) / rows.length;

    return <div className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
                <h3 className="text-sm font-semibold text-gray-900">{challenger.name}</h3>
                <p className="mt-1 text-xs text-gray-600">
                    <span className="mr-2 rounded bg-gray-900 px-1.5 py-0.5 text-[10px] font-medium text-white">challenger · not published</span>
                    {challenger.version} · trained through {formatDate(challenger.trainingCutoff)} · issued {new Date(publishedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })} IST
                </p>
            </div>
            <label className="text-xs text-gray-600">Window
                <select className="ml-2 rounded border border-gray-300 bg-white p-2" value={windowIndex} onChange={(e) => setWindowIndex(Number(e.target.value))}>
                    {WINDOWS.map((w, i) => <option key={w.label} value={i}>{w.label}</option>)}
                </select>
            </label>
        </div>
        <dl className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-gray-600">
            <div><dt className="font-medium text-gray-800">Persistence ρ</dt><dd>{rho === undefined ? '—' : rho.toFixed(3)}</dd></div>
            <div><dt className="font-medium text-gray-800">Mean event contribution</dt><dd>{rows.length ? pct(eventShare) : '—'}</dd></div>
            <div><dt className="font-medium text-gray-800">Mean recent-price deviation</dt><dd>{rows.length ? pct(recentShare) : '—'}</dd></div>
            <div><dt className="font-medium text-gray-800">Calendar</dt><dd title={challenger.calendarHash}>{challenger.calendarHash.slice(0, 12)} · versioned</dd></div>
            {challenger.tentativeDateSensitivityMaxInr !== undefined && <div><dt className="font-medium text-gray-800">Tentative-date swing</dt><dd>≤ {formatInr(challenger.tentativeDateSensitivityMaxInr)}</dd></div>}
        </dl>
        <div className="overflow-x-auto rounded border border-gray-200 bg-white" role="region" aria-label="Challenger daily components" tabIndex={0}>
            <table className="w-full min-w-[760px] text-left text-xs">
                <caption className="px-3 pb-2 pt-3 text-left text-gray-600">
                    Daily ₹/kg with log components. Components add in logs, so percentages are multiplicative contributions, not rupee amounts.
                </caption>
                <thead className="border-b text-gray-600"><tr>
                    {['Date', 'Forecast', 'Level', 'Seasonal', 'Event', 'Recent', '80% band', '95% band'].map((label) =>
                        <th key={label} scope="col" className="px-2 py-2">{label}</th>)}
                </tr></thead>
                <tbody>{rows.map((r) => <tr key={r.date} className="border-b border-gray-100">
                    <th scope="row" className="whitespace-nowrap px-2 py-2 font-normal">{formatDate(r.date)}</th>
                    <td className="px-2 py-2 font-medium tabular-nums">{formatInr(r.prediction)}</td>
                    <td className="px-2 py-2 tabular-nums text-gray-600">{pct(r.levelLog)}</td>
                    <td className="px-2 py-2 tabular-nums text-gray-600">{pct(r.seasonalLog)}</td>
                    <td className="px-2 py-2 tabular-nums text-gray-600">{pct(r.eventLog)}</td>
                    <td className="px-2 py-2 tabular-nums text-gray-600">{pct(r.recentLog)}</td>
                    <td className="whitespace-nowrap px-2 py-2 tabular-nums text-gray-600">{formatInr(r.lo80)} – {formatInr(r.hi80)}</td>
                    <td className="whitespace-nowrap px-2 py-2 tabular-nums text-gray-600">{formatInr(r.lo95)} – {formatInr(r.hi95)}</td>
                </tr>)}</tbody>
            </table>
        </div>
        <p className="text-xs leading-relaxed text-gray-600">
            {challenger.caveat} Interval status is reported per row; unsupported and long-horizon bands are scenarios, not calibrated guarantees.
            This challenger is archived for comparison and is not scored by the ledger or promoted automatically.
        </p>
    </div>;
}
