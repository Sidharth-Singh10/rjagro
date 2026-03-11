'use client'
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer,
} from 'recharts';
import { ChartCard } from './chart_card';

export interface SaleRateData {
    month: string;
    avgRate: number;
}

interface Props {
    data: SaleRateData[];
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

export const AvgSaleRateChart = ({ data }: Props) => {
    if (data.length === 0) {
        return (
            <ChartCard title="Avg Sale Rate Trend">
                <div className="h-[300px] flex items-center justify-center text-sm text-gray-400">
                    No sales data yet
                </div>
            </ChartCard>
        );
    }

    return (
        <ChartCard title="Avg Sale Rate Trend (₹/kg)">
            <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6b7280' }} />
                    <YAxis
                        tickFormatter={(v) => `₹${v}`}
                        tick={{ fontSize: 11, fill: '#6b7280' }}
                        domain={['auto', 'auto']}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Line
                        type="monotone"
                        dataKey="avgRate"
                        stroke="#7c3aed"
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: '#7c3aed', strokeWidth: 2, stroke: '#fff' }}
                        activeDot={{ r: 6, stroke: '#7c3aed', strokeWidth: 2 }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </ChartCard>
    );
};
