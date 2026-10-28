'use client'
import { memo, useMemo, useState } from 'react';
import { CalendarRange } from 'lucide-react';
import {
    CartesianGrid, Line, LineChart, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { ChartCard } from '../v2/overview/chart_card';
import { chart } from '../v2/overview/chart_colors';
import {
    formatRate, type BestWindow, type DailyPoint,
} from '@/app/utils/rate_tracker';
import { type ChickenEvent } from '@/app/utils/event_calendar';
import { impactColor } from './events/event_chips';

interface Props {
    days: DailyPoint[];
    best5: BestWindow | null;
    best7: BestWindow | null;
    /** Optional event calendar overlay; the price series is never modified by it. */
    events?: ChickenEvent[];
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const tickLabel = (iso: string) =>
    `${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1]}`;

const fullDate = (iso: string) =>
    `${tickLabel(iso)} ${iso.slice(0, 4)}`;

const domain = (days: DailyPoint[]): [number, number] => {
    const values = days.map(day => day.rate).filter((value): value is number => value !== null);
    if (values.length === 0) return [0, 100];
    return [
        Math.floor((Math.min(...values) - 5) / 10) * 10,
        Math.ceil((Math.max(...values) + 5) / 10) * 10,
    ];
};

const DailyTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const day: DailyPoint = payload[0].payload;
    return (
        <div className="bg-white p-2.5 rounded-lg shadow-lg border border-gray-100 text-xs">
            <p className="font-semibold text-gray-700">{fullDate(day.date)}</p>
            {day.rate === null
                ? <p className="text-gray-400">No quote</p>
                : <p style={{ color: chart.brand }}>{formatRate(day.rate)}/kg</p>}
        </div>
    );
};

const LegendChip = ({ color, label }: { color: string; label: string }) => (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-gray-500">
        <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: color }} />
        {label}
    </span>
);

export const DailyRateChart = memo(({ days, best5, best7, events = [] }: Props) => {
    const [showEvents, setShowEvents] = useState(false);

    const chartStart = days[0]?.date ?? null;
    const chartEnd = days[days.length - 1]?.date ?? null;

    /**
     * Clip every event to the chart's current slice. ReferenceArea keys on the
     * same ISO strings the XAxis uses, and `ifOverflow="hidden"` keeps a window
     * from stretching the domain when a caller passes a narrower slice.
     */
    const eventWindows = useMemo(() => {
        if (!showEvents || chartStart === null || chartEnd === null) return [];
        return events
            // Wedding muhurats are the most numerous category and their
            // clusters would blanket the chart; the Events section covers them.
            .filter((event) => event.category !== 'wedding')
            .filter((event) => event.endDate >= chartStart && event.startDate <= chartEnd)
            .map((event) => ({
                id: event.id,
                name: event.name,
                impact: event.impact,
                start: event.startDate < chartStart ? chartStart : event.startDate,
                end: event.endDate > chartEnd ? chartEnd : event.endDate,
            }));
    }, [events, showEvents, chartStart, chartEnd]);

    const legend = (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <LegendChip color={chart.amber} label="Best 5-day" />
            <LegendChip color={chart.violet} label="Best 7-day" />
            {showEvents && <LegendChip color={chart.slate} label="Event windows by impact" />}
            <button
                type="button"
                aria-pressed={showEvents}
                onClick={() => setShowEvents((value) => !value)}
                className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors
                    focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600
                    ${showEvents
                        ? 'border-emerald-700/30 bg-emerald-50 text-emerald-800'
                        : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400 hover:bg-gray-50'}`}
            >
                <CalendarRange size={12} aria-hidden />
                Events {showEvents ? 'on' : 'off'}
            </button>
        </div>
    );

    return (
        <ChartCard title="Daily rate, with the best windows highlighted" headerControls={legend}>
            {days.length === 0 ? (
                <div className="h-[300px] flex items-center justify-center text-sm text-gray-400">
                    No rate data yet
                </div>
            ) : (
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={days} margin={{ top: 8, right: 16, left: 4, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
                        <XAxis
                            dataKey="date"
                            tickFormatter={tickLabel}
                            tick={{ fontSize: 11, fill: chart.tick }}
                            interval={Math.max(0, Math.ceil(days.length / 9) - 1)}
                            height={28}
                        />
                        <YAxis
                            tickFormatter={(value) => `₹${value}`}
                            tick={{ fontSize: 11, fill: chart.tick }}
                            domain={domain(days)}
                            width={52}
                        />
                        <Tooltip content={<DailyTooltip />} />
                        {eventWindows.map((event) => (
                            <ReferenceArea
                                key={event.id}
                                x1={event.start}
                                x2={event.end}
                                ifOverflow="hidden"
                                fill={impactColor[event.impact]}
                                fillOpacity={0.1}
                                stroke="none"
                                strokeOpacity={0}
                            />
                        ))}
                        {best7 && (
                            <ReferenceArea
                                x1={best7.start}
                                x2={best7.end}
                                fill={chart.violet}
                                fillOpacity={0.16}
                                stroke={chart.violet}
                                strokeOpacity={0.35}
                            />
                        )}
                        {best5 && (
                            <ReferenceArea
                                x1={best5.start}
                                x2={best5.end}
                                fill={chart.amber}
                                fillOpacity={0.3}
                                stroke={chart.amber}
                                strokeOpacity={0.55}
                            />
                        )}
                        <Line
                            type="monotone"
                            dataKey="rate"
                            name="Daily rate"
                            stroke={chart.brand}
                            strokeWidth={1.5}
                            dot={false}
                            connectNulls={false}
                            activeDot={{ r: 4, stroke: chart.brand, strokeWidth: 2, fill: '#fff' }}
                            isAnimationActive={false}
                        />
                    </LineChart>
                </ResponsiveContainer>
            )}
        </ChartCard>
    );
});
DailyRateChart.displayName = 'DailyRateChart';
