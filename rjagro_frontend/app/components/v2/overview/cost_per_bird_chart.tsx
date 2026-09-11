'use client'
import { memo } from 'react';
import { chart } from "./chart_colors";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChartCard } from './chart_card';

export interface CostPerBirdData {
    label: string;
    feed: number;
    chicks: number;
    medicine: number;
    other: number;
    total: number;
    birds: number;
}

interface Props {
    data: CostPerBirdData[];
}

const fmt = (v: number) => `₹${v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const row: CostPerBirdData = payload[0].payload;
    const lines: Array<[string, number, string]> = [
        ['Feed', row.feed, chart.amber],
        ['Chicks', row.chicks, chart.blue],
        ['Medicine', row.medicine, chart.rose],
        ['Other', row.other, chart.slate],
    ];
    return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-100 text-xs">
            <p className="font-semibold text-gray-700 mb-1">{row.label}</p>
            {lines.filter(([, v]) => v > 0).map(([name, v, color]) => (
                <p key={name} style={{ color }}>
                    {name}: {fmt(v)}/bird
                </p>
            ))}
            <p className="mt-1 pt-1 border-t border-gray-100 font-semibold text-gray-800">
                Total: {fmt(row.total)}/bird
            </p>
            <p className="text-gray-400">{row.birds.toLocaleString('en-IN')} birds placed</p>
        </div>
    );
};

export const CostPerBirdChart = memo(({ data }: Props) => {
    if (data.length === 0) {
        return (
            <ChartCard title="Cost per Bird (₹)">
                <div className="h-[300px] flex items-center justify-center text-sm text-gray-400">
                    No allocation data yet
                </div>
            </ChartCard>
        );
    }

    return (
        <ChartCard title="Cost per Bird (₹)">
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6b7280' }} />
                    <YAxis tickFormatter={(v) => `₹${v}`} tick={{ fontSize: 11, fill: '#6b7280' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="feed" name="Feed" stackId="cost" fill={chart.amber} />
                    <Bar dataKey="chicks" name="Chicks" stackId="cost" fill={chart.blue} />
                    <Bar dataKey="medicine" name="Medicine" stackId="cost" fill={chart.rose} />
                    <Bar dataKey="other" name="Other" stackId="cost" fill={chart.slate} radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </ChartCard>
    );
});
CostPerBirdChart.displayName = 'CostPerBirdChart';
