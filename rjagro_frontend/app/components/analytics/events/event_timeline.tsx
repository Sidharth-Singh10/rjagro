'use client'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CalendarX2, ChevronRight } from 'lucide-react';
import EmptyState from '../../ui/empty_state';
import Button from '../../ui/button';
import {
    categoryLabel, eventDurationDays, formatEventRange, groupByYear, impactLabel, isMultiDay,
    type ChickenEvent,
} from '@/app/utils/event_calendar';
import { ImpactIcon, impactColor } from './event_chips';
import {
    addDays, clampIso, daysInYear, monthCells, offsetPct, spanPct,
} from './event_time';

export type EventDensity = 'comfortable' | 'compact';

interface Props {
    events: ChickenEvent[];
    windowStart: string;
    windowEnd: string;
    /** Last quoted price day; later days are shown as "no price data yet". */
    priceDataEnd: string;
    referenceDate: string;
    density: EventDensity;
    /** Horizontal time scale multiplier; 1 is fit-to-width. */
    zoom: number;
    onSelect: (event: ChickenEvent) => void;
    onReset: () => void;
}

interface Metrics {
    /** Vertical pitch of one event lane. */
    lane: number;
    bar: number;
    /** Vertical pitch and height of one season band row. */
    seasonLane: number;
    seasonBar: number;
    dot: number;
}

const metricsFor = (density: EventDensity): Metrics => density === 'compact'
    ? { lane: 26, bar: 18, seasonLane: 18, seasonBar: 12, dot: 14 }
    : { lane: 32, bar: 20, seasonLane: 22, seasonBar: 16, dot: 16 };

/** Minimum rendered width, in px, before a bar is allowed to carry its name. */
const LABEL_MIN_PX = 68;

interface Placed {
    event: ChickenEvent;
    lane: number;
}

/**
 * Greedy lane packing: the first lane whose last bar ends strictly before this
 * one starts. Seasons are packed longest-first so the long monsoon/heat windows
 * take the free lanes and short festival bars fill around them.
 */
const packLanes = (events: ChickenEvent[], longestFirst = false): { placed: Placed[]; laneCount: number } => {
    const laneEnds: string[] = [];
    const placed: Placed[] = [];

    const ordered = [...events].sort((a, b) => (longestFirst
        ? eventDurationDays(b) - eventDurationDays(a) || a.startDate.localeCompare(b.startDate)
        : a.startDate.localeCompare(b.startDate)
        || eventDurationDays(b) - eventDurationDays(a)
        || a.name.localeCompare(b.name)));

    for (const event of ordered) {
        let lane = laneEnds.findIndex((end) => end < event.startDate);
        if (lane === -1) {
            laneEnds.push(event.endDate);
            lane = laneEnds.length - 1;
        } else {
            laneEnds[lane] = event.endDate;
        }
        placed.push({ event, lane });
    }

    return { placed, laneCount: Math.max(1, laneEnds.length) };
};

const impactSentence = (event: ChickenEvent) => impactLabel[event.impact];

/** Hover/focus tooltip. Rendered inside the bar so it follows the bar when scrolled. */
const HoverTip = ({ event, anchorRight }: { event: ChickenEvent; anchorRight: boolean }) => (
    <span
        className={`pointer-events-none absolute bottom-full z-50 mb-1.5 hidden w-max max-w-[228px] rounded-md
            bg-gray-900 px-2 py-1.5 text-left text-[11px] leading-snug text-white shadow-lg
            group-hover:block group-focus-within:block ${anchorRight ? 'right-0' : 'left-0'}`}
        aria-hidden
    >
        <span className="block font-semibold">{event.name}</span>
        <span className="mt-0.5 block font-normal text-gray-300">{formatEventRange(event.startDate, event.endDate)}</span>
        <span className="mt-0.5 block font-normal text-gray-300">
            {categoryLabel[event.category]} · {impactSentence(event)}
        </span>
    </span>
);

interface BarProps {
    event: ChickenEvent;
    left: number;
    /** True rendered width in px. */
    widthPx: number;
    top: number;
    height: number;
    tone: 'event' | 'season';
    clippedRight: boolean;
    onSelect: (event: ChickenEvent) => void;
}

/** A multi-day window: a quiet bar with the impact glyph at its leading edge. */
const TrackBar = memo(({
    event, left, widthPx, top, height, tone, clippedRight, onSelect,
}: BarProps) => {
    const color = impactColor[event.impact];
    const label = `${event.name}, ${formatEventRange(event.startDate, event.endDate)}, ${categoryLabel[event.category]}. ${impactSentence(event)}.`;
    const showLabel = widthPx >= LABEL_MIN_PX;

    const palette = tone === 'season'
        ? {
            border: `color-mix(in srgb, ${color} 22%, #e5e7eb)`,
            background: `color-mix(in srgb, ${color} 6%, #fbfbfc)`,
            text: 'text-gray-600',
        }
        : {
            border: `color-mix(in srgb, ${color} 32%, white)`,
            background: `color-mix(in srgb, ${color} 12%, white)`,
            text: 'text-gray-700',
        };

    // Below roughly one month of width there is no room for a name, so the mark
    // becomes a centred glyph: a clean tick rather than a clipped icon.
    const narrow = widthPx < 26;
    const glyph = narrow ? 8 : tone === 'season' ? 10 : 11;

    return (
        <div
            className="group absolute z-20 hover:z-40 focus-within:z-40"
            style={{ left: `${left}%`, width: `${widthPx}px`, top: `${top}px`, height: `${height}px` }}
        >
            <button
                type="button"
                onClick={() => onSelect(event)}
                aria-label={label}
                aria-haspopup="dialog"
                className={`flex h-full w-full items-center overflow-hidden rounded-[4px] border text-left
                    transition-[filter] hover:brightness-[0.97]
                    focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700
                    ${narrow ? 'justify-center px-0' : 'gap-1 px-1'}
                    ${tone === 'season' ? 'border-dashed' : ''}`}
                style={{ borderColor: palette.border, backgroundColor: palette.background }}
            >
                <span className="shrink-0" style={{ color }} aria-hidden>
                    <ImpactIcon impact={event.impact} size={glyph} />
                </span>
                {showLabel && (
                    <span className={`truncate text-[10px] font-medium leading-none ${palette.text}`}>
                        {event.name}
                    </span>
                )}
                {clippedRight && showLabel && (
                    <span className="ml-auto shrink-0 text-gray-400" aria-hidden>
                        <ChevronRight size={10} />
                    </span>
                )}
            </button>
            <HoverTip event={event} anchorRight={left > 55} />
        </div>
    );
});
TrackBar.displayName = 'TrackBar';

/** A single-day event: an icon dot, so it never looks like a one-day bar. */
const TrackDot = memo(({
    event, left, top, size, onSelect,
}: {
    event: ChickenEvent;
    left: number;
    top: number;
    size: number;
    onSelect: (event: ChickenEvent) => void;
}) => {
    const color = impactColor[event.impact];
    const label = `${event.name}, ${formatEventRange(event.startDate, event.endDate)}, ${categoryLabel[event.category]}. ${impactSentence(event)}.`;

    return (
        <div
            className="group absolute z-20 hover:z-40 focus-within:z-40"
            style={{
                left: `${Math.min(99.4, Math.max(0.6, left))}%`,
                top: `${top}px`,
                width: `${size}px`,
                height: `${size}px`,
                marginLeft: `${-size / 2}px`,
            }}
        >
            <button
                type="button"
                onClick={() => onSelect(event)}
                aria-label={label}
                aria-haspopup="dialog"
                className="flex items-center justify-center rounded-full border bg-white
                    transition-transform hover:scale-110
                    focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700"
                style={{ width: `${size}px`, height: `${size}px`, borderColor: color, color }}
            >
                <ImpactIcon impact={event.impact} size={size - 5} />
            </button>
            <HoverTip event={event} anchorRight={Math.min(99.4, Math.max(0.6, left)) > 55} />
        </div>
    );
});
TrackDot.displayName = 'TrackDot';

interface YearTrackProps {
    year: number;
    events: ChickenEvent[];
    windowStart: string;
    windowEnd: string;
    priceDataEnd: string;
    referenceDate: string;
    density: EventDensity;
    trackWidth: number;
    onSelect: (event: ChickenEvent) => void;
    divided: boolean;
}

const YearTrack = memo(({
    year, events, windowStart, windowEnd, priceDataEnd, referenceDate, density, trackWidth, onSelect, divided,
}: YearTrackProps) => {
    const trackStart = `${year}-01-01`;
    const trackEnd = `${year}-12-31`;
    const totalDays = daysInYear(year);

    const coveredFrom = clampIso(windowStart, trackStart, trackEnd);
    const coveredTo = clampIso(windowEnd, trackStart, trackEnd);

    const { seasonal, dated, seasonPack, eventPack } = useMemo(() => {
        const seasonEvents = events.filter((event) => event.category === 'seasonal');
        const datedEvents = events.filter((event) => event.category !== 'seasonal');
        return {
            seasonal: seasonEvents,
            dated: datedEvents,
            seasonPack: packLanes(seasonEvents, true),
            eventPack: packLanes(datedEvents),
        };
    }, [events]);

    const months = useMemo(() => monthCells(year), [year]);
    const metrics = metricsFor(density);

    const laneWidthPx = (event: ChickenEvent) => {
        const from = clampIso(event.startDate, coveredFrom, coveredTo);
        const to = clampIso(event.endDate, coveredFrom, coveredTo);
        return Math.max(10, spanPct(from, to, totalDays) * (trackWidth / 100) - 2);
    };

    const clampLeft = (iso: string) => offsetPct(clampIso(iso, coveredFrom, coveredTo), trackStart, totalDays);

    // Days outside the quoted-price window, as percentage spans of the track.
    const beforeCoverage = offsetPct(coveredFrom, trackStart, totalDays);
    const pricedUntilPct = priceDataEnd >= coveredTo
        ? 100
        : offsetPct(addDays(priceDataEnd, 1), trackStart, totalDays);
    const unpricedFromPct = Math.max(beforeCoverage, pricedUntilPct);

    const seasonHeight = seasonal.length > 0 ? seasonPack.laneCount * metrics.seasonLane : 0;
    const eventHeight = (dated.length > 0 ? eventPack.laneCount : 1) * metrics.lane;
    const referencePct = referenceDate >= coveredFrom && referenceDate <= coveredTo
        ? offsetPct(referenceDate, trackStart, totalDays)
        : null;

    return (
        <div className={divided ? 'border-t border-gray-100 pt-5' : ''}>
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <h4 className="text-xs font-semibold text-gray-800">
                    {year}
                    <span className="ml-2 font-normal text-gray-400">
                        {events.length} event{events.length === 1 ? '' : 's'}
                    </span>
                </h4>
                <span className="text-[11px] text-gray-400">{formatEventRange(coveredFrom, coveredTo)}</span>
            </div>

            {/* Month axis — 12 columns shared by every year, so rows line up. */}
            <div className="flex" aria-hidden>
                {months.map((month) => {
                    const outside = month.last < coveredFrom || month.first > coveredTo;
                    return (
                        <div
                            key={month.month}
                            style={{ width: `${month.widthPct}%` }}
                            className={`truncate border-l border-gray-100 pl-1.5 text-[11px] font-medium
                                first:border-l-0 first:pl-0 ${outside ? 'text-gray-300' : 'text-gray-500'}`}
                        >
                            {month.label}
                        </div>
                    );
                })}
            </div>

            <div
                className="relative"
                role="group"
                aria-label={`${year} event timeline`}
            >
                {/* Month gridlines run behind every band. */}
                <div className="pointer-events-none absolute inset-0 flex" aria-hidden>
                    {months.map((month) => (
                        <div
                            key={month.month}
                            style={{ width: `${month.widthPct}%` }}
                            className="border-l border-gray-100 first:border-l-0"
                        />
                    ))}
                </div>

                {unpricedFromPct < 100 && (
                    <div
                        className="pointer-events-none absolute inset-y-0 right-0 border-l border-dashed border-gray-200
                            bg-[repeating-linear-gradient(135deg,#fafafa_0px,#fafafa_5px,#f4f5f7_5px,#f4f5f7_10px)]"
                        style={{ left: `${unpricedFromPct}%` }}
                        aria-hidden
                    />
                )}

                {referencePct !== null && (
                    <div
                        className="pointer-events-none absolute inset-y-0 z-10 border-l border-dashed border-gray-300"
                        style={{ left: `${referencePct}%` }}
                        title={`Event dates last verified ${referenceDate}`}
                        aria-hidden
                    />
                )}

                {beforeCoverage > 0.5 && (
                    <div
                        className="pointer-events-none absolute inset-y-0 left-0 z-10 flex items-center justify-center
                            bg-[repeating-linear-gradient(135deg,#fbfbfc_0px,#fbfbfc_6px,#f5f6f8_6px,#f5f6f8_12px)]"
                        style={{ width: `${beforeCoverage}%` }}
                        aria-hidden
                    >
                        {beforeCoverage > 12 && (
                            <span className="text-[9px] font-medium uppercase tracking-wide text-gray-400">
                                Before price data
                            </span>
                        )}
                    </div>
                )}

                {/* Season & weather band: context rails, kept apart from event lanes. */}
                {seasonal.length > 0 && (
                    <div className="relative z-20 pt-2">
                        <div className="mb-1 flex items-center gap-1.5">
                            <span className="h-[2px] w-4 rounded-full bg-gray-300" aria-hidden />
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                                Season &amp; weather
                            </span>
                            <span className="hidden text-[10px] text-gray-300 sm:inline">context, not an event</span>
                        </div>
                        <div className="relative" style={{ height: `${seasonHeight}px` }}>
                            {seasonPack.placed.map(({ event, lane }) => (
                                <TrackBar
                                    key={event.id}
                                    event={event}
                                    left={clampLeft(event.startDate)}
                                    widthPx={laneWidthPx(event)}
                                    top={lane * metrics.seasonLane + (metrics.seasonLane - metrics.seasonBar) / 2}
                                    height={metrics.seasonBar}
                                    tone="season"
                                    clippedRight={event.endDate > coveredTo}
                                    onSelect={onSelect}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Event lanes. */}
                <div className="relative mt-3" style={{ height: `${eventHeight}px` }}>
                    {dated.length === 0 && (
                        <p className="absolute inset-x-0 top-1 text-[11px] text-gray-400">
                            No dated events in this year match the current filters.
                        </p>
                    )}
                    {eventPack.placed.map(({ event, lane }) => {
                        const top = lane * metrics.lane + (metrics.lane - metrics.bar) / 2;
                        if (isMultiDay(event)) {
                            return (
                                <TrackBar
                                    key={event.id}
                                    event={event}
                                    left={clampLeft(event.startDate)}
                                    widthPx={laneWidthPx(event)}
                                    top={top}
                                    height={metrics.bar}
                                    tone="event"
                                    clippedRight={event.endDate > coveredTo}
                                    onSelect={onSelect}
                                />
                            );
                        }
                        return (
                            <TrackDot
                                key={event.id}
                                event={event}
                                left={clampLeft(event.startDate)}
                                top={lane * metrics.lane + (metrics.lane - metrics.dot) / 2}
                                size={metrics.dot}
                                onSelect={onSelect}
                            />
                        );
                    })}
                </div>
            </div>
        </div>
    );
});
YearTrack.displayName = 'YearTrack';

export const EventTimeline = memo(({
    events, windowStart, windowEnd, priceDataEnd, referenceDate, density, zoom, onSelect, onReset,
}: Props) => {
    const groups = useMemo(() => groupByYear(events), [events]);
    const observerRef = useRef<ResizeObserver | null>(null);
    const [trackWidth, setTrackWidth] = useState(0);

    /**
     * Measured in px so labels and minimum bar widths do not depend on zoom.
     * A callback ref is used because the measured node unmounts whenever the
     * filtered set is empty, and the observer has to follow it in and out.
     */
    const measure = useCallback((node: HTMLDivElement | null) => {
        observerRef.current?.disconnect();
        observerRef.current = null;
        if (!node) return;

        const observer = new ResizeObserver((entries) => {
            const width = entries[0]?.contentRect.width;
            if (width) setTrackWidth(width);
        });
        observer.observe(node);
        observerRef.current = observer;
        setTrackWidth(node.getBoundingClientRect().width);
    }, []);

    useEffect(() => () => observerRef.current?.disconnect(), []);

    if (events.length === 0) {
        return (
            <EmptyState
                icon={CalendarX2}
                title="No events match these filters"
                message="Try a different year, clear the custom date range, or reset the filters to see the full calendar."
                action={<Button variant="secondary" size="sm" onClick={onReset}>Reset filters</Button>}
            />
        );
    }

    return (
        <div>
            {groups.length > 1 && (
                <p className="mb-3 text-[11px] text-gray-400">
                    Three years on one month grid, so the same month lines up down the stack. Pick a year above to see it
                    at full width.
                </p>
            )}
            <div className="overflow-x-auto pb-1">
                <div ref={measure} style={{ width: `${zoom * 100}%` }} className="min-w-full">
                    {groups.map(({ year, events: yearEvents }, index) => (
                        <YearTrack
                            key={year}
                            year={year}
                            events={yearEvents}
                            windowStart={windowStart}
                            windowEnd={windowEnd}
                            priceDataEnd={priceDataEnd}
                            referenceDate={referenceDate}
                            density={density}
                            trackWidth={trackWidth}
                            onSelect={onSelect}
                            divided={index > 0}
                        />
                    ))}
                </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-gray-100 pt-3
                text-[11px] text-gray-500">
                <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-5 rounded-[3px] border border-gray-300 bg-gray-50" aria-hidden />
                    Multi-day window
                </span>
                <span className="inline-flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-full border-2 border-gray-300 bg-white" aria-hidden />
                    Single day
                </span>
                <span className="inline-flex items-center gap-1.5">
                    <span className="h-1.5 w-5 rounded-full bg-gray-300" aria-hidden />
                    Season &amp; weather
                </span>
                <span className="inline-flex items-center gap-1.5">
                    <span
                        className="h-2.5 w-5 rounded-[3px] border border-gray-200
                            bg-[repeating-linear-gradient(135deg,#fafafa_0px,#fafafa_4px,#f4f5f7_4px,#f4f5f7_8px)]"
                        aria-hidden
                    />
                    Outside the priced window
                </span>
                <span className="text-gray-400">
                    Hover or focus a mark for its name; select it for the sources.
                </span>
            </div>
        </div>
    );
});
EventTimeline.displayName = 'EventTimeline';
