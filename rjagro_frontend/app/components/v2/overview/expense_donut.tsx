'use client'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartCard } from './chart_card';

interface ExpenseSlice {
    name: string;
    value: number;
    color: string;
}

interface Props {
    data: ExpenseSlice[];
    total: number;
}

const fmt = (v: number) => `₹${v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const { name, value, payload: d } = payload[0];
    return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-100 text-xs">
            <p className="font-semibold" style={{ color: d.color }}>{name}</p>
            <p className="text-gray-700">{fmt(value)}</p>
        </div>
    );
};

export const ExpenseDonut = ({ data, total }: Props) => {
    if (data.length === 0) {
        return (
            <ChartCard title="Expense Breakdown">
                <div className="h-[300px] flex items-center justify-center text-sm text-gray-400">
                    No purchase data yet
                </div>
            </ChartCard>
        );
    }

    return (
        <ChartCard title="Expense Breakdown">
            <div className="relative">
                <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={70}
                            outerRadius={110}
                            paddingAngle={3}
                            dataKey="value"
                        >
                            {data.map((entry, idx) => (
                                <Cell key={idx} fill={entry.color} />
                            ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                        <p className="text-xs text-gray-500">Total</p>
                        <p className="text-lg font-bold text-gray-800">{fmt(total)}</p>
                    </div>
                </div>
            </div>
            <div className="flex justify-center gap-6 mt-2">
                {data.map((entry) => (
                    <div key={entry.name} className="flex items-center gap-1.5 text-xs">
                        <div
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: entry.color }}
                        />
                        <span className="text-gray-600">{entry.name}</span>
                    </div>
                ))}
            </div>
        </ChartCard>
    );
};
