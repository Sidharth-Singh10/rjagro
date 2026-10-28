'use client'
import { memo, useMemo, useState } from 'react';
import { CalendarRange } from 'lucide-react';
import { GraphRenderer } from '@graphysdk/react';
import type { Data, GraphSlots, TooltipSlotProps } from '@graphysdk/react';
import { ChartCard } from '../v2/overview/chart_card';
import { chart } from '../v2/overview/chart_colors';
import {
    formatRate, type BestWindow, type DailyPoint,
} from '@/app/utils/rate_tracker';
import { type ChickenEvent } from '@/app/utils/event_calendar';
import { impactColor } from './events/event_chips';
import { graphyKit } from './graphy/price_bar_geom';
import surface from './graphy/graphy_surface.module.css';

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

/**
 * The hovered day, read off the tooltip's row key (`<layerId>:<pointIndex>`).
 * Graphy hands a slot only formatted strings, so the index is what ties a row
 * back to the observation it came from.
 */
const observationAt = <T,>(rows: TooltipSlotProps['content']['rows'], series: T[]): T | null => {
    const row = rows.find(candidate => candidate.primary) ?? rows[0];
    if (!row) return null;
    const index = Number(row.key.slice(row.key.lastIndexOf(':') + 1));
    return series[index] ?? null;
};

const DailyTooltip = ({ content, days }: TooltipSlotProps & { days: DailyPoint[] }) => {
    const day = observationAt(content.rows, days);
    if (day === null) return null;
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

const epochOf = (iso: string) => Date.UTC(
    Number(iso.slice(0, 4)),
    Number(iso.slice(5, 7)) - 1,
    Number(iso.slice(8, 10)),
);

/** Where a date sits on the plot, 0 to 1. The x domain is exactly the series extent. */
const fractionAt = (iso: string, firstEpoch: number, lastEpoch: number) => {
    const span = lastEpoch - firstEpoch;
    if (span <= 0) return 0;
    return Math.min(1, Math.max(0, (epochOf(iso) - firstEpoch) / span));
};

/**
 * A shaded window, spanning the full panel height between two dates, as the
 * chart's reference areas always have. Anchored on the panel rather than on the
 * observations inside the window: an event that falls on a day with no quote has
 * no observation to anchor to, and a window found only by its dates is what the
 * reader is being shown.
 */
const windowRegion = (start: string, end: string, firstEpoch: number, lastEpoch: number) => {
    const from = fractionAt(start, firstEpoch, lastEpoch);
    const to = fractionAt(end, firstEpoch, lastEpoch);
    return {
        anchorType: 'panel' as const,
        x: Math.min(from, to),
        y: 0,
        width: Math.abs(to - from),
        height: 1,
    };
};

export const DailyRateChart = memo(({ days, best5, best7, events = [] }: Props) => {
    const [showEvents, setShowEvents] = useState(false);

    const chartStart = days[0]?.date ?? null;
    const chartEnd = days[days.length - 1]?.date ?? null;

    /**
     * Clip every event to the chart's current slice. The shaded band is placed by
     * date, so a window that starts before the series still begins at the chart's
     * first day, exactly as the clipped Recharts reference area did.
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

    const data = useMemo<Data>(() => ({
        columns: [
            { key: 'date' },
            { key: 'rate', label: 'Daily rate', valueFormat: { type: 'currency', iso: 'inr' } },
        ],
        // Days without a quote stay in the table with a null rate: that gap is
        // what breaks the line.
        rows: days.map(day => ({ date: day.date, rate: day.rate })),
    }), [days]);

    const [domainMin, domainMax] = useMemo(() => domain(days), [days]);

    const span = useMemo(() => {
        if (chartStart === null || chartEnd === null) return null;
        return { first: epochOf(chartStart), last: epochOf(chartEnd) };
    }, [chartStart, chartEnd]);

    const spec = useMemo(() => {
        // The card only renders with at least one day, so the series extent exists.
        const first = span?.first ?? 0;
        const last = span?.last ?? 0;
        const region = (start: string, end: string) => windowRegion(start, end, first, last);

        const annotations = [
            ...(best7 === null ? [] : [
                graphyKit.annotation.shape({
                    id: 'best-7',
                    zOrder: 'background' as const,
                    region: region(best7.start, best7.end),
                }),
            ]),
            ...(best5 === null ? [] : [
                graphyKit.annotation.shape({
                    id: 'best-5',
                    zOrder: 'background' as const,
                    region: region(best5.start, best5.end),
                }),
            ]),
            ...eventWindows.map(event => graphyKit.annotation.shape({
                id: `event-${event.id}`,
                zOrder: 'background' as const,
                region: region(event.start, event.end),
            })),
        ];

        return graphyKit.pipe(
            graphyKit.createSpec({ x: 'date', y: 'rate' }),
            graphyKit.geom.line({ id: 'daily', params: { missingValues: 'gap' } }),
            graphyKit.scale.x.datetime(),
            graphyKit.scale.y.continuous({ domainMin, domainMax }),
            graphyKit.config({
                legend: { position: 'none' },
                tooltip: { mode: 'observation' },
                numberFormat: { decimals: 0 },
                axes: {
                    x: { label: '', grid: { visible: false }, ticks: { visible: true, mode: 'auto' } },
                    y: { label: '', position: 'left', ticks: { visible: true, mode: 'auto' } },
                },
            }),
            ...annotations,
            graphyKit.styles({
                defaults: [
                    graphyKit.style.graph({
                        fill: 'transparent',
                        strokeWidth: 0,
                        padding: { top: 8, right: 12, bottom: 8, left: 4 },
                    }),
                    graphyKit.style.panelBorder({ strokeWidth: 0 }),
                    graphyKit.style.tickLabel({ textColor: chart.tick, fontSize: 11 }),
                    graphyKit.style.geom.line({ stroke: chart.brand, strokeWidth: 1.5 }, { layer: 'daily' }),
                ],
                overrides: [
                    // Painted behind the line, in the order the previous chart stacked
                    // them: 7-day window, then 5-day, then the event bands on top.
                    graphyKit.style.annotation.shape(
                        { fill: chart.violet, fillAlpha: 0.16, stroke: chart.violet, strokeWidth: 0 },
                        { annotation: 'best-7' },
                    ),
                    graphyKit.style.annotation.shape(
                        { fill: chart.amber, fillAlpha: 0.3, stroke: chart.amber, strokeWidth: 0 },
                        { annotation: 'best-5' },
                    ),
                    ...eventWindows.map(event => graphyKit.style.annotation.shape(
                        { fill: impactColor[event.impact], fillAlpha: 0.1, strokeWidth: 0 },
                        { annotation: `event-${event.id}` },
                    )),
                ],
            }),
        );
    }, [best5, best7, domainMin, domainMax, eventWindows, span]);

    const slots = useMemo<GraphSlots>(() => ({
        Tooltip: (props: TooltipSlotProps) => <DailyTooltip {...props} days={days} />,
    }), [days]);

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
                <div className={surface.clipped} style={{ height: 300 }}>
                    <graphyKit.GraphProvider data={data} spec={spec} formattingLocale="en-GB">
                        <GraphRenderer animation={false} slots={slots} />
                    </graphyKit.GraphProvider>
                </div>
            )}
        </ChartCard>
    );
});
DailyRateChart.displayName = 'DailyRateChart';
