'use client'
import { memo, useMemo, useState } from 'react';
import {
    CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { ChartCard } from '../v2/overview/chart_card';
import { chart } from '../v2/overview/chart_colors';
import { formatRate, type WeeklyPoint } from '@/app/utils/rate_tracker';

type WeekRange = '26w' | '52w' | 'all';

const RANGE_OPTIONS: { key: WeekRange; label: string; weeks: number }[] = [
    { key: '26w', label: '26W', weeks: 26 },
    { key: '52w', label: '52W', weeks: 52 },
    { key: 'all', label: 'All', weeks: Number.POSITIVE_INFINITY },
];

const domain = (weeks: WeeklyPoint[]): [number, number] => {
    const values = weeks.map(week => week.avg).filter((value): value is number => value !== null);
    if (values.length === 0) return [0, 100];
    return [
        Math.floor((Math.min(...values) - 5) / 10) * 10,
        Math.ceil((Math.max(...values) + 5) / 10) * 10,
    ];
};

const WeeklyTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const week: WeeklyPoint = payload[0].payload;
    if (week.avg === null) return null;
    return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-100 text-xs space-y-1">
            <p className="font-semibold text-gray-700">{week.longLabel}</p>
            <p style={{ color: chart.brand }}>Average {formatRate(week.avg)}/kg</p>
            <p className="text-gray-500">
                Range {formatRate(week.min ?? week.avg, 0)} – {formatRate(week.max ?? week.avg, 0)}
            </p>
            <p className="text-gray-400">{week.observed} of 7 days quoted</p>
        </div>
    );
};

export const WeeklyRateChart = memo(({ weeks }: { weeks: WeeklyPoint[] }) => {
    const [range, setRange] = useState<WeekRange>('52w');

    const visible = useMemo(() => {
        const option = RANGE_OPTIONS.find(item => item.key === range) ?? RANGE_OPTIONS[2];
        return Number.isFinite(option.weeks) ? weeks.slice(-option.weeks) : weeks;
    }, [weeks, range]);

    const tickInterval = Math.max(0, Math.ceil(visible.length / 9) - 1);

    const controls = (
        <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
            {RANGE_OPTIONS.map(option => (
                <button
                    key={option.key}
                    onClick={() => setRange(option.key)}
                    className={`px-2.5 py-1 font-medium transition-colors ${
                        range === option.key
                            ? 'bg-gray-800 text-white'
                            : 'bg-white text-gray-500 hover:bg-gray-50'
                    }`}
                >
                    {option.label}
                </button>
            ))}
        </div>
    );

    return (
        <ChartCard title="Weekly wholesale rate (₹/kg)" headerControls={controls}>
            {visible.length === 0 ? (
                <div className="h-[320px] flex items-center justify-center text-sm text-gray-400">
                    No rate data yet
                </div>
            ) : (
                <>
                    <ResponsiveContainer width="100%" height={320}>
                        <LineChart data={visible} margin={{ top: 8, right: 16, left: 4, bottom: 4 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
                            <XAxis
                                dataKey="label"
                                tick={{ fontSize: 11, fill: chart.tick }}
                                interval={tickInterval}
                                height={30}
                            />
                            <YAxis
                                tickFormatter={(value) => `₹${value}`}
                                tick={{ fontSize: 11, fill: chart.tick }}
                                domain={domain(visible)}
                                width={52}
                            />
                            <Tooltip content={<WeeklyTooltip />} />
                            <Line
                                type="monotone"
                                dataKey="avg"
                                name="Weekly average"
                                stroke={chart.blue}
                                strokeWidth={2.25}
                                dot={false}
                                connectNulls={false}
                                activeDot={{ r: 4, stroke: chart.blue, strokeWidth: 2, fill: '#fff' }}
                                isAnimationActive={false}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                    <p className="mt-3 text-[11px] text-gray-400">
                        Gaps are days with no quote — the line breaks rather than interpolating across an outage.
                    </p>
                </>
            )}
        </ChartCard>
    );
});
WeeklyRateChart.displayName = 'WeeklyRateChart';
