'use client'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ChartCard } from './chart_card';

interface MortalityData {
    label: string;
    mortalityPct: number;
}

interface Props {
    data: MortalityData[];
}

const getColor = (pct: number) => {
    if (pct <= 3) return '#16a34a';
    if (pct <= 6) return '#f59e0b';
    return '#ef4444';
};

export const MortalityChart = ({ data }: Props) => {
    if (data.length === 0) {
        return (
            <ChartCard title="Mortality Rate by Batch">
                <div className="h-[300px] flex items-center justify-center text-sm text-gray-400">
                    No active batches
                </div>
            </ChartCard>
        );
    }

    return (
        <ChartCard title="Mortality Rate by Batch">
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                        type="number"
                        tickFormatter={(v) => `${v}%`}
                        tick={{ fontSize: 12, fill: '#6b7280' }}
                    />
                    <YAxis
                        type="category"
                        dataKey="label"
                        tick={{ fontSize: 11, fill: '#6b7280' }}
                        width={90}
                    />
                    <Tooltip
                        formatter={(v) => [`${Number(v).toFixed(2)}%`, 'Mortality']}
                        contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    />
                    <Bar dataKey="mortalityPct" name="Mortality %" radius={[0, 4, 4, 0]}>
                        {data.map((entry, idx) => (
                            <Cell key={idx} fill={getColor(entry.mortalityPct)} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </ChartCard>
    );
};
