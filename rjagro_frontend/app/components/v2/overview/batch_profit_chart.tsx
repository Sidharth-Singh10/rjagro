'use client'
import { memo, useMemo } from 'react';
import {
    ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { ChartCard } from './chart_card';
import { AlertTriangle } from 'lucide-react';

export interface BatchProfitData {
    label: string;
    revenue: number;
    grossProfit: number;
    costPerBird: number;
    grossMarginPct: number;
}

interface ChartRow extends BatchProfitData {
    clampedRevenue: number;
    clampedGrossProfit: number;
    clampedCostPerBird: number;
    clampedMarginPct: number;
    isNegativeMargin: boolean;
}

interface Props {
    data: BatchProfitData[];
}

const fmtRupee = (v: number) => `₹${v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const realKeyMap: Record<string, { key: keyof BatchProfitData; label: string }> = {
    clampedRevenue: { key: 'revenue', label: 'Revenue' },
    clampedGrossProfit: { key: 'grossProfit', label: 'Gross Profit' },
    clampedCostPerBird: { key: 'costPerBird', label: 'Cost/Bird' },
};

const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const row: ChartRow | undefined = payload[0]?.payload;
    return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-100 text-xs">
            <p className="font-semibold text-gray-700 mb-1">{label}</p>
            {payload.map((entry: any) => {
                if (entry.dataKey === 'clampedMarginPct') {
                    const realMargin = row?.grossMarginPct ?? 0;
                    const isNeg = realMargin < 0;
                    return (
                        <p key={entry.dataKey} style={{ color: isNeg ? '#dc2626' : entry.color }}>
                            Margin %: <span className={isNeg ? 'font-semibold' : ''}>{realMargin.toFixed(2)}%</span>
                        </p>
                    );
                }
                const mapping = realKeyMap[entry.dataKey];
                if (mapping && row) {
                    const realVal = Number(row[mapping.key]) || 0;
                    const isNeg = realVal < 0;
                    return (
                        <p key={entry.dataKey} style={{ color: isNeg ? '#dc2626' : entry.color }}>
                            {mapping.label}: <span className={isNeg ? 'font-semibold' : ''}>{fmtRupee(realVal)}</span>
                        </p>
                    );
                }
                return (
                    <p key={entry.dataKey} style={{ color: entry.color }}>
                        {entry.name}: {fmtRupee(entry.value)}
                    </p>
                );
            })}
        </div>
    );
};

const MarginDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (cx == null || cy == null) return null;
    if (payload?.isNegativeMargin) {
        return (
            <g>
                <circle cx={cx} cy={cy} r={5} fill="#dc2626" stroke="#fff" strokeWidth={1.5} />
                <line x1={cx - 2.5} y1={cy - 2.5} x2={cx + 2.5} y2={cy + 2.5} stroke="#fff" strokeWidth={1.5} />
                <line x1={cx + 2.5} y1={cy - 2.5} x2={cx - 2.5} y2={cy + 2.5} stroke="#fff" strokeWidth={1.5} />
            </g>
        );
    }
    return <circle cx={cx} cy={cy} r={3} fill="#7c3aed" />;
};

export const BatchProfitChart = memo(({ data }: Props) => {
    const chartData: ChartRow[] = useMemo(
        () => data.map(d => ({
            ...d,
            clampedRevenue: Math.max(0, d.revenue),
            clampedGrossProfit: Math.max(0, d.grossProfit),
            clampedCostPerBird: Math.max(0, d.costPerBird),
            clampedMarginPct: Math.max(0, d.grossMarginPct),
            isNegativeMargin: d.grossMarginPct < 0,
        })),
        [data],
    );

    if (data.length === 0) {
        return (
            <ChartCard title="Batch Profitability">
                <div className="h-[340px] flex items-center justify-center text-sm text-gray-400">
                    No closed batches yet
                </div>
            </ChartCard>
        );
    }

    const hasNegative = chartData.some(d => d.isNegativeMargin);

    return (
        <ChartCard title="Batch Profitability">
            <ResponsiveContainer width="100%" height={340}>
                <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6b7280' }} />
                    <YAxis
                        yAxisId="left"
                        domain={[0, 'auto']}
                        tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                        tick={{ fontSize: 11, fill: '#6b7280' }}
                    />
                    <YAxis
                        yAxisId="right"
                        orientation="right"
                        domain={[0, 100]}
                        tickFormatter={(v) => `${v}%`}
                        tick={{ fontSize: 11, fill: '#6b7280' }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                    <Bar yAxisId="left" dataKey="clampedRevenue" name="Revenue" fill="#16a34a" radius={[3, 3, 0, 0]} />
                    <Bar yAxisId="left" dataKey="clampedGrossProfit" name="Gross Profit" fill="#14b8a6" radius={[3, 3, 0, 0]} />
                    <Bar yAxisId="left" dataKey="clampedCostPerBird" name="Cost/Bird" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                    <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="clampedMarginPct"
                        name="Margin %"
                        stroke="#7c3aed"
                        strokeWidth={2}
                        dot={<MarginDot />}
                        activeDot={{ r: 5 }}
                    />
                </ComposedChart>
            </ResponsiveContainer>
            {hasNegative && (
                <div className="flex items-center gap-1.5 mt-2 px-1 text-[11px] text-red-500">
                    <AlertTriangle size={13} />
                    <span>Red dots indicate batches with negative margin</span>
                </div>
            )}
        </ChartCard>
    );
});
BatchProfitChart.displayName = 'BatchProfitChart';
