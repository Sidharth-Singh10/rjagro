'use client'
import { memo, useMemo, useState } from 'react';
import {
    Area, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { CalendarClock } from 'lucide-react';
import { ChartCard } from '../v2/overview/chart_card';
import { chart } from '../v2/overview/chart_colors';
import {
    eventName, formatDate, formatInr, formatPct, formatRange, analyticsIsLive,
} from '@/app/utils/analytics';
import {
    HORIZONS, MODEL_OPTIONS, useModelForecast,
    type ChartDay, type Horizon, type ModelId,
} from '@/app/utils/model_forecast';
import { useAnalytics } from './analytics_provider';
import { ConclusionsList } from './conclusions_list';

const monthTick = new Intl.DateTimeFormat('en-IN', { month: 'short', year: '2-digit', timeZone: 'UTC' });
const tick = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number);
    return monthTick.format(new Date(Date.UTC(y, m - 1, d)));
};

interface Point {
    date: string;
    history: number | null;
    forecast: number | null;
    baseline: number | null;
    band95: [number, number] | null;
    band80: [number, number] | null;
    active: string[];
}

const seriesFromDays = (history: Array<{ date: string; price: number }>, rows: ChartDay[]): Point[] => {
    const first = rows[0]?.date;
    if (!first) return [];
    const cutoff = new Date(Date.parse(`${first}T00:00:00Z`) - 60 * 864e5).toISOString().slice(0, 10);
    const points: Point[] = history
        .filter((p) => p.date >= cutoff && p.date <= first)
        .map((p) => ({
            date: p.date, history: p.price, forecast: null, baseline: null,
            band95: null, band80: null, active: [],
        }));
    const last = [...history].reverse().find((p) => p.date <= first);
    if (last && points.length) {
        points[points.length - 1].forecast = last.price;
        points[points.length - 1].baseline = last.price;
    }
    for (const r of rows) {
        points.push({
            date: r.date, history: null, forecast: r.forecast, baseline: r.baseline,
            band95: [r.lo95, r.hi95], band80: [r.lo80, r.hi80], active: r.events ?? [],
        });
    }
    return points;
};

const Kpi = ({ label, value, hint }: { label: string; value: string; hint?: string }) => (
    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">{label}</p>
        <p className="mt-1 text-xl font-semibold text-gray-800">{value}</p>
        {hint && <p className="mt-0.5 text-[11px] text-gray-500">{hint}</p>}
    </div>
);

const ForecastTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    // `payload` here is recharts' array of series for the hovered point.
    const row = payload[0]?.payload as Point | undefined;
    if (!row) return null;
    return (
        <div className="rounded-lg border border-gray-100 bg-white p-3 text-xs shadow-lg">
            <p className="mb-1 font-semibold text-gray-700">{formatDate(row.date)}</p>
            {row.forecast !== null ? (
                <div className="space-y-0.5">
                    <p className="text-gray-600">Forecast <span className="font-semibold text-gray-800">{formatInr(row.forecast)}</span></p>
                    {row.baseline !== null && (
                        <p className="text-gray-500">Baseline <span className="font-medium">{formatInr(row.baseline)}</span></p>
                    )}
                    <p className="text-gray-500">80% band {formatInr(row.band80?.[0] ?? null)} – {formatInr(row.band80?.[1] ?? null)}</p>
                    <p className="text-gray-400">95% band {formatInr(row.band95?.[0] ?? null)} – {formatInr(row.band95?.[1] ?? null)}</p>
                    {row.active?.length > 0 && (
                        <p className="pt-1 text-gray-500">Events: {row.active.join(', ')}</p>
                    )}
                </div>
            ) : (
                <p className="text-gray-600">Observed <span className="font-semibold text-gray-800">{formatInr(row.history)}</span></p>
            )}
        </div>
    );
};

export const ForecastSection = memo(() => {
    const { payload, history } = useAnalytics();
    const f = payload.forecast;
    const v = payload.validation;
    const [model, setModel] = useState<ModelId>(analyticsIsLive ? 'event_ar' : 'published');
    const [horizon, setHorizon] = useState<Horizon>(90);

    // Offline builds read the bundled payload, so the ledger-backed models have
    // no source. Keep the pre-existing published-only behaviour rather than
    // offering options that can only fail.
    const options = analyticsIsLive ? MODEL_OPTIONS : MODEL_OPTIONS.filter((o) => o.id === 'published');
    const selected = useMemo(
        () => options.find((o) => o.id === model) ?? options[0],
        [options, model]);
    const forecast = useModelForecast(model, horizon, payload);

    const series = useMemo(() => seriesFromDays(history, forecast.days), [history, forecast.days]);
    const domain = useMemo<[number, number]>(() => {
        const vals: number[] = [f.peak.value, f.trough.value];
        for (const p of series) {
            if (p.history !== null) vals.push(p.history);
            if (p.forecast !== null) vals.push(p.forecast);
            if (p.band95) vals.push(p.band95[0], p.band95[1]);
        }
        const finite = vals.filter((x) => Number.isFinite(x));
        if (!finite.length) return [0, 100];
        return [Math.floor((Math.min(...finite) - 6) / 10) * 10, Math.ceil((Math.max(...finite) + 6) / 10) * 10];
    }, [series, f]);

    const forecastConclusions = payload.conclusions.filter((c) =>
        ['forecast-path', 'forecast-interval', 'validation'].includes(c.id));

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                    <h3 className="text-sm font-semibold text-gray-700">What the model expects next</h3>
                    <p className="mt-0.5 max-w-3xl text-[11px] text-gray-500">
                        A daily forecast to {formatDate(f.end)} from the price history and the event calendar. Pick a
                        model to compare against the published one; the default is the new event-aligned challenger,
                        which is <span className="font-medium text-gray-600">not</span> what the app publishes.
                    </p>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] text-gray-500">
                    <CalendarClock size={12} className="text-gray-400" />
                    {f.days} days ahead · through {formatDate(f.end)}
                </span>
            </div>

            <div>
                <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                    <h4 className="text-sm font-semibold text-gray-700">Published forecast at a glance</h4>
                    <span className="text-[11px] text-gray-400">these cards describe the published model, not the chart below</span>
                </div>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <Kpi label={formatDate(f.end)} value={formatInr(f.lastCentral)}
                         hint={`95% band ${formatInr(f.lastLo95)} – ${formatInr(f.lastHi95)}`} />
                    <Kpi label="Seasonal peak" value={formatInr(f.peak.value)}
                         hint={`${formatDate(f.peak.date)}, before event effects`} />
                    <Kpi label="Seasonal trough" value={formatInr(f.trough.value)}
                         hint={`${formatDate(f.trough.date)}, before event effects`} />
                    <Kpi label="Event-adjusted days" value={`${f.eventDays}`}
                         hint={`of ${f.days}; the rest equal the baseline`} />
                </div>
            </div>

            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                <ConclusionsList conclusions={forecastConclusions} />
            </div>

            <ChartCard
                title="Forecast by model (₹ per kg)"
                headerControls={
                    analyticsIsLive ? (
                        <div className="flex flex-wrap items-end gap-3">
                            <label className="text-[11px] text-gray-500">
                                Model
                                <select
                                    aria-label="Forecast model"
                                    className="ml-1.5 rounded border border-gray-300 bg-white px-2 py-1 text-[11px] text-gray-700"
                                    value={model}
                                    onChange={(e) => setModel(e.target.value as ModelId)}
                                >
                                    {options.map((o) => (
                                        <option key={o.id} value={o.id}>{o.label}</option>
                                    ))}
                                </select>
                            </label>
                            <label className="text-[11px] text-gray-500">
                                Horizon
                                <select
                                    aria-label="Forecast horizon"
                                    className="ml-1.5 rounded border border-gray-300 bg-white px-2 py-1 text-[11px] text-gray-700"
                                    value={String(horizon)}
                                    onChange={(e) => setHorizon(
                                        (e.target.value === 'all' ? 'all' : Number(e.target.value)) as Horizon)}
                                >
                                    {HORIZONS.map((h) => (
                                        <option key={String(h.value)} value={String(h.value)}>{h.label}</option>
                                    ))}
                                </select>
                            </label>
                        </div>
                    ) : (
                        <span className="text-[11px] text-gray-400">
                            bundled forecast · model comparison needs the live backend
                        </span>
                    )
                }
            >
                <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px]">
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 ${
                        selected.role === 'published'
                            ? 'border-gray-200 bg-white text-gray-600'
                            : selected.role === 'challenger'
                                ? 'border-amber-300 bg-amber-50 text-amber-900'
                                : 'border-gray-200 bg-gray-50 text-gray-600'
                    }`}>
                        {selected.role === 'published' ? 'published' : selected.role === 'challenger' ? 'challenger · not published' : 'ledger benchmark'}
                    </span>
                    <span className="text-gray-500">{selected.note}</span>
                    {forecast.issuedAt && (
                        <span className="text-gray-400">· issued {formatDate(forecast.issuedAt.slice(0, 10))}</span>
                    )}
                    {forecast.days.length > 0 && (
                        <span className="text-gray-400">
                            · {forecast.days.length} days to {formatDate(forecast.days[forecast.days.length - 1].date)}
                        </span>
                    )}
                </div>
                {forecast.error ? (
                    <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-xs text-red-800">
                        Could not load this model&apos;s forecast. The published forecast is unaffected.
                    </p>
                ) : forecast.isLoading ? (
                    <p role="status" className="p-6 text-xs text-gray-500">Loading {selected.label}…</p>
                ) : forecast.days.length === 0 ? (
                    <p role="status" className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-xs text-gray-600">
                        No issued forecast is archived for {selected.label} in this protocol yet. Nothing is substituted.
                    </p>
                ) : (
                <>
                <div className="h-[340px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={series} margin={{ top: 8, right: 24, bottom: 4, left: -6 }}>
                            <CartesianGrid stroke={chart.grid} vertical={false} />
                            <XAxis
                                dataKey="date"
                                tick={{ fontSize: 10, fill: chart.tick }}
                                tickFormatter={tick}
                                interval="preserveStartEnd"
                                minTickGap={44}
                                tickMargin={8}
                                axisLine={false}
                                tickLine={false}
                            />
                            <YAxis
                                domain={domain}
                                tick={{ fontSize: 10, fill: chart.tick }}
                                axisLine={false}
                                tickLine={false}
                                tickFormatter={(value: number) => `₹${value}`}
                                width={52}
                            />
                            <Tooltip content={<ForecastTooltip />} />
                            <Area dataKey="band95" type="linear" stroke="none" fill={chart.rose} fillOpacity={0.09}
                                  isAnimationActive={false} activeDot={false} connectNulls={false} />
                            <Area dataKey="band80" type="linear" stroke="none" fill={chart.rose} fillOpacity={0.17}
                                  isAnimationActive={false} activeDot={false} connectNulls={false} />
                            <ReferenceLine x={series.find((p) => p.forecast !== null)?.date ?? f.start}
                                           stroke={chart.tick} strokeDasharray="3 3"
                                           label={{ value: 'forecast', position: 'insideTopRight', fontSize: 9, fill: chart.tick }} />
                            <Line dataKey="history" stroke={chart.brand} strokeWidth={1.6} dot={false}
                                  isAnimationActive={false} connectNulls />
                            {forecast.published && (
                                <Line dataKey="baseline" stroke={chart.blue} strokeWidth={1.2} strokeDasharray="4 3"
                                      dot={false} isAnimationActive={false} connectNulls />
                            )}
                            <Line dataKey="forecast" stroke={chart.rose} strokeWidth={1.9} dot={false}
                                  isAnimationActive={false} connectNulls />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-gray-500">
                    <span className="inline-flex items-center gap-1.5">
                        <span className="h-0.5 w-4 rounded" style={{ backgroundColor: chart.brand }} /> observed
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                        <span className="h-0.5 w-4 rounded" style={{ backgroundColor: chart.rose }} /> {selected.label}
                    </span>
                    {forecast.published && (
                        <span className="inline-flex items-center gap-1.5">
                            <span className="h-0.5 w-4 rounded border-t border-dashed" style={{ borderColor: chart.blue }} /> baseline without events
                        </span>
                    )}
                    <span className="inline-flex items-center gap-1.5">
                        <span className="h-2.5 w-4 rounded" style={{ backgroundColor: chart.rose, opacity: 0.17 }} /> 80%
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                        <span className="h-2.5 w-4 rounded" style={{ backgroundColor: chart.rose, opacity: 0.09 }} /> 95%
                    </span>
                </div>
                </>
                )}
                <p className="mt-2 text-[11px] leading-relaxed text-gray-400">
                    Every point is the daily value the model issued, with no smoothing. Bands are prediction
                    intervals for a single day, not for the average path.
                </p>
            </ChartCard>

            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                    <h4 className="text-sm font-semibold text-gray-700">Forecast under each event</h4>
                    <span className="text-[11px] text-gray-400">{f.eventOccurrences.length} future occurrences</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead>
                            <tr className="border-b border-gray-100 text-[10px] uppercase tracking-wide text-gray-400">
                                <th className="py-2 pr-3 font-medium">Event</th>
                                <th className="py-2 pr-3 font-medium">Dates</th>
                                <th className="py-2 pr-3 text-right font-medium">Days</th>
                                <th className="py-2 pr-3 text-right font-medium">Forecast</th>
                                <th className="py-2 pr-3 text-right font-medium">Baseline</th>
                                <th className="py-2 pr-3 text-right font-medium">Impact</th>
                                <th className="py-2 pr-1 text-right font-medium">Evidence</th>
                            </tr>
                        </thead>
                        <tbody>
                            {f.eventOccurrences.map((row) => (
                                <tr key={`${row.id}-${row.start}`} className="border-b border-gray-50 last:border-0">
                                    <td className="py-1.5 pr-3">
                                        <span className="text-gray-700">{row.name}</span>
                                        {row.overlaps.length > 0 && (
                                            <span className="ml-1.5 text-[10px] text-gray-400">
                                                with {row.overlaps.map((id) => eventName(payload, id)).join(', ')}
                                            </span>
                                        )}
                                    </td>
                                    <td className="py-1.5 pr-3 tabular-nums text-gray-500">{formatRange(row.start, row.end)}</td>
                                    <td className="py-1.5 pr-3 text-right tabular-nums text-gray-500">{row.days}</td>
                                    <td className="py-1.5 pr-3 text-right tabular-nums text-gray-700">{formatInr(row.mean)}</td>
                                    <td className="py-1.5 pr-3 text-right tabular-nums text-gray-500">{formatInr(row.baseline)}</td>
                                    <td className={`py-1.5 pr-3 text-right tabular-nums ${row.impactPct > 0 ? 'text-emerald-700' : row.impactPct < 0 ? 'text-red-700' : 'text-gray-500'}`}>
                                        {formatPct(row.impactPct)}
                                        <span className="ml-1 text-[10px] text-gray-400">
                                            {formatPct(row.impactLo80)} to {formatPct(row.impactHi80)}
                                        </span>
                                    </td>
                                    <td className="py-1.5 pr-1 text-right text-[10px] text-gray-500">{row.reliability}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <p className="mt-3 text-[11px] text-gray-400">
                    Impact is the event-adjusted forecast minus the baseline over the event&apos;s official dates. Where
                    two events overlap the number is the combined effect, not that event alone.
                </p>
            </div>

            <details className="rounded-xl border border-gray-100 bg-white p-5 text-[11px] leading-relaxed text-gray-500 shadow-sm">
                <summary className="cursor-pointer text-sm font-semibold text-gray-700">How the forecast is built</summary>
                <div className="mt-3 space-y-2">
                    <p>
                        <span className="font-medium text-gray-700">Model.</span> {payload.meta.model}: one annual
                        harmonic plus weekday terms, with the level re-anchored to the last three quoted prices and
                        event offsets added per date. No trend is extrapolated — with 1.5 annual cycles the trend and
                        the cycle are not separately identified.
                    </p>
                    <p>
                        <span className="font-medium text-gray-700">Validation.</span> Rolling origins, horizons 1–90
                        days, scored only on quoted days: sMAPE {v.smape1to7}% at 1–7 days, {v.smape8to28}% at 8–28,{' '}
                        {v.smape29to90}% at 29–90. The comparison across {v.models.length} candidates is in the
                        validation table below.
                    </p>
                    <p>
                        <span className="font-medium text-gray-700">Intervals.</span> Error grows as{' '}
                        σ(h) = {v.sigma.sigma0} × h^{v.sigma.power}, floored by the {v.yoySd} dispersion of 12-month
                        price changes. They are prediction intervals for one day, not for the mean path.
                    </p>
                </div>
            </details>

            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                <h4 className="mb-2 text-sm font-semibold text-gray-700">Model comparison</h4>
                <table className="w-full text-left text-xs">
                    <thead>
                        <tr className="border-b border-gray-100 text-[10px] uppercase tracking-wide text-gray-400">
                            <th className="py-2 pr-3 font-medium">model</th>
                            <th className="py-2 pr-3 text-right font-medium">n</th>
                            <th className="py-2 pr-3 text-right font-medium">MAE ₹</th>
                            <th className="py-2 pr-3 text-right font-medium">RMSE ₹</th>
                            <th className="py-2 pr-3 text-right font-medium">sMAPE %</th>
                            <th className="py-2 text-right font-medium">bias ₹</th>
                        </tr>
                    </thead>
                    <tbody>
                        {v.models.map((m) => (
                            <tr key={m.model} className={`border-b border-gray-50 last:border-0 ${m.model === v.selected ? 'bg-emerald-50/40' : ''}`}>
                                <td className="py-1.5 pr-3 text-gray-700">
                                    {m.model}
                                    {m.model === v.selected && <span className="ml-1.5 text-[10px] text-emerald-700">selected</span>}
                                </td>
                                <td className="py-1.5 pr-3 text-right tabular-nums text-gray-500">{m.n}</td>
                                <td className="py-1.5 pr-3 text-right tabular-nums text-gray-500">{m.mae.toFixed(2)}</td>
                                <td className="py-1.5 pr-3 text-right tabular-nums text-gray-500">{m.rmse.toFixed(2)}</td>
                                <td className="py-1.5 pr-3 text-right tabular-nums text-gray-700">{m.smape.toFixed(2)}</td>
                                <td className="py-1.5 text-right tabular-nums text-gray-500">{formatPct(m.biasPct)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
});

ForecastSection.displayName = 'ForecastSection';
