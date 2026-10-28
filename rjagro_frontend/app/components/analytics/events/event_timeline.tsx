'use client'
import { memo, useMemo } from 'react';
import { CalendarX2 } from 'lucide-react';
import EmptyState from '../../ui/empty_state';
import Button from '../../ui/button';
import {
    eventDurationDays, formatEventRange, groupByYear, isMultiDay, type ChickenEvent,
} from '@/app/utils/event_calendar';
import { ImpactIcon, impactColor } from './event_chips';

interface Props {
    events: ChickenEvent[];
    windowStart: string;
    windowEnd: string;
    /** Last quoted price day; later days are shown as "no price data yet". */
    priceDataEnd: string;
    referenceDate: string;
    onSelect: (event: ChickenEvent) => void;
    onReset: () => void;
}

const MS_PER_DAY = 86_400_000;

const epochOf = (iso: string) => Date.UTC(
    Number(iso.slice(0, 4)),
    Number(iso.slice(5, 7)) - 1,
    Number(iso.slice(8, 10)),
);

const daysBetween = (start: string, end: string) =>
    Math.round((epochOf(end) - epochOf(start)) / MS_PER_DAY);

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface Placed {
    event: ChickenEvent;
    lane: number;
}

/** Greedy lane packing: the first lane whose last bar ends before this one starts. */
const packLanes = (events: ChickenEvent[]): { placed: Placed[]; laneCount: number } => {
    const laneEnds: string[] = [];
    const placed: Placed[] = [];

    const ordered = [...events].sort((a, b) =>
        a.startDate.localeCompare(b.startDate)
        || eventDurationDays(b) - eventDurationDays(a)
        || a.name.localeCompare(b.name));

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

const monthSegments = (year: number, start: string, end: string) => {
    const segments: { month: number; days: number }[] = [];
    for (let month = 0; month < 12; month += 1) {
        const monthStart = `${year}-${String(month + 1).padStart(2, '0')}-01`;
        const monthEndEpoch = Date.UTC(year, month + 1, 0);
        const monthEnd = `${year}-${String(month + 1).padStart(2, '0')}-${String(new Date(monthEndEpoch).getUTCDate()).padStart(2, '0')}`;
        const from = monthStart > start ? monthStart : start;
        const to = monthEnd < end ? monthEnd : end;
        if (from > to) continue;
        segments.push({ month, days: daysBetween(from, to) + 1 });
    }
    return segments;
};

const YearTrack = memo(({
    year, events, start, end, priceDataEnd, referenceDate, onSelect, showReference,
}: {
    year: number;
    events: ChickenEvent[];
    start: string;
    end: string;
    priceDataEnd: string;
    referenceDate: string;
    onSelect: (event: ChickenEvent) => void;
    showReference: boolean;
}) => {
    const totalDays = daysBetween(start, end) + 1;
    const { placed, laneCount } = useMemo(() => packLanes(events), [events]);
    const segments = useMemo(() => monthSegments(year, start, end), [year, start, end]);

    const offsetPct = (iso: string) => (daysBetween(start, iso) / totalDays) * 100;

    const unpriced = start > priceDataEnd
        ? 100
        : priceDataEnd >= end ? 0 : offsetPct(priceDataEnd) + (1 / totalDays) * 100;

    const referencePct = referenceDate >= start && referenceDate <= end ? offsetPct(referenceDate) : null;

    return (
        <div className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-2">
                <h4 className="text-xs font-semibold text-gray-800">
                    {year}
                    <span className="ml-2 font-normal text-gray-400">
                        {events.length} event{events.length === 1 ? '' : 's'}
                    </span>
                </h4>
                <span className="text-[10px] text-gray-400">
                    {formatEventRange(start, end)}
                </span>
            </div>

            <div className="flex w-full">
                {segments.map((segment) => (
                    <div
                        key={segment.month}
                        style={{ width: `${(segment.days / totalDays) * 100}%` }}
                        className="truncate border-l border-gray-100 pl-1 text-[10px] text-gray-400 first:border-l-0 first:pl-0"
                    >
                        {MONTHS[segment.month]}
                    </div>
                ))}
            </div>

            <div
                className="relative rounded-md bg-white"
                style={{ height: `${laneCount * 26 + 6}px` }}
                role="group"
                aria-label={`${year} event timeline`}
            >
                {/* month grid */}
                <div className="pointer-events-none absolute inset-0 flex" aria-hidden>
                    {segments.map((segment) => (
                        <div
                            key={segment.month}
                            style={{ width: `${(segment.days / totalDays) * 100}%` }}
                            className="border-l border-gray-100 first:border-l-0"
                        />
                    ))}
                </div>

                {/* days without a price quote yet */}
                {unpriced > 0 && (
                    <div
                        className="pointer-events-none absolute inset-y-0 right-0 rounded-r-md bg-[repeating-linear-gradient(135deg,#f8fafc_0px,#f8fafc_4px,#f1f5f9_4px,#f1f5f9_8px)]"
                        style={{ width: `${unpriced}%` }}
                        aria-hidden
                    />
                )}

                {/* last verification line */}
                {showReference && referencePct !== null && (
                    <div
                        className="pointer-events-none absolute inset-y-0 z-10 border-l border-dashed border-gray-400/70"
                        style={{ left: `${referencePct}%` }}
                        aria-hidden
                    >
                    </div>
                )}

                {placed.map(({ event, lane }) => {
                    // Clip each bar to this year's track so a window that starts
                    // in December and ends in January cannot run past the edge.
                    const barStart = event.startDate < start ? start : event.startDate;
                    const barEnd = event.endDate > end ? end : event.endDate;
                    const left = offsetPct(barStart);
                    const spanPct = ((daysBetween(barStart, barEnd) + 1) / totalDays) * 100;
                    const color = impactColor[event.impact];
                    const label = `${event.name}, ${formatEventRange(event.startDate, event.endDate)}. ${event.impact === 'positive' ? 'Uptick' : event.impact === 'negative' ? 'Downturn' : event.impact === 'mixed' ? 'Mixed' : 'Unknown'} hypothesis.`;
                    const anchorRight = left > 62;

                    const tooltip = (
                        <span
                            className={`pointer-events-none absolute bottom-full z-40 mb-1 hidden w-max max-w-[240px] whitespace-normal rounded-md bg-gray-900 px-2 py-1 text-left text-[10px] font-medium leading-snug text-white shadow-lg group-hover:block group-focus-within:block ${anchorRight ? 'right-0' : 'left-0'}`}
                        >
                            {event.name}
                            <span className="block font-normal text-gray-300">
                                {formatEventRange(event.startDate, event.endDate)}
                            </span>
                        </span>
                    );

                    if (!isMultiDay(event)) {
                        return (
                            <div
                                key={event.id}
                                className="group absolute z-20 h-[18px] w-[18px] -translate-x-1/2"
                                style={{
                                    left: `${Math.min(99.2, Math.max(0.8, left))}%`,
                                    top: `${lane * 26 + 4}px`,
                                }}
                            >
                                <button
                                    type="button"
                                    onClick={() => onSelect(event)}
                                    aria-label={label}
                                    className="flex h-[18px] w-[18px] items-center justify-center rounded-full border bg-white
                                        transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700"
                                    style={{ borderColor: color, color }}
                                >
                                    <ImpactIcon impact={event.impact} size={11} />
                                </button>
                                {tooltip}
                            </div>
                        );
                    }

                    return (
                        <div
                            key={event.id}
                            className="group absolute z-20 h-[18px]"
                            style={{
                                left: `${left}%`,
                                width: `${Math.max(spanPct, 1.6)}%`,
                                top: `${lane * 26 + 4}px`,
                            }}
                        >
                            <button
                                type="button"
                                onClick={() => onSelect(event)}
                                aria-label={label}
                                className="flex h-[18px] w-full items-center gap-1 overflow-hidden rounded-[4px] border px-1 text-left
                                    transition-[filter] hover:brightness-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700"
                                style={{
                                    borderColor: `color-mix(in srgb, ${color} 34%, white)`,
                                    backgroundColor: `color-mix(in srgb, ${color} 14%, white)`,
                                }}
                            >
                                <span className="shrink-0" style={{ color }} aria-hidden>
                                    <ImpactIcon impact={event.impact} size={10} />
                                </span>
                                {spanPct >= 6 && (
                                    <span className="truncate text-[10px] font-medium leading-none text-gray-700">{event.name}</span>
                                )}
                            </button>
                            {tooltip}
                        </div>
                    );
                })}
            </div>
        </div>
    );
});
YearTrack.displayName = 'YearTrack';

export const EventTimeline = memo(({
    events, windowStart, windowEnd, priceDataEnd, referenceDate, onSelect, onReset,
}: Props) => {
    const groups = useMemo(() => groupByYear(events), [events]);

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

    const yearsWithReference = groups.filter(({ year }) => {
        const start = year === Number(windowStart.slice(0, 4)) ? windowStart : `${year}-01-01`;
        return referenceDate >= start && referenceDate <= `${year}-12-31`;
    }).map(({ year }) => year);

    return (
        <div className="space-y-4" role="list" aria-label="Event timeline by year">
            {groups.map(({ year, events: yearEvents }) => {
                const start = `${year}-01-01` < windowStart ? windowStart : `${year}-01-01`;
                const end = `${year}-12-31` > windowEnd ? windowEnd : `${year}-12-31`;
                return (
                    <div role="listitem" key={year}>
                        <YearTrack
                            year={year}
                            events={yearEvents}
                            start={start}
                            end={end}
                            priceDataEnd={priceDataEnd}
                            referenceDate={referenceDate}
                            onSelect={onSelect}
                            showReference={yearsWithReference.length === 1 && yearsWithReference[0] === year}
                        />
                    </div>
                );
            })}
        </div>
    );
});
EventTimeline.displayName = 'EventTimeline';
