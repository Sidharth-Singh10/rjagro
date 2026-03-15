'use client'
import { memo, useCallback } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts';
import { ChartCard } from './chart_card';

export interface FeedBreakdownItem {
    itemName: string;
    qty: number;
    unit: string;
    kg: number;
}

export interface SalesBreakdownItem {
    quantity: number;
    avgWeight: number;
    totalWeight: number;
}

export interface FCRData {
    label: string;
    fcr: number;
    batchId: number;
    totalFeedKg: number;
    totalWeightKg: number;
    feedBreakdown: FeedBreakdownItem[];
    salesBreakdown: SalesBreakdownItem[];
}

interface Props {
    data: FCRData[];
    onBarClick?: (entry: FCRData) => void;
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
            <p className="text-[10px] text-gray-400 mt-1">Click for breakdown</p>
        </div>
    );
};

export const FCRChart = memo(({ data, onBarClick }: Props) => {
    const handleBarClick = useCallback((barData: any) => {
        if (onBarClick && barData?.payload) {
            onBarClick(barData.payload as FCRData);
        }
    }, [onBarClick]);

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
            <p className="text-[11px] text-gray-400 -mt-2 mb-2">
                FCR = kg of feed consumed per kg of live weight sold. Lower is better — below 1.6 is ideal; above 2.0 signals inefficiency.
            </p>
            <ResponsiveContainer width="100%" height={320}>
                <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                        type="number"
                        tick={{ fontSize: 11, fill: '#6b7280' }}
                        domain={[0, (max: number) => Math.max(max * 1.15, 2.5)]}
                        ticks={[0, 0.65, 1.3, 1.6, 1.95, 2.5]}
                    />
                    <YAxis
                        type="category"
                        dataKey="label"
                        tick={{ fontSize: 11, fill: '#6b7280' }}
                        width={90}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <ReferenceLine
                        x={1.6}
                        stroke="#ef4444"
                        strokeDasharray="4 3"
                        strokeWidth={1.5}
                        label={{
                            value: 'Target 1.6',
                            position: 'top',
                            fontSize: 10,
                            fill: '#ef4444',
                        }}
                    />
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
                    <Bar
                        dataKey="fcr"
                        name="FCR"
                        radius={[0, 4, 4, 0]}
                        activeBar={false}
                        onClick={handleBarClick}
                        cursor={onBarClick ? 'pointer' : undefined}
                    >
                        {data.map((entry, idx) => (
                            <Cell key={idx} fill={getColor(entry.fcr)} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </ChartCard>
    );
});
FCRChart.displayName = 'FCRChart';
