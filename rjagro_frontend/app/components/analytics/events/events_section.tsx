'use client'
import { useCallback, useMemo, useRef, useState } from 'react';
import { Info } from 'lucide-react';
import { ChartCard } from '../../v2/overview/chart_card';
import { ratePoints } from '@/app/utils/rate_tracker';
import {
    calendarConventions, calendarDisclaimer, calendarEnd, calendarLastVerifiedAt, calendarStart,
    defaultEventFilters, eventCalendar, eventYears, filterEvents, formatEventDate,
    type ChickenEvent, type EventFilters,
} from '@/app/utils/event_calendar';
import { EventFiltersBar } from './event_filters';
import { EventTimeline } from './event_timeline';
import { EventDetailsModal } from './event_details_modal';
import { ImpactLegend } from './event_chips';

export const EventsAndSeasonality = () => {
    const [filters, setFilters] = useState<EventFilters>(defaultEventFilters);
    const [selected, setSelected] = useState<ChickenEvent | null>(null);
    const triggerRef = useRef<HTMLElement | null>(null);

    const years = useMemo(() => eventYears(eventCalendar), []);
    const filtered = useMemo(() => filterEvents(eventCalendar, filters), [filters]);

    const priceDataEnd = ratePoints[ratePoints.length - 1]?.date ?? calendarStart;

    const reset = useCallback(() => setFilters(defaultEventFilters), []);

    /** Keep keyboard users on the bar they opened once the dialog closes. */
    const openDetails = useCallback((event: ChickenEvent) => {
        triggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        setSelected(event);
    }, []);
    const closeDetails = useCallback(() => {
        setSelected(null);
        triggerRef.current?.focus();
    }, []);

    return (
        <>
            <ChartCard title="Events & seasonality" headerControls={<ImpactLegend />}>
                <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-gray-500">
                        <Info size={13} className="text-gray-400" aria-hidden />
                        <span>
                            {eventCalendar.length} sourced events · {formatEventDate(calendarStart)} – {formatEventDate(calendarEnd)}
                        </span>
                        <span className="text-gray-300">·</span>
                        <span>Price quotes end {formatEventDate(priceDataEnd)}</span>
                        <span className="text-gray-300">·</span>
                        <span>Last verified {formatEventDate(calendarLastVerifiedAt)} (dashed line)</span>
                    </div>

                    <p className="text-xs leading-relaxed text-gray-500">
                        A calendar of festivals, fasting periods, weddings, pilgrimages and seasonal weather that plausibly
                        move wholesale chicken prices in Uttar Pradesh. Bars are event windows and dots are single-day events.
                        Click any event for its sources and the reasoning behind its price hypothesis.
                    </p>

                    <EventFiltersBar
                        filters={filters}
                        years={years}
                        windowStart={calendarStart}
                        windowEnd={calendarEnd}
                        resultCount={filtered.length}
                        totalCount={eventCalendar.length}
                        onChange={setFilters}
                        onReset={reset}
                    />

                    <EventTimeline
                        events={filtered}
                        windowStart={calendarStart}
                        windowEnd={calendarEnd}
                        priceDataEnd={priceDataEnd}
                        referenceDate={calendarLastVerifiedAt}
                        onSelect={openDetails}
                        onReset={reset}
                    />

                    <div className="space-y-2 border-t border-gray-100 pt-3">
                        <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-gray-500">
                            <Info size={12} className="mt-0.5 shrink-0 text-amber-500" aria-hidden />
                            <span>
                                {calendarDisclaimer} Events after {formatEventDate(priceDataEnd)} sit in the striped region:
                                they have no price data yet, so they can be planned around but not compared.
                            </span>
                        </p>

                        <details className="group text-[11px] text-gray-500">
                            <summary className="cursor-pointer list-none font-medium text-gray-600 hover:text-gray-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600">
                                How dates and sources are handled
                                <span className="ml-1 text-gray-400 group-open:hidden">+</span>
                                <span className="ml-1 hidden text-gray-400 group-open:inline">−</span>
                            </summary>
                            <ul className="mt-2 list-disc space-y-1 pl-4 leading-relaxed">
                                {calendarConventions.map((convention) => (
                                    <li key={convention}>{convention}</li>
                                ))}
                                <li>
                                    The calendar window starts on the first quoted price day, derived from the price dataset at
                                    build and load time ({formatEventDate(calendarStart)}) rather than hardcoded.
                                </li>
                            </ul>
                        </details>
                    </div>
                </div>
            </ChartCard>

            <EventDetailsModal event={selected} onClose={closeDetails} />
        </>
    );
};

EventsAndSeasonality.displayName = 'EventsAndSeasonality';

export default EventsAndSeasonality;
