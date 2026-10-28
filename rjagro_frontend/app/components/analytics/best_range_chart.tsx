'use client'
import { memo, useMemo } from 'react';
import {
    Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { ChartCard } from '../v2/overview/chart_card';
import { chart } from '../v2/overview/chart_colors';
import {
    formatRate, windowLabel, windowShortLabel, type BestWindow,
} from '@/app/utils/rate_tracker';

interface Props {
    windows: BestWindow[];
    days: number;
    color: string;
}

const BestTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const window: BestWindow = payload[0].payload;
    return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-100 text-xs space-y-1">
            <p className="font-semibold text-gray-700">{windowLabel(window)}</p>
            <p style={{ color: chart.brand }}>Average {formatRate(window.avg)}/kg</p>
            <p className="text-gray-500">
                Range {formatRate(window.min, 0)} – {formatRate(window.max, 0)}
            </p>
            <p className="text-gray-400">
                {window.observed} of {window.days} days quoted ({Math.round(window.coverage * 100)}%)
            </p>
        </div>
    );
};

export const BestRangeChart = memo(({ windows, days, color }: Props) => {
    const data = useMemo(
        () => windows.map((window, index) => ({
            ...window,
            rank: index + 1,
            name: `${index + 1}. ${windowShortLabel(window)}`,
        })),
        [windows],
    );

    const domain = useMemo<[number, number]>(() => {
        if (data.length === 0) return [0, 100];
        const lowest = Math.min(...data.map(item => item.avg));
        const highest = Math.max(...data.map(item => item.avg));
        return [Math.max(0, Math.floor(lowest / 5) * 5 - 5), Math.ceil(highest / 5) * 5 + 5];
    }, [data]);

    return (
        <ChartCard title={`Best ${days}-day selling windows (₹/kg)`}>
            {data.length === 0 ? (
                <div className="h-[260px] flex items-center justify-center text-sm text-gray-400">
                    Not enough quoted days for a {days}-day window
                </div>
            ) : (
                <>
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart
                            data={data}
                            layout="vertical"
                            margin={{ top: 4, right: 20, left: 4, bottom: 4 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} horizontal={false} />
                            <XAxis
                                type="number"
                                domain={domain}
                                tickFormatter={(value) => `₹${value}`}
                                tick={{ fontSize: 11, fill: chart.tick }}
                            />
                            <YAxis
                                type="category"
                                dataKey="name"
                                width={150}
                                tick={{ fontSize: 11, fill: chart.tick }}
                            />
                            <Tooltip content={<BestTooltip />} cursor={{ fill: 'rgba(52,113,74,0.06)' }} />
                            <Bar dataKey="avg" radius={[0, 4, 4, 0]} maxBarSize={26} isAnimationActive={false}>
                                {data.map((item, index) => (
                                    <Cell
                                        key={item.start}
                                        fill={color}
                                        fillOpacity={index === 0 ? 1 : 0.55}
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                    <p className="mt-2 text-[11px] text-gray-400">
                        Best non-overlapping {days}-day stretches, ranked by average of the days quoted.
                    </p>
                </>
            )}
        </ChartCard>
    );
});
BestRangeChart.displayName = 'BestRangeChart';
