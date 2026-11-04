'use client';
import { useMemo, useState } from 'react';
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { chartPoints, modelIds, type LedgerBatch, type LedgerModel } from '@/app/utils/forecast_ledger_types';
import { formatDate, formatInr } from '@/app/utils/analytics';

const colors: Record<LedgerModel, string> = { existing: '#b66b36', hybrid: '#2563a0', ar1: '#21826b', naive: '#737b88' };
const timestamp = (value: string) => new Date(value).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });

export function ForecastComparison({ batch }: { batch: LedgerBatch }) {
    const [visible, setVisible] = useState<LedgerModel[]>([...modelIds]);
    const [intervalModel, setIntervalModel] = useState<LedgerModel>('hybrid');
    const [days, setDays] = useState(90);
    const [page, setPage] = useState(0);
    const points = useMemo(() => chartPoints(batch.predictions.filter((r) => r.horizon <= days), intervalModel), [batch.predictions, intervalModel, days]);
    const details = points.slice(page * 14, (page + 1) * 14);
    const names = Object.fromEntries(batch.models.map((m) => [m.id, m.name]));
    if (batch.status !== 'published') return (
        <div role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Batch {batch.status}. {batch.error ?? 'The four-model cohort has not been published yet.'}
        </div>
    );
    return <div className="space-y-4">
        <dl className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-gray-600">
            <div><dt className="font-medium text-gray-800">Issued</dt><dd>{batch.publishedAt ? timestamp(batch.publishedAt) : 'Not published'} IST</dd></div>
            <div><dt className="font-medium text-gray-800">Training through</dt><dd>{formatDate(batch.originDate)}</dd></div>
            <div><dt className="font-medium text-gray-800">Input captured</dt><dd>{timestamp(batch.snapshotAt)} IST</dd></div>
            <div><dt className="font-medium text-gray-800">Protocol</dt><dd title={batch.protocolId}>{batch.protocolId.slice(0, 12)} · frozen methods</dd></div>
        </dl>
        <div className="flex flex-wrap items-end justify-between gap-4">
            <fieldset className="flex flex-wrap gap-3"><legend className="mb-2 text-xs font-medium text-gray-700">Visible models</legend>
                {batch.models.map((m) => <label key={m.id} className="flex items-center gap-1.5 text-xs text-gray-700">
                    <input type="checkbox" checked={visible.includes(m.id)} onChange={() => setVisible((v) => v.includes(m.id) ? v.filter((id) => id !== m.id) : [...v, m.id])} />
                    <span style={{ color: colors[m.id] }}>━</span> {m.name} <span className="text-gray-500">{m.version} · {m.role}</span>
                </label>)}
            </fieldset>
            <div className="flex flex-wrap gap-3">
                <label className="text-xs text-gray-600">Interval model<select className="ml-2 rounded border border-gray-300 bg-white p-2" value={intervalModel} onChange={(e) => setIntervalModel(e.target.value as LedgerModel)}>
                    {batch.models.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select></label>
                <label className="text-xs text-gray-600">Horizon<select className="ml-2 rounded border border-gray-300 bg-white p-2" value={days} onChange={(e) => { setDays(Number(e.target.value)); setPage(0); }}>
                    {[7, 30, 90, 180, 1000].map((n) => <option key={n} value={n}>{n === 1000 ? 'Through Dec 2027' : `${n} days`}</option>)}
                </select></label>
            </div>
        </div>
        <div className="h-80 w-full" role="img" aria-label="All selected issued forecast paths, actual quotes and the selected model's daily prediction intervals. Exact values are in the table below.">
            <ResponsiveContainer width="100%" height="100%"><ComposedChart data={points} margin={{ top: 10, right: 12, bottom: 10, left: 0 }} accessibilityLayer>
                <CartesianGrid vertical={false} stroke="#e8edf1" />
                <XAxis dataKey="date" minTickGap={45} tickFormatter={(v: string) => formatDate(v)} tick={{ fontSize: 10 }} />
                <YAxis domain={['auto', 'auto']} tickFormatter={(v: number) => `₹${v}`} tick={{ fontSize: 11 }} width={55} />
                <Tooltip labelFormatter={(value) => formatDate(String(value))} formatter={(value, name) => [Array.isArray(value) ? value.map((v) => formatInr(Number(v))).join(' – ') : formatInr(Number(value)), String(name)]} />
                <Area dataKey="band95" name={`${names[intervalModel]} 95% daily band`} stroke="none" fill={colors[intervalModel]} fillOpacity={0.07} isAnimationActive={false} />
                <Area dataKey="band80" name={`${names[intervalModel]} 80% daily band`} stroke="none" fill={colors[intervalModel]} fillOpacity={0.12} isAnimationActive={false} />
                {visible.map((m) => <Line key={m} dataKey={m} name={names[m]} stroke={colors[m]} strokeWidth={1.8} strokeDasharray={m === 'naive' ? '5 4' : undefined} dot={false} type="linear" isAnimationActive={false} />)}
                <Line dataKey="actual" name="Observed quote (latest revision)" stroke="#1f2937" strokeWidth={2.2} dot={false} connectNulls={false} isAnimationActive={false} />
            </ComposedChart></ResponsiveContainer>
        </div>
        <p className="text-xs leading-relaxed text-gray-600">Solid dark line: observed quotes. Model lines are the original issued predictions, without smoothing or later refitting. Bands apply to individual daily prices; unsupported intervals are absent. Long horizons are scenarios, not validated guarantees.</p>
        <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-xs">
            <caption className="pb-2 text-left font-medium text-gray-700">Issued daily predictions (₹/kg) · intervals for {names[intervalModel]}</caption>
            <thead className="border-b text-gray-600"><tr><th className="py-2 pr-3">Date / events</th><th className="pr-3">Actual</th>{modelIds.map((m) => <th key={m} className="pr-3">{names[m]}</th>)}<th>80% / 95% daily bands</th></tr></thead>
            <tbody>{details.map((r) => <tr key={r.date} className="border-b border-gray-100"><td className="py-3 pr-3">{formatDate(r.date)}{r.events.length > 0 && <span className="mt-1 block max-w-52 text-[11px] text-gray-500">{r.events.join(', ')}</span>}</td><td className="pr-3">{formatInr(r.actual)}</td>{modelIds.map((m) => <td key={m} className="pr-3 tabular-nums">{formatInr(r[m])}</td>)}<td className="whitespace-nowrap text-gray-600">{r.band80 ? r.band80.map((v) => formatInr(v)).join(' – ') : 'Unavailable'}<br />{r.band95 ? r.band95.map((v) => formatInr(v)).join(' – ') : 'Unavailable'}</td></tr>)}</tbody>
        </table></div>
        <div className="flex items-center justify-between text-xs text-gray-600"><span>{points.length} target dates · original batch preserved</span><div className="flex items-center gap-3"><button type="button" className="rounded border px-3 py-2 disabled:opacity-40" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Previous dates</button><span>{page + 1} / {Math.max(1, Math.ceil(points.length / 14))}</span><button type="button" className="rounded border px-3 py-2 disabled:opacity-40" disabled={(page + 1) * 14 >= points.length} onClick={() => setPage((p) => p + 1)}>Next dates</button></div></div>
    </div>;
}
