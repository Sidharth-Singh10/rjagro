'use client'
import { memo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ChartCard } from './chart_card';

interface InventoryData {
    name: string;
    quantity: number;
    unit: string;
    category: string;
}

interface Props {
    data: InventoryData[];
}

const categoryColors: Record<string, string> = {
    Feed: '#f59e0b',
    Chicks: '#38bdf8',
    Medicine: '#fb7185',
    FinishedBirds: '#a78bfa',
};

const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const { name, quantity, unit } = payload[0].payload;
    return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-100 text-xs">
            <p className="font-semibold text-gray-700">{name}</p>
            <p className="text-gray-600">{quantity.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {unit}</p>
        </div>
    );
};

export const InventoryChart = memo(({ data }: Props) => {
    if (data.length === 0) {
        return (
            <ChartCard title="Inventory Levels">
                <div className="h-[300px] flex items-center justify-center text-sm text-gray-400">
                    No inventory data
                </div>
            </ChartCard>
        );
    }

    return (
        <ChartCard title="Inventory Levels">
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" tick={{ fontSize: 12, fill: '#6b7280' }} />
                    <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fontSize: 11, fill: '#6b7280' }}
                        width={100}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="quantity" name="Quantity" radius={[0, 4, 4, 0]}>
                        {data.map((entry, idx) => (
                            <Cell key={idx} fill={categoryColors[entry.category] || '#94a3b8'} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </ChartCard>
    );
});
InventoryChart.displayName = 'InventoryChart';
