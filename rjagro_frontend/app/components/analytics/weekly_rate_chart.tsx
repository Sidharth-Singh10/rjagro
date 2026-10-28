'use client'
import {
    memo, useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import { GraphRenderer } from '@graphysdk/react';
import type { Data, GraphSlots, TooltipSlotProps } from '@graphysdk/react';
import { ChartCard } from '../v2/overview/chart_card';
import { chart } from '../v2/overview/chart_colors';
import { formatRate, type WeeklyPoint } from '@/app/utils/rate_tracker';
import { graphyKit } from './graphy/price_bar_geom';
import surface from './graphy/graphy_surface.module.css';

type WeekRange = '26w' | '52w' | 'all';
type AxisRange = [number, number];

const RANGE_OPTIONS: { key: WeekRange; label: string; weeks: number }[] = [
    { key: '26w', label: '26W', weeks: 26 },
    { key: '52w', label: '52W', weeks: 52 },
    { key: 'all', label: 'All', weeks: Number.POSITIVE_INFINITY },
];

/** Headroom in ₹ left above the high and below the low before snapping the auto domain. */
const DOMAIN_PAD = 3;
/** The auto domain snaps outward to multiples of this, so the series fills the frame. */
const DOMAIN_STEP = 5;
/** Narrowest window, so zooming can never collapse into a degenerate axis or overlapping labels. */
const MIN_SPAN = 20;
/** Scale factor per zoom-in click; zooming out multiplies by its inverse. */
const ZOOM_STEP = 0.7;
/** Gentler factor for one wheel notch. */
const WHEEL_STEP = 1.15;

const round2 = (value: number) => Math.round(value * 100) / 100;

const ratesOf = (weeks: WeeklyPoint[]) =>
    weeks.map(week => week.avg).filter((value): value is number => value !== null);

/**
 * Tight default scale for the selected date slice: the real min of the weekly
 * averages to the real max, padded by a few rupees, snapped to a 5-unit step and
 * never narrower than MIN_SPAN so a flat or short slice still gets readable ticks.
 */
const autoDomain = (weeks: WeeklyPoint[]): AxisRange => {
    const values = ratesOf(weeks);
    if (values.length === 0) return [0, 100];

    let low = Math.floor((Math.min(...values) - DOMAIN_PAD) / DOMAIN_STEP) * DOMAIN_STEP;
    let high = Math.ceil((Math.max(...values) + DOMAIN_PAD) / DOMAIN_STEP) * DOMAIN_STEP;
    if (high - low < MIN_SPAN) {
        const centre = (low + high) / 2;
        low = Math.floor((centre - MIN_SPAN / 2) / DOMAIN_STEP) * DOMAIN_STEP;
        high = low + MIN_SPAN;
    }
    return [low, high];
};

/**
 * Widen or narrow `current` around its own centre, then slide it back inside
 * the auto bounds. Clamping in one place gives both guarantees: the centre of the
 * visible price stays put, the window never leaves the slice's real extent when
 * zooming out, and it never shrinks below MIN_SPAN.
 */
const zoomDomain = (current: AxisRange, factor: number, bounds: AxisRange): AxisRange => {
    const boundsSpan = bounds[1] - bounds[0];
    const span = Math.max(MIN_SPAN, Math.min(boundsSpan, (current[1] - current[0]) * factor));
    const centre = (current[0] + current[1]) / 2;
    const low = Math.min(Math.max(centre - span / 2, bounds[0]), bounds[1] - span);
    return [round2(low), round2(low + span)];
};

const sameDomain = (a: AxisRange, b: AxisRange) =>
    Math.abs(a[0] - b[0]) < 0.01 && Math.abs(a[1] - b[1]) < 0.01;

/**
 * The hovered week, read off the tooltip's row key (`<layerId>:<pointIndex>`).
 * Graphy hands a slot only formatted strings, so the index is what ties a row
 * back to the observation it came from.
 */
const observationAt = <T,>(rows: TooltipSlotProps['content']['rows'], series: T[]): T | null => {
    const row = rows.find(candidate => candidate.primary) ?? rows[0];
    if (!row) return null;
    const index = Number(row.key.slice(row.key.lastIndexOf(':') + 1));
    return series[index] ?? null;
};

const WeeklyTooltip = ({ content, weeks }: TooltipSlotProps & { weeks: WeeklyPoint[] }) => {
    const week = observationAt(content.rows, weeks);
    if (week === null || week.avg === null) return null;
    return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-100 text-xs space-y-1">
            <p className="font-semibold text-gray-700">{week.longLabel}</p>
            <p style={{ color: chart.brand }}>Average {formatRate(week.avg)}/kg</p>
            <p className="text-gray-500">
                Range {formatRate(week.min ?? week.avg, 0)} – {formatRate(week.max ?? week.avg, 0)}
            </p>
            <p className="text-gray-400">{week.observed} of 7 days quoted</p>
        </div>
    );
};

const buttonBox = 'px-2.5 py-1 font-medium tabular-nums transition-colors disabled:opacity-40 disabled:cursor-not-allowed';

export const WeeklyRateChart = memo(({ weeks }: { weeks: WeeklyPoint[] }) => {
    const [range, setRange] = useState<WeekRange>('52w');
    /** null = Auto: the domain follows the selected slice. A tuple = Manual: the user's own window. */
    const [manual, setManual] = useState<AxisRange | null>(null);

    const visible = useMemo(() => {
        const option = RANGE_OPTIONS.find(item => item.key === range) ?? RANGE_OPTIONS[2];
        return Number.isFinite(option.weeks) ? weeks.slice(-option.weeks) : weeks;
    }, [weeks, range]);

    const values = useMemo(() => ratesOf(visible), [visible]);
    const bounds = useMemo(() => autoDomain(visible), [visible]);

    const domain = manual ?? bounds;
    const span = domain[1] - domain[0];
    const atMinSpan = span <= MIN_SPAN + 0.01;
    const atFullSpan = manual === null || sameDomain(manual, bounds);
    const [domainMin, domainMax] = domain;

    // A manual window survives a 26W/52W/All switch, so it can end up entirely
    // outside the new slice. Say so instead of showing an unexplained empty frame.
    const clipped = manual !== null
        && values.length > 0
        && !values.some(value => value >= domain[0] && value <= domain[1]);

    const applyZoom = useCallback((factor: number) => {
        setManual(current => zoomDomain(current ?? bounds, factor, bounds));
    }, [bounds]);

    const resetZoom = useCallback(() => setManual(null), []);

    // React attaches onWheel passively at the root, so preventDefault() there is a
    // no-op plus a console warning. A native listener on the plot wrapper can both
    // stop the page from scrolling and zoom. At a limit we let the page scroll.
    const plotRef = useRef<HTMLDivElement | null>(null);
    useEffect(() => {
        const node = plotRef.current;
        if (!node) return;

        const onWheel = (event: WheelEvent) => {
            if (event.deltaY === 0) return;
            const current = manual ?? bounds;
            const factor = event.deltaY < 0 ? 1 / WHEEL_STEP : WHEEL_STEP;
            const next = zoomDomain(current, factor, bounds);
            if (sameDomain(next, current)) return;
            event.preventDefault();
            setManual(next);
        };

        node.addEventListener('wheel', onWheel, { passive: false });
        return () => node.removeEventListener('wheel', onWheel);
    }, [bounds, manual]);

    const data = useMemo<Data>(() => ({
        // A real date, so the axis spaces weeks by time. Missing weeks keep their
        // row with a null average, which is what breaks the line.
        columns: [
            { key: 'week' },
            { key: 'avg', label: 'Weekly average', valueFormat: { type: 'currency', iso: 'inr' } },
        ],
        rows: visible.map(week => ({ week: week.key, avg: week.avg })),
    }), [visible]);

    const spec = useMemo(() => graphyKit.pipe(
        graphyKit.createSpec({ x: 'week', y: 'avg' }),
        // 'gap' is the line default; stated here because interpolating across an
        // outage is the one thing this chart must never do.
        graphyKit.geom.line({ id: 'weekly', params: { missingValues: 'gap' } }),
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
        graphyKit.styles({
            defaults: [
                graphyKit.style.graph({
                    fill: 'transparent',
                    strokeWidth: 0,
                    padding: { top: 8, right: 12, bottom: 8, left: 4 },
                }),
                graphyKit.style.panelBorder({ strokeWidth: 0 }),
                graphyKit.style.tickLabel({ textColor: chart.tick, fontSize: 11 }),
                graphyKit.style.geom.line({ stroke: chart.blue, strokeWidth: 2.25 }, { layer: 'weekly' }),
            ],
        }),
    ), [domainMin, domainMax]);

    const slots = useMemo<GraphSlots>(() => ({
        Tooltip: (props: TooltipSlotProps) => <WeeklyTooltip {...props} weeks={visible} />,
    }), [visible]);

    const readout = `${formatRate(Math.round(domain[0]), 0)}–${formatRate(Math.round(domain[1]), 0)}/kg`;

    const controls = (
        <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-2">
            <span className="text-[11px] text-gray-400 tabular-nums" title="Visible rate range">
                {readout}
            </span>
            <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
                <button
                    type="button"
                    onClick={() => applyZoom(1 / ZOOM_STEP)}
                    disabled={atFullSpan}
                    aria-label="Zoom out Y axis"
                    title="Zoom out (wider ₹ range)"
                    className={`${buttonBox} bg-white text-gray-500 hover:bg-gray-50`}
                >
                    −
                </button>
                <button
                    type="button"
                    onClick={() => applyZoom(ZOOM_STEP)}
                    disabled={atMinSpan}
                    aria-label="Zoom in Y axis"
                    title="Zoom in (narrower ₹ range)"
                    className={`${buttonBox} bg-white text-gray-500 hover:bg-gray-50`}
                >
                    +
                </button>
                <button
                    type="button"
                    onClick={resetZoom}
                    disabled={atFullSpan}
                    aria-label="Reset Y axis zoom"
                    title={clipped ? 'Show every point in this period' : 'Reset to the default ₹ range'}
                    className={`${buttonBox} ${
                        clipped
                            ? 'bg-amber-600 text-white hover:bg-amber-700'
                            : atFullSpan
                                ? 'bg-white text-gray-400'
                                : 'bg-gray-800 text-white hover:bg-gray-700'
                    }`}
                >
                    Reset
                </button>
            </div>
            <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
                {RANGE_OPTIONS.map(option => (
                    <button
                        key={option.key}
                        type="button"
                        onClick={() => setRange(option.key)}
                        aria-pressed={range === option.key}
                        className={`px-2.5 py-1 font-medium transition-colors ${
                            range === option.key
                                ? 'bg-gray-800 text-white'
                                : 'bg-white text-gray-500 hover:bg-gray-50'
                        }`}
                    >
                        {option.label}
                    </button>
                ))}
            </div>
        </div>
    );

    return (
        <ChartCard title="Weekly wholesale rate (₹/kg)" headerControls={controls}>
            {visible.length === 0 ? (
                <div className="h-[320px] flex items-center justify-center text-sm text-gray-400">
                    No rate data yet
                </div>
            ) : (
                <>
                    <div ref={plotRef} className={surface.clipped} style={{ height: 320 }}>
                        <graphyKit.GraphProvider data={data} spec={spec} formattingLocale="en-GB">
                            <GraphRenderer animation={false} slots={slots} />
                        </graphyKit.GraphProvider>
                    </div>
                    {clipped && (
                        <div
                            role="status"
                            className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800"
                        >
                            <span>
                                {`Zoomed to ${readout}, but this period's averages sit at ${formatRate(Math.round(Math.min(...values)), 0)}–${formatRate(Math.round(Math.max(...values)), 0)}/kg — every point is off screen.`}
                            </span>
                            <button
                                type="button"
                                onClick={resetZoom}
                                className="font-semibold underline underline-offset-2 hover:text-amber-900"
                            >
                                Reset zoom
                            </button>
                        </div>
                    )}
                    <p className="mt-3 text-[11px] text-gray-400">
                        Gaps are days with no quote — the line breaks rather than interpolating across an outage.
                    </p>
                </>
            )}
        </ChartCard>
    );
});
WeeklyRateChart.displayName = 'WeeklyRateChart';
