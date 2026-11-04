'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { downloadLedgerReport, ledgerError, ledgerScores } from '@/app/utils/forecast_ledger';
import { formatInr } from '@/app/utils/analytics';

const percent = (value: number | null) => value === null ? '—' : `${(value * 100).toFixed(1)}%`;
export function LedgerAccuracy({ protocol, events }: { protocol: string; events: Array<{id: string; name: string}> }) {
    const [kind, setKind] = useState('official');
    const [segment, setSegment] = useState('all');
    const [event, setEvent] = useState('');
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [downloadError, setDownloadError] = useState('');
    const [downloading, setDownloading] = useState(false);
    const filters = { protocol, kind, segment, event: event || undefined, from: from || undefined, to: to || undefined };
    const query = useQuery({ queryKey: ['analytics', 'forecast-ledger', 'scores', filters], queryFn: () => ledgerScores(filters), staleTime: 30_000, refetchInterval: 60_000, retry: 1, enabled: !from || !to || from <= to });
    const download = async () => {
        setDownloading(true); setDownloadError('');
        try { await downloadLedgerReport(filters); } catch (error) { setDownloadError(ledgerError(error)); } finally { setDownloading(false); }
    };
    return <div className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-wrap gap-3">
                <label className="text-xs text-gray-600">Cohort<select value={kind} onChange={(e) => setKind(e.target.value)} className="ml-2 rounded border border-gray-300 bg-white p-2"><option value="official">Official daily trial</option><option value="ad_hoc">Ad-hoc updates (separate)</option></select></label>
                <label className="text-xs text-gray-600">Events<select value={segment} onChange={(e) => setSegment(e.target.value)} className="ml-2 rounded border border-gray-300 bg-white p-2"><option value="all">All dates</option><option value="event">Event core dates</option><option value="non_event">Non-event dates</option><option value="advance_event">Issued before event lead-in</option></select></label>
                <label className="text-xs text-gray-600">Specific event<select value={event} onChange={(e) => setEvent(e.target.value)} className="ml-2 max-w-full rounded border border-gray-300 bg-white p-2"><option value="">All event definitions</option>{events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</select></label>
                <label className="text-xs text-gray-600">Actual date from<input type="date" className="ml-2 rounded border border-gray-300 p-2" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
                <label className="text-xs text-gray-600">To<input type="date" className="ml-2 rounded border border-gray-300 p-2" value={to} onChange={(e) => setTo(e.target.value)} /></label>
            </div>
            <button type="button" disabled={downloading || (!!from && !!to && from > to)} onClick={() => void download()} className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 disabled:opacity-40">{downloading ? 'Preparing…' : 'Download evaluation report'}</button>
        </div>
        {from && to && from > to && <p role="alert" className="text-sm text-red-700">The start date must not be after the end date.</p>}
        {(query.error || downloadError) && <p role="alert" className="text-sm text-red-700">{downloadError || ledgerError(query.error)}</p>}
        {query.isLoading && <p role="status" className="text-sm text-gray-600">Loading evaluated forecasts…</p>}
        {query.data && query.data.scores.length === 0 && <div role="status" className="rounded-lg border border-gray-200 p-5 text-sm text-gray-600">No eligible observed outcomes yet for these filters. Scores appear automatically after actual prices arrive. Missing results are not zero error.</div>}
        {!!query.data?.scores.length && <div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-left text-xs">
            <caption className="pb-3 text-left text-gray-600">Same issued batch and target dates across all four models. Coverage denominators exclude unavailable intervals.</caption>
            <thead className="border-b text-gray-600"><tr>{['Model / horizon', 'Pairs / origins / dates', 'Event occurrences / years', 'MAE', 'Origin-balanced MAE', 'RMSE', 'sMAPE', 'Bias', '80% coverage / n', '95% coverage / n', '80% / 95% width'].map((label) => <th key={label} className="px-2 py-2">{label}</th>)}</tr></thead>
            <tbody>{query.data.scores.map((s) => <tr key={`${s.model}-${s.bucket}`} className="border-b border-gray-100">
                <td className="px-2 py-3 font-medium">{s.model}<span className="block font-normal text-gray-500">{s.bucket} days</span></td>
                <td className="px-2 tabular-nums">{s.n} / {s.origins} / {s.uniqueDates}</td>
                <td className="px-2 tabular-nums">{s.eventOccurrences} / {s.eventYears}</td>
                <td className="px-2">{formatInr(s.mae, 2)}</td><td className="px-2">{formatInr(s.originMae, 2)}</td>
                <td className="px-2">{formatInr(s.rmse, 2)}</td><td className="px-2">{s.smape.toFixed(1)}%</td>
                <td className="px-2">{s.bias > 0 ? '+' : ''}{s.bias.toFixed(2)}</td>
                <td className="px-2">{percent(s.coverage80)} / {s.intervalN80}</td><td className="px-2">{percent(s.coverage95)} / {s.intervalN95}</td>
                <td className="px-2 whitespace-nowrap">{formatInr(s.width80)} / {formatInr(s.width95)}</td>
            </tr>)}</tbody>
        </table></div>}
        <p className="text-xs leading-relaxed text-gray-600">Bias = prediction − actual. Forecast origins overlap and are not independent observations. Event counts are distinct event/start-date pairs and calendar years, not independent replications. A 90-day trial cannot establish annual accuracy. No model is automatically promoted.</p>
        {query.data && <p className="text-[11px] text-gray-500">Report generated {new Date(query.data.generatedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST · actual revisions are rescored without changing issued forecasts.</p>}
    </div>;
}
