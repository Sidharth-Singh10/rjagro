'use client'
import { memo } from 'react';
import {
    ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { ChartCard } from './chart_card';

export interface BatchProfitData {
    label: string;
    revenue: number;
    grossProfit: number;
    costPerBird: number;
    grossMarginPct: number;
}

interface Props {
    data: BatchProfitData[];
}

const fmtRupee = (v: number) => `₹${v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-100 text-xs">
            <p className="font-semibold text-gray-700 mb-1">{label}</p>
            {payload.map((entry: any) => (
                <p key={entry.dataKey} style={{ color: entry.color }}>
                    {entry.name}:{' '}
                    {entry.dataKey === 'grossMarginPct'
                        ? `${Number(entry.value).toFixed(2)}%`
                        : fmtRupee(entry.value)}
                </p>
            ))}
        </div>
    );
};

export const BatchProfitChart = memo(({ data }: Props) => {
    if (data.length === 0) {
        return (
            <ChartCard title="Batch Profitability">
                <div className="h-[340px] flex items-center justify-center text-sm text-gray-400">
                    No closed batches yet
                </div>
            </ChartCard>
        );
    }

    return (
        <ChartCard title="Batch Profitability">
            <ResponsiveContainer width="100%" height={340}>
                <ComposedChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6b7280' }} />
                    <YAxis
                        yAxisId="left"
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
                    <Bar yAxisId="left" dataKey="revenue" name="Revenue" fill="#16a34a" radius={[3, 3, 0, 0]} />
                    <Bar yAxisId="left" dataKey="grossProfit" name="Gross Profit" fill="#14b8a6" radius={[3, 3, 0, 0]} />
                    <Bar yAxisId="left" dataKey="costPerBird" name="Cost/Bird" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                    <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="grossMarginPct"
                        name="Margin %"
                        stroke="#7c3aed"
                        strokeWidth={2}
                        dot={{ r: 3, fill: '#7c3aed' }}
                        activeDot={{ r: 5 }}
                    />
                </ComposedChart>
            </ResponsiveContainer>
        </ChartCard>
    );
});
BatchProfitChart.displayName = 'BatchProfitChart';
