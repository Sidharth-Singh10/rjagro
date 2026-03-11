'use client'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts';
import { ChartCard } from './chart_card';

export interface FCRData {
    label: string;
    fcr: number;
}

interface Props {
    data: FCRData[];
}

const getColor = (fcr: number) => {
    if (fcr <= 1.7) return '#16a34a';
    if (fcr <= 2.0) return '#f59e0b';
    return '#ef4444';
};

const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const { label, fcr } = payload[0].payload;
    return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-100 text-xs">
            <p className="font-semibold text-gray-700">{label}</p>
            <p style={{ color: getColor(fcr) }}>FCR: {fcr.toFixed(2)}</p>
        </div>
    );
};

export const FCRChart = ({ data }: Props) => {
    if (data.length === 0) {
        return (
            <ChartCard title="Feed Conversion Ratio (FCR)">
                <div className="h-[340px] flex items-center justify-center text-sm text-gray-400">
                    No FCR data available
                </div>
            </ChartCard>
        );
    }

    return (
        <ChartCard title="Feed Conversion Ratio (FCR)">
            <ResponsiveContainer width="100%" height={340}>
                <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                        type="number"
                        tick={{ fontSize: 11, fill: '#6b7280' }}
                        domain={[0, (max: number) => Math.max(max * 1.15, 2.5)]}
                    />
                    <YAxis
                        type="category"
                        dataKey="label"
                        tick={{ fontSize: 11, fill: '#6b7280' }}
                        width={90}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <ReferenceLine
                        x={1.8}
                        stroke="#6b7280"
                        strokeDasharray="6 4"
                        strokeWidth={1.5}
                        label={{
                            value: 'Benchmark 1.8',
                            position: 'top',
                            fontSize: 10,
                            fill: '#6b7280',
                        }}
                    />
                    <Bar dataKey="fcr" name="FCR" radius={[0, 4, 4, 0]}>
                        {data.map((entry, idx) => (
                            <Cell key={idx} fill={getColor(entry.fcr)} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </ChartCard>
    );
};
