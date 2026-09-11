'use client'
import { memo } from 'react';
import { chart } from "./chart_colors";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartCard } from './chart_card';

export interface AvgWeightData {
    label: string;
    avgWeight: number;
    batchId: number;
    birds: number;
}

interface Props {
    data: AvgWeightData[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const row: AvgWeightData = payload[0].payload;
    return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-100 text-xs">
            <p className="font-semibold text-gray-700 mb-1">{label}</p>
            <p style={{ color: chart.violet }}>
                Avg Weight: {row.avgWeight.toFixed(3)} kg/bird
            </p>
            <p className="text-gray-500">Batch {row.batchId} · {row.birds.toLocaleString('en-IN')} birds</p>
        </div>
    );
};

export const AvgWeightChart = memo(({ data }: Props) => {
    if (data.length === 0) {
        return (
            <ChartCard title="Avg Sale Weight (kg/bird)">
                <div className="h-[300px] flex items-center justify-center text-sm text-gray-400">
                    No sales data yet
                </div>
            </ChartCard>
        );
    }

    return (
        <ChartCard title="Avg Sale Weight (kg/bird)">
            <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6b7280' }} />
                    <YAxis
                        tickFormatter={(v) => `${v} kg`}
                        tick={{ fontSize: 11, fill: '#6b7280' }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Line
                        type="monotone"
                        dataKey="avgWeight"
                        stroke={chart.violet}
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: chart.violet, strokeWidth: 2, stroke: '#fff' }}
                        activeDot={{ r: 6, stroke: chart.violet, strokeWidth: 2 }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </ChartCard>
    );
});
AvgWeightChart.displayName = 'AvgWeightChart';
