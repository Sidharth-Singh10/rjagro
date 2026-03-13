'use client'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ChartCard } from './chart_card';

interface MonthlyData {
    month: string;
    revenue: number;
    expenses: number;
}

interface Props {
    data: MonthlyData[];
    filterMode: 'months' | 'custom';
    onFilterModeChange: (mode: 'months' | 'custom') => void;
    monthsBack: number;
    onMonthsBackChange: (v: number) => void;
    customFrom: string;
    onCustomFromChange: (v: string) => void;
    customTo: string;
    onCustomToChange: (v: string) => void;
}

const fmt = (v: number) => `₹${v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-100 text-xs">
            <p className="font-semibold text-gray-700 mb-1">{label}</p>
            {payload.map((entry: any) => (
                <p key={entry.name} style={{ color: entry.color }}>
                    {entry.name}: {fmt(entry.value)}
                </p>
            ))}
        </div>
    );
};

const FilterControls = ({
    filterMode, onFilterModeChange,
    monthsBack, onMonthsBackChange,
    customFrom, onCustomFromChange,
    customTo, onCustomToChange,
}: Omit<Props, 'data'>) => (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
        <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
            <button
                onClick={() => onFilterModeChange('months')}
                className={`px-3 py-1.5 font-medium transition-colors ${
                    filterMode === 'months'
                        ? 'bg-gray-800 text-white'
                        : 'bg-white text-gray-500 hover:bg-gray-50'
                }`}
            >
                Months
            </button>
            <button
                onClick={() => onFilterModeChange('custom')}
                className={`px-3 py-1.5 font-medium transition-colors ${
                    filterMode === 'custom'
                        ? 'bg-gray-800 text-white'
                        : 'bg-white text-gray-500 hover:bg-gray-50'
                }`}
            >
                Custom
            </button>
        </div>

        {filterMode === 'months' ? (
            <div className="flex items-center gap-2">
                <input
                    type="range"
                    min={1}
                    max={24}
                    value={monthsBack}
                    onChange={e => onMonthsBackChange(Number(e.target.value))}
                    className="w-24 h-1.5 accent-gray-700 cursor-pointer"
                />
                <span className="text-xs text-gray-500 whitespace-nowrap w-20">
                    Last {monthsBack} mo{monthsBack !== 1 ? 's' : ''}
                </span>
            </div>
        ) : (
            <div className="flex items-center gap-1.5 text-xs">
                <input
                    type="date"
                    value={customFrom}
                    onChange={e => onCustomFromChange(e.target.value)}
                    className="border border-gray-200 rounded-md px-2 py-1 text-gray-600 focus:outline-none focus:ring-1 focus:ring-gray-300"
                />
                <span className="text-gray-400">to</span>
                <input
                    type="date"
                    value={customTo}
                    onChange={e => onCustomToChange(e.target.value)}
                    className="border border-gray-200 rounded-md px-2 py-1 text-gray-600 focus:outline-none focus:ring-1 focus:ring-gray-300"
                />
            </div>
        )}
    </div>
);

export const RevenueExpenseChart = ({
    data,
    filterMode, onFilterModeChange,
    monthsBack, onMonthsBackChange,
    customFrom, onCustomFromChange,
    customTo, onCustomToChange,
}: Props) => {
    const controls = (
        <FilterControls
            filterMode={filterMode} onFilterModeChange={onFilterModeChange}
            monthsBack={monthsBack} onMonthsBackChange={onMonthsBackChange}
            customFrom={customFrom} onCustomFromChange={onCustomFromChange}
            customTo={customTo} onCustomToChange={onCustomToChange}
        />
    );

    if (data.length === 0) {
        return (
            <ChartCard title="Revenue vs Expenses (Closed Batches)" headerControls={controls}>
                <div className="h-[300px] flex items-center justify-center text-sm text-gray-400">
                    No closed batch data for this period
                </div>
            </ChartCard>
        );
    }

    return (
        <ChartCard title="Revenue vs Expenses (Closed Batches)" headerControls={controls}>
            <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ea580c" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#ea580c" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#6b7280' }} />
                    <YAxis
                        tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                        tick={{ fontSize: 12, fill: '#6b7280' }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                    <Area
                        type="monotone"
                        dataKey="revenue"
                        name="Revenue"
                        stroke="#16a34a"
                        fill="url(#colorRevenue)"
                        strokeWidth={2}
                    />
                    <Area
                        type="monotone"
                        dataKey="expenses"
                        name="Expenses"
                        stroke="#ea580c"
                        fill="url(#colorExpenses)"
                        strokeWidth={2}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </ChartCard>
    );
};
