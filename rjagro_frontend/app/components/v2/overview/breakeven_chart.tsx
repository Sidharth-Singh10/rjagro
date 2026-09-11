'use client'
import { memo } from 'react';
import { chart } from "./chart_colors";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChartCard } from './chart_card';

export interface BreakevenData {
    label: string;
    realized: number;
    breakeven: number;
    marginPerKg: number;
    kg: number;
}

interface Props {
    data: BreakevenData[];
}

const fmt = (v: number) => `₹${v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const row: BreakevenData = payload[0].payload;
    return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-100 text-xs">
            <p className="font-semibold text-gray-700 mb-1">{row.label}</p>
            <p style={{ color: chart.brand }}>Realized: ₹{row.realized.toFixed(2)}/kg</p>
            <p style={{ color: chart.orange }}>Breakeven: ₹{row.breakeven.toFixed(2)}/kg</p>
            <p className={row.marginPerKg >= 0 ? 'text-green-600 font-semibold mt-1' : 'text-red-600 font-semibold mt-1'}>
                {row.marginPerKg >= 0 ? '+' : '−'}{fmt(Math.abs(row.marginPerKg))}/kg
            </p>
            <p className="text-gray-400">{row.kg.toLocaleString('en-IN', { maximumFractionDigits: 2 })} kg sold</p>
        </div>
    );
};

export const BreakevenChart = memo(({ data }: Props) => {
    if (data.length === 0) {
        return (
            <ChartCard title="Realized vs Breakeven (₹/kg)">
                <div className="h-[300px] flex items-center justify-center text-sm text-gray-400">
                    No closed batches with sales yet
                </div>
            </ChartCard>
        );
    }

    return (
        <ChartCard title="Realized vs Breakeven (₹/kg)">
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6b7280' }} />
                    <YAxis tickFormatter={(v) => `₹${v}`} tick={{ fontSize: 11, fill: '#6b7280' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="realized" name="Realized ₹/kg" fill={chart.brand} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="breakeven" name="Breakeven ₹/kg" fill={chart.orange} radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </ChartCard>
    );
});
BreakevenChart.displayName = 'BreakevenChart';
