'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ledgerBatch, ledgerBatches, ledgerError } from '@/app/utils/forecast_ledger';
import { ForecastComparison } from './forecast_comparison';
import { LedgerAccuracy } from './accuracy';

export function ForecastLedger() {
    const [view, setView] = useState<'forecasts' | 'accuracy'>('forecasts');
    const [protocol, setProtocol] = useState('');
    const [kind, setKind] = useState('all');
    const [offset, setOffset] = useState(0);
    const [selection, setSelection] = useState('');
    const history = useQuery({ queryKey: ['analytics', 'forecast-ledger', 'batches', protocol, kind, offset], queryFn: () => ledgerBatches(protocol, kind, offset), staleTime: 10_000, refetchInterval: 15_000, retry: 1 });
    const rows = history.data?.batches ?? [];
    const selectedId = (rows.some((b) => b.id === selection) ? selection : '') || rows.find((b) => b.status === 'published')?.id || rows[0]?.id || '';
    const batch = useQuery({ queryKey: ['analytics', 'forecast-ledger', 'batch', selectedId], queryFn: () => ledgerBatch(selectedId), enabled: !!selectedId, staleTime: 15_000, refetchInterval: (q) => q.state.data?.status === 'published' ? 60_000 : 15_000, retry: 1 });
    const resolvedProtocol = protocol || history.data?.protocolId || '';
    const reset = () => { setSelection(''); setOffset(0); };
    const latest = rows[0];
    return <section aria-labelledby="forecast-ledger-title" className="space-y-5 rounded-xl border border-gray-200 bg-white p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
            <div><h2 id="forecast-ledger-title" className="text-lg font-semibold text-gray-900">Forecast trial ledger</h2><p className="mt-1 max-w-3xl text-xs leading-relaxed text-gray-600">Four frozen methods. Original predictions preserved. Official forecasts issue at 00:05 IST using the previous day’s finalized rate; ad-hoc updates are tracked separately.</p></div>
            <div className="flex rounded-lg border border-gray-200 p-1" aria-label="Ledger view">{(['forecasts', 'accuracy'] as const).map((tab) => <button key={tab} type="button" aria-pressed={view === tab} onClick={() => setView(tab)} className={`rounded-md px-3 py-2 text-xs font-medium ${view === tab ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>{tab === 'forecasts' ? 'Issued forecasts' : 'Accuracy'}</button>)}</div>
        </div>
        <label className="block text-xs text-gray-600">Frozen protocol<select aria-label="Frozen protocol" className="ml-2 max-w-full rounded border border-gray-300 bg-white p-2" value={protocol} onChange={(e) => { setProtocol(e.target.value); reset(); }}><option value="">Latest registered protocol</option>{history.data?.protocols.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.id.slice(0, 12)}</option>)}</select></label>
        {history.isLoading && <p role="status" className="text-sm text-gray-600">Loading live forecast history…</p>}
        {history.error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"><p>{ledgerError(history.error)}</p><p className="mt-1 text-xs">No bundled predictions are substituted for the live ledger.</p><button type="button" onClick={() => void history.refetch()} className="mt-3 rounded border border-red-300 px-3 py-1.5 text-xs">Retry ledger</button></div>}
        {history.data && view === 'accuracy' && <LedgerAccuracy key={resolvedProtocol} protocol={resolvedProtocol} events={history.data.protocols.find((p) => p.id === resolvedProtocol)?.events ?? []} />}
        {history.data && view === 'forecasts' && <>
            <div className="flex flex-wrap items-center gap-3">
                <label className="text-xs text-gray-600">Batch type<select className="ml-2 rounded border border-gray-300 bg-white p-2" value={kind} onChange={(e) => { setKind(e.target.value); reset(); }}><option value="all">Official and ad-hoc</option><option value="official">Official daily</option><option value="ad_hoc">Ad-hoc updates</option></select></label>
                <label className="text-xs text-gray-600">Issued batch<select aria-label="Issued batch" className="ml-2 max-w-full rounded border border-gray-300 bg-white p-2" value={selectedId} onChange={(e) => setSelection(e.target.value)}>{rows.length === 0 && <option value="">No batches yet</option>}{rows.map((b) => <option key={b.id} value={b.id}>{b.originDate} close · {b.kind === 'official' ? 'official' : 'ad-hoc'} · {b.status} · {b.id.slice(0, 8)}</option>)}</select></label>
                <button type="button" className="rounded border px-3 py-2 text-xs disabled:opacity-40" disabled={offset === 0} onClick={() => { setOffset((v) => Math.max(0, v - 30)); setSelection(''); }}>Newer batches</button>
                <button type="button" className="rounded border px-3 py-2 text-xs disabled:opacity-40" disabled={rows.length < 30} onClick={() => { setOffset((v) => v + 30); setSelection(''); }}>Older batches</button>
            </div>
            {latest && latest.id !== selectedId && latest.status !== 'published' && <p role="status" className="rounded border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">Most recent attempt: {latest.status}. {latest.error} Viewing a separately dated batch below—not a replacement for the failed or pending issuance.</p>}
            {!rows.length && <div role="status" className="rounded border border-gray-200 p-5 text-sm text-gray-600">No forecast batches in this view yet. The pinned worker must be running; the first official issuance is at 00:05 IST. Historical backtests are never passed off as prospective forecasts.</div>}
            {batch.isLoading && selectedId && <p role="status" className="text-sm text-gray-600">Loading issued predictions…</p>}
            {batch.error && <p role="alert" className="text-sm text-red-700">{ledgerError(batch.error)}</p>}
            {batch.data && <ForecastComparison key={batch.data.id} batch={batch.data} />}
        </>}
    </section>;
}
