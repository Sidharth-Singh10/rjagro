'use client'
import { memo } from 'react';
import {
    Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { ChartCard } from '../v2/overview/chart_card';
import { chart } from '../v2/overview/chart_colors';
import { formatRate, type BucketStat } from '@/app/utils/rate_tracker';

const axisDomain = (months: BucketStat[]): [number, number] => {
    if (months.length === 0) return [0, 100];
    const low = Math.min(...months.map(month => month.min));
    const high = Math.max(...months.map(month => month.max));
    return [Math.floor((low - 5) / 10) * 10, Math.ceil((high + 5) / 10) * 10];
};

const MonthlyTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const month: BucketStat = payload[0].payload;
    return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-100 text-xs space-y-1">
            <p className="font-semibold text-gray-700">{month.longLabel}</p>
            <p style={{ color: chart.brand }}>Average {formatRate(month.avg)}/kg</p>
            <p className="text-gray-500">
                Range {formatRate(month.min, 0)} – {formatRate(month.max, 0)}
            </p>
            <p className="text-gray-400">
                {month.observed} of {month.span} days quoted
            </p>
        </div>
    );
};

const LegendChip = ({ color, label }: { color: string; label: string }) => (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-gray-500">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
        {label}
    </span>
);

export const MonthlyRateChart = memo(({ months }: { months: BucketStat[] }) => {
    const legend = (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <LegendChip color={chart.brand} label="Average" />
            <LegendChip color={chart.slate} label="High / low" />
        </div>
    );

    return (
        <ChartCard title="Monthly wholesale rate (₹/kg)" headerControls={legend}>
            {months.length === 0 ? (
                <div className="h-[320px] flex items-center justify-center text-sm text-gray-400">
                    No rate data yet
                </div>
            ) : (
                <ResponsiveContainer width="100%" height={320}>
                    <ComposedChart data={months} margin={{ top: 8, right: 16, left: 4, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
                        <XAxis
                            dataKey="label"
                            tick={{ fontSize: 11, fill: chart.tick }}
                            interval={0}
                            angle={-40}
                            textAnchor="end"
                            height={48}
                        />
                        <YAxis
                            tickFormatter={(value) => `₹${value}`}
                            tick={{ fontSize: 11, fill: chart.tick }}
                            domain={axisDomain(months)}
                            width={52}
                        />
                        <Tooltip content={<MonthlyTooltip />} cursor={{ fill: 'rgba(52,113,74,0.06)' }} />
                        <Line
                            type="monotone"
                            dataKey="max"
                            name="High"
                            stroke={chart.slate}
                            strokeWidth={1.5}
                            strokeDasharray="4 3"
                            dot={false}
                            activeDot={false}
                            isAnimationActive={false}
                        />
                        <Line
                            type="monotone"
                            dataKey="min"
                            name="Low"
                            stroke={chart.slate}
                            strokeWidth={1.5}
                            strokeDasharray="4 3"
                            dot={false}
                            activeDot={false}
                            isAnimationActive={false}
                        />
                        <Bar
                            dataKey="avg"
                            name="Average"
                            fill={chart.brand}
                            radius={[4, 4, 0, 0]}
                            maxBarSize={38}
                            isAnimationActive={false}
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            )}
        </ChartCard>
    );
});
MonthlyRateChart.displayName = 'MonthlyRateChart';
