'use client'
import {
    memo, useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import {
    Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { ChartCard } from '../v2/overview/chart_card';
import { chart } from '../v2/overview/chart_colors';
import { formatRate, type BucketStat } from '@/app/utils/rate_tracker';

type AxisRange = [number, number];

/** Headroom in ₹ left above the high and below the low before snapping the default domain. */
const DOMAIN_PAD = 2;
/** The default domain snaps outward to multiples of this, so bars nearly touch the frame. */
const DOMAIN_STEP = 5;
/** Narrowest window, so zooming can never collapse into a degenerate axis or overlapping labels. */
const MIN_SPAN = 20;
/** Scale factor per zoom-in click; zooming out multiplies by its inverse. */
const ZOOM_STEP = 0.7;
/** Gentler factor for one wheel notch. */
const WHEEL_STEP = 1.15;
/** Nice tick intervals in ₹; the smallest that still gives 4–6 labels wins. */
const TICK_STEPS = [5, 10, 15, 20, 25] as const;
const MIN_TICKS = 4;
const MAX_TICKS = 6;

const round2 = (value: number) => Math.round(value * 100) / 100;

/**
 * Tight default scale: the real min of the monthly lows to the real max of the
 * monthly highs, padded by a couple of rupees and snapped to a 5-unit step.
 * The old 10-unit round wasted vertical room and flattened the bars.
 */
const defaultDomain = (months: BucketStat[]): AxisRange => {
    if (months.length === 0) return [0, 100];
    const low = Math.min(...months.map(month => month.min));
    const high = Math.max(...months.map(month => month.max));
    return [
        Math.floor((low - DOMAIN_PAD) / DOMAIN_STEP) * DOMAIN_STEP,
        Math.ceil((high + DOMAIN_PAD) / DOMAIN_STEP) * DOMAIN_STEP,
    ];
};

/**
 * Widen or narrow `current` around its own centre, then slide it back inside
 * the default domain. Clamping to `bounds` keeps both guarantees in one place:
 * the window never shows empty space beyond the default scale (so zooming out
 * cannot exceed it) and never leaves the priced range behind.
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

const ticksFor = ([low, high]: AxisRange, step: number) => {
    const ticks: number[] = [];
    for (let value = Math.ceil(low / step) * step; value <= high + 1e-6; value += step) {
        ticks.push(Math.round(value));
    }
    return ticks;
};

/**
 * Ticks are derived from the visible span rather than left to Recharts, so a
 * zoomed window still gets round numbers instead of generics of the range.
 */
const axisTicks = (domain: AxisRange): number[] => {
    let coarsest: number[] = [];
    for (const step of TICK_STEPS) {
        const ticks = ticksFor(domain, step);
        coarsest = ticks;
        if (ticks.length >= MIN_TICKS && ticks.length <= MAX_TICKS) return ticks;
    }
    return coarsest.length >= 2 ? coarsest : [domain[0], domain[1]];
};

const MonthlyTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const month: BucketStat = payload[0].payload;
    return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-100 text-xs space-y-1">
            <p className="font-semibold text-gray-700">{month.longLabel}</p>
            <p style={{ color: chart.brand }}>Average {formatRate(month.avg)}/kg</p>
            <p className="text-gray-500">
                Range {formatRate(month.min, 0)} – {formatRate(month.max, 0)}
            </p>
            <p className="text-gray-400">
                {month.observed} of {month.span} days quoted
            </p>
        </div>
    );
};

const LegendChip = ({ color, label }: { color: string; label: string }) => (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-gray-500">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
        {label}
    </span>
);

const buttonBox = 'px-2.5 py-1 font-medium tabular-nums transition-colors disabled:opacity-40 disabled:cursor-not-allowed';

export const MonthlyRateChart = memo(({ months }: { months: BucketStat[] }) => {
    const bounds = useMemo(() => defaultDomain(months), [months]);
    const [visible, setVisible] = useState<AxisRange | null>(null);

    const domain = visible ?? bounds;
    const span = domain[1] - domain[0];
    const atMinSpan = span <= MIN_SPAN + 0.01;
    const isDefault = sameDomain(domain, bounds);

    const applyZoom = useCallback((factor: number) => {
        setVisible(current => zoomDomain(current ?? bounds, factor, bounds));
    }, [bounds]);

    const resetZoom = useCallback(() => setVisible(null), []);

    // React attaches onWheel passively at the root, so preventDefault() there is a
    // no-op plus a console warning. A native listener on the plot wrapper can both
    // stop the page from scrolling and zoom. At a limit we let the page scroll.
    const plotRef = useRef<HTMLDivElement | null>(null);
    useEffect(() => {
        const node = plotRef.current;
        if (!node) return;

        const onWheel = (event: WheelEvent) => {
            if (event.deltaY === 0) return;
            const current = visible ?? bounds;
            const factor = event.deltaY < 0 ? 1 / WHEEL_STEP : WHEEL_STEP;
            const next = zoomDomain(current, factor, bounds);
            if (sameDomain(next, current)) return;
            event.preventDefault();
            setVisible(next);
        };

        node.addEventListener('wheel', onWheel, { passive: false });
        return () => node.removeEventListener('wheel', onWheel);
    }, [bounds, visible]);

    const legend = (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <LegendChip color={chart.brand} label="Average" />
            <LegendChip color={chart.slate} label="High / low" />
        </div>
    );

    const controls = months.length === 0 ? legend : (
        <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-2">
            {legend}
            <div className="flex items-center gap-2">
                <span
                    className="text-[11px] text-gray-400 tabular-nums"
                    title="Visible rate range"
                >
                    {`${formatRate(Math.round(domain[0]), 0)}–${formatRate(Math.round(domain[1]), 0)}/kg`}
                </span>
                <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
                    <button
                        type="button"
                        onClick={() => applyZoom(1 / ZOOM_STEP)}
                        disabled={isDefault}
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
                        disabled={isDefault}
                        aria-label="Reset Y axis zoom"
                        title="Reset to the default ₹ range"
                        className={`${buttonBox} ${
                            isDefault
                                ? 'bg-white text-gray-400'
                                : 'bg-gray-800 text-white hover:bg-gray-700'
                        }`}
                    >
                        Reset
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <ChartCard title="Monthly wholesale rate (₹/kg)" headerControls={controls}>
            {months.length === 0 ? (
                <div className="h-[320px] flex items-center justify-center text-sm text-gray-400">
                    No rate data yet
                </div>
            ) : (
                <div ref={plotRef}>
                    <ResponsiveContainer width="100%" height={320}>
                        <ComposedChart data={months} margin={{ top: 8, right: 16, left: 4, bottom: 4 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
                            <XAxis
                                dataKey="label"
                                tick={{ fontSize: 11, fill: chart.tick }}
                                interval={0}
                                angle={-40}
                                textAnchor="end"
                                height={48}
                            />
                            <YAxis
                                tickFormatter={(value) => `₹${value}`}
                                tick={{ fontSize: 11, fill: chart.tick }}
                                domain={domain}
                                ticks={axisTicks(domain)}
                                allowDataOverflow
                                width={52}
                            />
                            <Tooltip content={<MonthlyTooltip />} cursor={{ fill: 'rgba(52,113,74,0.06)' }} />
                            <Line
                                type="monotone"
                                dataKey="max"
                                name="High"
                                stroke={chart.slate}
                                strokeWidth={1.5}
                                strokeDasharray="4 3"
                                dot={false}
                                activeDot={false}
                                isAnimationActive={false}
                            />
                            <Line
                                type="monotone"
                                dataKey="min"
                                name="Low"
                                stroke={chart.slate}
                                strokeWidth={1.5}
                                strokeDasharray="4 3"
                                dot={false}
                                activeDot={false}
                                isAnimationActive={false}
                            />
                            <Bar
                                dataKey="avg"
                                name="Average"
                                fill={chart.brand}
                                radius={[4, 4, 0, 0]}
                                maxBarSize={38}
                                isAnimationActive={false}
                            />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            )}
        </ChartCard>
    );
});
MonthlyRateChart.displayName = 'MonthlyRateChart';
