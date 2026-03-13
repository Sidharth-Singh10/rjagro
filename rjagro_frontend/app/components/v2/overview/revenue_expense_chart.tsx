'use client'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ChartCard } from './chart_card';

interface BatchEntry {
    batchId: number;
    amount: number;
}

export interface RevExpDataPoint {
    date: string;
    dateRaw: string;
    revenue: number;
    expenses: number;
    expenseBatches: BatchEntry[];
    revenueBatches: BatchEntry[];
}

interface Props {
    data: RevExpDataPoint[];
    filterMode: 'month' | 'custom';
    onFilterModeChange: (mode: 'month' | 'custom') => void;
    selectedMonth: string;
    onSelectedMonthChange: (v: string) => void;
    availableMonths: string[];
    customFrom: string;
    onCustomFromChange: (v: string) => void;
    customTo: string;
    onCustomToChange: (v: string) => void;
}

const fmt = (v: number) => `₹${v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const monthLabel = (key: string) => {
    const [year, month] = key.split('-');
    const d = new Date(parseInt(year), parseInt(month) - 1);
    return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
};

const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const point: RevExpDataPoint = payload[0]?.payload;
    if (!point) return null;

    return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-100 text-xs max-w-[260px]">
            <p className="font-semibold text-gray-700 mb-2">{point.date}</p>

            <div className="mb-2">
                <p className="font-medium text-green-600 mb-0.5">Revenue: {fmt(point.revenue)}</p>
                {point.revenueBatches.length > 0 && (
                    <div className="pl-2 space-y-0.5 text-gray-500">
                        {point.revenueBatches.map(b => (
                            <p key={b.batchId}>Batch {b.batchId}: {fmt(b.amount)}</p>
                        ))}
                    </div>
                )}
            </div>

            <div>
                <p className="font-medium text-orange-600 mb-0.5">Expenses: {fmt(point.expenses)}</p>
                {point.expenseBatches.length > 0 && (
                    <div className="pl-2 space-y-0.5 text-gray-500">
                        {point.expenseBatches.map(b => (
                            <p key={b.batchId}>Batch {b.batchId}: {fmt(b.amount)}</p>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

const FilterControls = ({
    filterMode, onFilterModeChange,
    selectedMonth, onSelectedMonthChange, availableMonths,
    customFrom, onCustomFromChange,
    customTo, onCustomToChange,
}: Omit<Props, 'data'>) => (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
        <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
            <button
                onClick={() => onFilterModeChange('month')}
                className={`px-3 py-1.5 font-medium transition-colors ${
                    filterMode === 'month'
                        ? 'bg-gray-800 text-white'
                        : 'bg-white text-gray-500 hover:bg-gray-50'
                }`}
            >
                Month
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

        {filterMode === 'month' ? (
            <select
                value={selectedMonth}
                onChange={e => onSelectedMonthChange(e.target.value)}
                className="border border-gray-200 rounded-md px-2 py-1.5 text-xs text-gray-600 bg-white focus:outline-none focus:ring-1 focus:ring-gray-300 cursor-pointer"
            >
                {availableMonths.map(m => (
                    <option key={m} value={m}>{monthLabel(m)}</option>
                ))}
            </select>
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
    selectedMonth, onSelectedMonthChange, availableMonths,
    customFrom, onCustomFromChange,
    customTo, onCustomToChange,
}: Props) => {
    const controls = (
        <FilterControls
            filterMode={filterMode} onFilterModeChange={onFilterModeChange}
            selectedMonth={selectedMonth} onSelectedMonthChange={onSelectedMonthChange}
            availableMonths={availableMonths}
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
                <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#6b7280' }} />
                    <YAxis
                        tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                        tick={{ fontSize: 12, fill: '#6b7280' }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                    <Line
                        type="monotone"
                        dataKey="revenue"
                        name="Revenue"
                        stroke="#16a34a"
                        strokeWidth={2}
                        dot={{ r: 4, fill: '#16a34a' }}
                        activeDot={{ r: 6 }}
                    />
                    <Line
                        type="monotone"
                        dataKey="expenses"
                        name="Expenses"
                        stroke="#ea580c"
                        strokeWidth={2}
                        dot={{ r: 4, fill: '#ea580c' }}
                        activeDot={{ r: 6 }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </ChartCard>
    );
};
