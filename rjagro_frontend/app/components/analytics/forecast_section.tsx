'use client'
import { memo, useMemo } from 'react';
import {
    Area,
    CartesianGrid,
    ComposedChart,
    Line,
    ReferenceLine,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { CalendarClock } from 'lucide-react';
import { ChartCard } from '../v2/overview/chart_card';
import { chart } from '../v2/overview/chart_colors';
import { ratePoints } from '@/app/utils/rate_tracker';
import {
    eventName, formatDate, formatInr, formatPct, formatRange,
    chartSeries, forecastMeta, forecastSummary, futureEvents, reliabilityStyle,
} from '@/app/utils/price_forecast';

const monthTick = new Intl.DateTimeFormat('en-IN', { month: 'short', year: '2-digit', timeZone: 'UTC' });

const tick = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number);
    return monthTick.format(new Date(Date.UTC(y, m - 1, d)));
};

const Kpi = ({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: string }) => (
    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">{label}</p>
        <p className={`mt-1 text-xl font-semibold ${tone ?? 'text-gray-800'}`}>{value}</p>
        {hint && <p className="mt-0.5 text-[11px] text-gray-500">{hint}</p>}
    </div>
);

const ForecastTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const row = payload[0]?.payload;
    if (!row) return null;
    const isForecast = row.forecast !== null;

    return (
        <div className="rounded-lg border border-gray-100 bg-white p-3 text-xs shadow-lg">
            <p className="mb-1 font-semibold text-gray-700">{formatDate(row.date)}</p>
            {isForecast ? (
                <div className="space-y-0.5">
                    <p className="text-gray-600">
                        Forecast <span className="font-semibold text-gray-800">{formatInr(row.forecast)}</span>
                    </p>
                    <p className="text-gray-500">
                        Baseline <span className="font-medium">{formatInr(row.baseline)}</span>
                    </p>
                    <p className="text-gray-500">
                        80% band {formatInr(row.band80?.[0] ?? null)} – {formatInr(row.band80?.[1] ?? null)}
                    </p>
                    <p className="text-gray-400">
                        95% band {formatInr(row.band95?.[0] ?? null)} – {formatInr(row.band95?.[1] ?? null)}
                    </p>
                    {row.active?.length > 0 && (
                        <p className="pt-1 text-gray-500">
                            Events: {row.active.map((id: string) => eventName(id)).join(', ')}
                        </p>
                    )}
                </div>
            ) : (
                <p className="text-gray-600">
                    Observed <span className="font-semibold text-gray-800">{formatInr(row.history)}</span>
                </p>
            )}
        </div>
    );
};

export const ForecastSection = memo(() => {
    const summary = useMemo(() => forecastSummary(), []);
    const series = useMemo(() => chartSeries(ratePoints), []);
    const rows = useMemo(
        () => [...futureEvents].sort((a, b) => a.start.localeCompare(b.start)),
        [],
    );

    const { first, last, peak, trough, eventDays, days } = summary;
    const backtest = forecastMeta.backtest;

    const domain = useMemo<[number, number]>(() => {
        const values: number[] = [trough.forecast, peak.forecast];
        for (const point of series) {
            if (point.history !== null) values.push(point.history);
            if (point.forecast !== null) values.push(point.forecast);
            if (point.band95 !== null) values.push(point.band95[0], point.band95[1]);
        }
        const finite = values.filter((value) => Number.isFinite(value));
        const low = Math.min(...finite);
        const high = Math.max(...finite);
        return [Math.floor((low - 6) / 10) * 10, Math.ceil((high + 6) / 10) * 10];
    }, [series, peak, trough]);

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                    <h3 className="text-sm font-semibold text-gray-700">What the model expects next</h3>
                    <p className="mt-0.5 max-w-3xl text-[11px] text-gray-500">
                        A daily forecast to 31 December 2027 from the price history and the event calendar. The solid
                        line includes the fitted event effects; the dashed line is the same model with every event
                        switched off. Bands are prediction intervals for a single day, not for the average path — they
                        are wide because 14 months of daily prices is a long extrapolation.
                    </p>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] text-gray-500">
                    <CalendarClock size={12} className="text-gray-400" />
                    {days} days ahead · through {formatDate(forecastMeta.forecastEnd)}
                </span>
            </div>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Kpi
                    label={`${formatDate(last.date)}`}
                    value={formatInr(last.forecast)}
                    hint={`95% band ${formatInr(last.lo95)} – ${formatInr(last.hi95)}`}
                />
                <Kpi
                    label="Seasonal peak"
                    value={formatInr(peak.baseline)}
                    hint={`${formatDate(peak.date)}, before event effects`}
                    tone="text-gray-800"
                />
                <Kpi
                    label="Seasonal trough"
                    value={formatInr(trough.baseline)}
                    hint={`${formatDate(trough.date)}, before event effects`}
                    tone="text-gray-800"
                />
                <Kpi
                    label="Event-adjusted days"
                    value={`${eventDays}`}
                    hint={`of ${days}; the rest equal the baseline`}
                />
            </div>

            <ChartCard
                title="Daily forecast to 31 December 2027 (7-day mean, ₹ per kg)"
                headerControls={(
                    <span className="text-[11px] text-gray-400">
                        starts {formatInr(first.forecast)} on {formatDate(first.date)}
                    </span>
                )}
            >
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

                            <Area
                                dataKey="band95"
                                type="linear"
                                stroke="none"
                                fill={chart.rose}
                                fillOpacity={0.09}
                                isAnimationActive={false}
                                activeDot={false}
                                connectNulls={false}
                            />
                            <Area
                                dataKey="band80"
                                type="linear"
                                stroke="none"
                                fill={chart.rose}
                                fillOpacity={0.17}
                                isAnimationActive={false}
                                activeDot={false}
                                connectNulls={false}
                            />

                            <ReferenceLine
                                x={first.date}
                                stroke={chart.tick}
                                strokeDasharray="3 3"
                                label={{ value: 'forecast', position: 'insideTopRight', fontSize: 9, fill: chart.tick }}
                            />

                            <Line
                                dataKey="history"
                                stroke={chart.brand}
                                strokeWidth={1.6}
                                dot={false}
                                isAnimationActive={false}
                                connectNulls
                            />
                            <Line
                                dataKey="baseline"
                                stroke={chart.blue}
                                strokeWidth={1.2}
                                strokeDasharray="4 3"
                                dot={false}
                                isAnimationActive={false}
                                connectNulls
                            />
                            <Line
                                dataKey="forecast"
                                stroke={chart.rose}
                                strokeWidth={1.9}
                                dot={false}
                                isAnimationActive={false}
                                connectNulls
                            />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-gray-500">
                    <span className="inline-flex items-center gap-1.5">
                        <span className="h-0.5 w-4 rounded" style={{ backgroundColor: chart.brand }} /> observed
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                        <span className="h-0.5 w-4 rounded" style={{ backgroundColor: chart.rose }} /> event-adjusted
                        forecast
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                        <span className="h-0.5 w-4 rounded border-t border-dashed" style={{ borderColor: chart.blue }} />
                        baseline without events
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                        <span className="h-2.5 w-4 rounded" style={{ backgroundColor: chart.rose, opacity: 0.16 }} /> 80%
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                        <span className="h-2.5 w-4 rounded" style={{ backgroundColor: chart.rose, opacity: 0.09 }} /> 95%
                    </span>
                </div>
            </ChartCard>

            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                    <h4 className="text-sm font-semibold text-gray-700">Forecast under each event</h4>
                    <span className="text-[11px] text-gray-400">{rows.length} future occurrences</span>
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
                            {rows.map((row) => {
                                const style = reliabilityStyle(row.reliability);
                                return (
                                    <tr
                                        key={`${row.id}-${row.start}`}
                                        className="border-b border-gray-50 last:border-0"
                                    >
                                        <td className="py-1.5 pr-3">
                                            <span className="text-gray-700">{row.name}</span>
                                            {row.overlaps.length > 0 && (
                                                <span className="ml-1.5 text-[10px] text-gray-400">
                                                    with {row.overlaps.map(eventName).join(', ')}
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-1.5 pr-3 tabular-nums text-gray-500">
                                            {formatRange(row.start, row.end)}
                                        </td>
                                        <td className="py-1.5 pr-3 text-right tabular-nums text-gray-500">{row.coreDays}</td>
                                        <td className="py-1.5 pr-3 text-right tabular-nums text-gray-700">
                                            {formatInr(row.meanPrice)}
                                        </td>
                                        <td className="py-1.5 pr-3 text-right tabular-nums text-gray-500">
                                            {formatInr(row.baselinePrice)}
                                        </td>
                                        <td
                                            className={`py-1.5 pr-3 text-right tabular-nums ${
                                                row.impactPct > 0
                                                    ? 'text-emerald-700'
                                                    : row.impactPct < 0
                                                        ? 'text-red-700'
                                                        : 'text-gray-500'
                                            }`}
                                        >
                                            {formatPct(row.impactPct)}
                                            <span className="ml-1 text-[10px] text-gray-400">
                                                {formatPct(row.impactLo80, 1)} to {formatPct(row.impactHi80, 1)}
                                            </span>
                                        </td>
                                        <td className="py-1.5 text-right">
                                            <span
                                                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] ${style.text} ${style.bg} ${style.border}`}
                                            >
                                                <span
                                                    className="h-1.5 w-1.5 rounded-full"
                                                    style={{ backgroundColor: style.dot }}
                                                />
                                                {row.reliability}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                <p className="mt-3 text-[11px] text-gray-400">
                    Impact is the event-adjusted forecast minus the baseline over the event&apos;s official dates. Where
                    two events overlap the number is the combined effect, not that event alone. Evidence grades follow
                    the historical sample: A means at least eight independent occurrences, D means one.
                </p>
            </div>

            <details className="rounded-xl border border-gray-100 bg-white p-5 text-[11px] leading-relaxed text-gray-500 shadow-sm">
                <summary className="cursor-pointer text-sm font-semibold text-gray-700">How the forecast is built</summary>
                <div className="mt-3 space-y-2">
                    <p>
                        <span className="font-medium text-gray-700">Model.</span> {forecastMeta.model}. The level is
                        re-anchored to the last three quoted prices on every run, so the forecast starts from where the
                        market actually is rather than from a fitted line.
                    </p>
                    <p>
                        <span className="font-medium text-gray-700">No trend is extrapolated.</span> With 1.5 annual
                        cycles the trend and the annual cycle are not separately identifiable: fitting both to the
                        first six months produces a 90-day forecast of ₹2,619. The base case therefore carries the
                        seasonal shape and no drift; drift scenarios are documented in the analysis report.
                    </p>
                    <p>
                        <span className="font-medium text-gray-700">Validation.</span> {backtest.origins} rolling
                        origins ({backtest.originRange[0]} → {backtest.originRange[1]}), each using only data available
                        on that date, scored on {backtest.scoredDays} days: sMAPE {backtest.smape1to7}% at 1–7 days,{' '}
                        {backtest.smape8to28}% at 8–28, {backtest.smape29to90}% at 29–90. For comparison the best of{' '}
                        {backtest.models} candidates scores {backtest.bestSmape}% over the whole mix, so no model
                        dominates; this one is the most accurate at operational horizons and is the only one that
                        separates a baseline from the event effect.
                    </p>
                    <p>
                        <span className="font-medium text-gray-700">Intervals.</span> {forecastMeta.intervalMeaning}.
                        They widen with horizon and are floored by the observed dispersion of 12-month price changes,
                        so a repeat of the 2025 collapse would fall inside the 95% band.
                    </p>
                    <p className="text-gray-400">
                        Generated {formatDate(forecastMeta.generatedAt)} from data through {formatDate(forecastMeta.dataThrough)}.
                        Regenerate with <code className="rounded bg-gray-50 px-1">bash run_all.sh</code> in
                        <code className="mx-1 rounded bg-gray-50 px-1">chicken_price_forecast/</code>.
                    </p>
                </div>
            </details>
        </div>
    );
});

ForecastSection.displayName = 'ForecastSection';
