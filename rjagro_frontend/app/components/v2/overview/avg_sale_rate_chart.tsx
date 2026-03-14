'use client'
import { memo } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer,
} from 'recharts';
import { ChartCard } from './chart_card';

export interface SaleRateData {
    label: string;
    avgRate: number;
}

interface Props {
    data: SaleRateData[];
    mode: 'monthly' | 'continuous';
    onModeChange: (mode: 'monthly' | 'continuous') => void;
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-100 text-xs">
            <p className="font-semibold text-gray-700 mb-1">{label}</p>
            <p style={{ color: '#7c3aed' }}>
                Avg Rate: ₹{Number(payload[0].value).toFixed(2)}/kg
            </p>
        </div>
    );
};

const ModeToggle = ({ mode, onModeChange }: Pick<Props, 'mode' | 'onModeChange'>) => (
    <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
        <button
            onClick={() => onModeChange('monthly')}
            className={`px-2.5 py-1 font-medium transition-colors ${
                mode === 'monthly'
                    ? 'bg-gray-800 text-white'
                    : 'bg-white text-gray-500 hover:bg-gray-50'
            }`}
        >
            Monthly
        </button>
        <button
            onClick={() => onModeChange('continuous')}
            className={`px-2.5 py-1 font-medium transition-colors ${
                mode === 'continuous'
                    ? 'bg-gray-800 text-white'
                    : 'bg-white text-gray-500 hover:bg-gray-50'
            }`}
        >
            Daily
        </button>
    </div>
);

export const AvgSaleRateChart = memo(({ data, mode, onModeChange }: Props) => {
    const toggle = <ModeToggle mode={mode} onModeChange={onModeChange} />;

    if (data.length === 0) {
        return (
            <ChartCard title="Avg Sale Rate Trend (₹/kg)" headerControls={toggle}>
                <div className="h-[300px] flex items-center justify-center text-sm text-gray-400">
                    No sales data yet
                </div>
            </ChartCard>
        );
    }

    return (
        <ChartCard title="Avg Sale Rate Trend (₹/kg)" headerControls={toggle}>
            <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                        dataKey="label"
                        tick={{ fontSize: 11, fill: '#6b7280' }}
                        interval={mode === 'continuous' ? 'preserveStartEnd' : 0}
                        angle={mode === 'continuous' ? -45 : 0}
                        textAnchor={mode === 'continuous' ? 'end' : 'middle'}
                        height={mode === 'continuous' ? 50 : 30}
                    />
                    <YAxis
                        tickFormatter={(v) => `₹${v}`}
                        tick={{ fontSize: 11, fill: '#6b7280' }}
                        domain={[80, 150]}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Line
                        type="monotone"
                        dataKey="avgRate"
                        stroke="#7c3aed"
                        strokeWidth={2.5}
                        dot={mode === 'monthly'
                            ? { r: 4, fill: '#7c3aed', strokeWidth: 2, stroke: '#fff' }
                            : { r: 2, fill: '#7c3aed' }
                        }
                        activeDot={{ r: 6, stroke: '#7c3aed', strokeWidth: 2 }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </ChartCard>
    );
});
AvgSaleRateChart.displayName = 'AvgSaleRateChart';
