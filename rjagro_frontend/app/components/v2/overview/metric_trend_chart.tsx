'use client'
import { memo, useMemo, useState } from 'react';
import {
    Bar,
    CartesianGrid,
    ComposedChart,
    Line,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { ChartCard } from './chart_card';
import { chart } from './chart_colors';

export interface MetricSeries {
    key: string;
    label: string;
    color: string;
    kind?: 'line' | 'bar';
    yAxis?: 'left' | 'right';
    format?: (value: number) => string;
}

interface Props {
    title: string;
    data: Array<Record<string, number | string>>;
    series: MetricSeries[];
    headerControls?: React.ReactNode;
    /** Optional indicator rendered inside the card (e.g. live aggregate), never plotted. */
    badge?: React.ReactNode;
    leftTickFormatter?: (value: number) => string;
    rightTickFormatter?: (value: number) => string;
    leftAxisLabel?: string;
    rightAxisLabel?: string;
    height?: number;
    emptyText?: string;
    /** Series that start toggled off. */
    initialHidden?: string[];
}

const defaultFormat = (value: number) =>
    value.toLocaleString('en-IN', { maximumFractionDigits: 2 });

const CustomTooltip = ({ active, payload, label, series }: any) => {
    if (!active || !payload?.length) return null;
    const row = payload[0]?.payload;
    const title = row && typeof row.tooltipTitle === 'string' ? row.tooltipTitle : label;
    const byKey = new Map(payload.map((entry: any) => [entry.dataKey, entry]));

    return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-100 text-xs space-y-0.5">
            <p className="font-semibold text-gray-700 mb-1">{title}</p>
            {series.map((s: MetricSeries) => {
                const entry: any = byKey.get(s.key);
                if (!entry || entry.value === undefined || entry.value === null) return null;
                return (
                    <p key={s.key} style={{ color: s.color }}>
                        {s.label}: {(s.format ?? defaultFormat)(Number(entry.value))}
                    </p>
                );
            })}
        </div>
    );
};

/**
 * Generic time-series card: any mix of bars/lines, optional right-hand axis,
 * and clickable legend chips to toggle series.
 */
export const MetricTrendChart = memo(({
    title,
    data,
    series,
    headerControls,
    badge,
    leftTickFormatter,
    rightTickFormatter,
    leftAxisLabel,
    rightAxisLabel,
    height = 300,
    emptyText = 'No stored metrics yet',
    initialHidden,
}: Props) => {
    const [hidden, setHidden] = useState<Record<string, boolean>>(() =>
        Object.fromEntries((initialHidden ?? []).map(key => [key, true])),
    );

    const toggle = (key: string) =>
        setHidden(prev => ({ ...prev, [key]: !prev[key] }));

    const visibleSeries = series.filter(s => !hidden[s.key]);
    const hasRight = series.some(s => s.yAxis === 'right');
    const manyPoints = data.length > 18;

    // Rows may provide a `label2` (e.g. farmer name) rendered on a second axis line.
    const label2ByLabel = useMemo(() => {
        const map = new Map<string, string>();
        data.forEach(row => {
            const secondary = row.label2;
            if (typeof secondary === 'string' && secondary) map.set(String(row.label), secondary);
        });
        return map;
    }, [data]);
    const hasSecondaryLabels = label2ByLabel.size > 0;

    const renderTwoLineTick = ({ x, y, payload }: any) => (
        <g transform={`translate(${x},${y})`}>
            <text x={0} y={0} dy={10} textAnchor="middle" fill={chart.tick} fontSize={10}>
                <tspan x={0} dy={0}>{payload.value}</tspan>
                <tspan x={0} dy={11}>{label2ByLabel.get(String(payload.value)) ?? ''}</tspan>
            </text>
        </g>
    );

    const chips = (
        <div className="flex flex-wrap gap-1.5 mb-3">
            {series.map(s => {
                const isVisible = !hidden[s.key];
                return (
                    <button
                        key={s.key}
                        onClick={() => toggle(s.key)}
                        title={`Toggle ${s.label}`}
                        className={`px-2 py-0.5 rounded-full text-[11px] font-medium border transition-colors ${
                            isVisible
                                ? 'text-white border-transparent'
                                : 'bg-white text-gray-400 border-gray-200 hover:bg-gray-50'
                        }`}
                        style={isVisible ? { backgroundColor: s.color } : undefined}
                    >
                        {s.label}
                    </button>
                );
            })}
        </div>
    );

    if (data.length === 0) {
        return (
            <ChartCard title={title} headerControls={headerControls}>
                {badge && <div className="mb-3">{badge}</div>}
                <div
                    className="flex items-center justify-center text-sm text-gray-400"
                    style={{ height }}
                >
                    {emptyText}
                </div>
            </ChartCard>
        );
    }

    return (
        <ChartCard title={title} headerControls={headerControls}>
            {badge && <div className="mb-3">{badge}</div>}
            {chips}
            <ResponsiveContainer width="100%" height={height}>
                <ComposedChart data={data} margin={{ top: 5, right: hasRight ? 10 : 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
                    <XAxis
                        dataKey="label"
                        tick={hasSecondaryLabels ? renderTwoLineTick : { fontSize: 11, fill: chart.tick }}
                        interval={manyPoints ? 'preserveStartEnd' : 0}
                        angle={!hasSecondaryLabels && manyPoints ? -45 : 0}
                        textAnchor={!hasSecondaryLabels && manyPoints ? 'end' : 'middle'}
                        height={hasSecondaryLabels ? 44 : manyPoints ? 55 : 30}
                    />
                    <YAxis
                        yAxisId="left"
                        tickFormatter={leftTickFormatter}
                        tick={{ fontSize: 11, fill: chart.tick }}
                        width={60}
                        label={leftAxisLabel ? { value: leftAxisLabel, angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: chart.tick } } : undefined}
                    />
                    {hasRight && (
                        <YAxis
                            yAxisId="right"
                            orientation="right"
                            tickFormatter={rightTickFormatter}
                            tick={{ fontSize: 11, fill: chart.tick }}
                            width={60}
                            label={rightAxisLabel ? { value: rightAxisLabel, angle: 90, position: 'insideRight', style: { fontSize: 10, fill: chart.tick } } : undefined}
                        />
                    )}
                    <Tooltip content={<CustomTooltip series={visibleSeries} />} />

                    {visibleSeries.map(s =>
                        s.kind === 'bar' ? (
                            <Bar
                                key={s.key}
                                yAxisId={s.yAxis === 'right' ? 'right' : 'left'}
                                dataKey={s.key}
                                fill={s.color}
                                radius={[3, 3, 0, 0]}
                                maxBarSize={26}
                            />
                        ) : (
                            <Line
                                key={s.key}
                                yAxisId={s.yAxis === 'right' ? 'right' : 'left'}
                                type="monotone"
                                dataKey={s.key}
                                stroke={s.color}
                                strokeWidth={2.5}
                                dot={{ r: 3, fill: s.color }}
                                activeDot={{ r: 5, stroke: s.color, strokeWidth: 2 }}
                                connectNulls
                            />
                        ),
                    )}
                </ComposedChart>
            </ResponsiveContainer>
        </ChartCard>
    );
});
MetricTrendChart.displayName = 'MetricTrendChart';
