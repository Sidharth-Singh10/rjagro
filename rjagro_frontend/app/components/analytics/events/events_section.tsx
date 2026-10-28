'use client'
import { useCallback, useMemo, useRef, useState } from 'react';
import { ChevronDown, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { ratePoints } from '@/app/utils/rate_tracker';
import {
    activeFilterCount, calendarConventions, calendarDisclaimer, calendarEnd, calendarLastVerifiedAt, calendarStart,
    defaultEventFilters, eventCalendar, eventYears, filterEvents, formatEventDate,
    formatEventRange, type ChickenEvent, type EventFilters,
} from '@/app/utils/event_calendar';
import { ActiveFilterChips, EventFiltersPanel } from './event_filters';
import { EventList } from './event_list';
import { EventTimeline, type EventDensity } from './event_timeline';
import { EventDetailsDrawer } from './event_drawer';
import { EventToolbar, ZOOM_STEPS, type EventView } from './event_toolbar';
import { ImpactLegend } from './event_chips';

const FILTER_PANEL_ID = 'event-filter-panel';

export const EventsAndSeasonality = () => {
    const [filters, setFilters] = useState<EventFilters>(defaultEventFilters);
    const [selected, setSelected] = useState<ChickenEvent | null>(null);
    const [view, setView] = useState<EventView>('timeline');
    const [density, setDensity] = useState<EventDensity>('comfortable');
    const [zoomIndex, setZoomIndex] = useState(0);
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [notesOpen, setNotesOpen] = useState(false);
    const triggerRef = useRef<HTMLElement | null>(null);

    const years = useMemo(() => eventYears(eventCalendar), []);
    const filtered = useMemo(() => filterEvents(eventCalendar, filters), [filters]);
    const priceDataEnd = ratePoints[ratePoints.length - 1]?.date ?? calendarStart;

    /** Only the controls inside the collapsed panel; the year has its own toolbar. */
    const panelFilterCount = useMemo(
        () => activeFilterCount({ ...filters, year: 'all', from: null, to: null }),
        [filters],
    );
    const anyFilterActive = activeFilterCount(filters) > 0;
    const rangeIsCustom = Boolean(filters.from || filters.to);

    const rangeLabel = rangeIsCustom
        ? formatEventRange(filters.from ?? calendarStart, filters.to ?? calendarEnd)
        : filters.year === 'all'
            ? `${formatEventDate(calendarStart)} – ${formatEventDate(calendarEnd)}`
            : formatEventRange(`${filters.year}-01-01`, `${filters.year}-12-31`);

    const reset = useCallback(() => setFilters(defaultEventFilters), []);

    const setYear = useCallback((year: number | 'all') => {
        setFilters((current) => ({ ...current, year, from: null, to: null }));
    }, []);

    /** Keep keyboard users on the mark they opened once the drawer closes. */
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
            <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm" aria-labelledby="events-heading">
                <header className="flex flex-col gap-2.5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <h3 id="events-heading" className="text-sm font-semibold text-gray-700">
                                Events &amp; seasonality
                            </h3>
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                                {eventCalendar.length} events
                            </span>
                        </div>
                        <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] leading-relaxed text-gray-500">
                            <span className="whitespace-nowrap">{formatEventDate(calendarStart)} – {formatEventDate(calendarEnd)}</span>
                            <span className="text-gray-300" aria-hidden>·</span>
                            <span className="whitespace-nowrap">price quotes end {formatEventDate(priceDataEnd)}</span>
                            <span className="text-gray-300" aria-hidden>·</span>
                            <span className="whitespace-nowrap">last verified {formatEventDate(calendarLastVerifiedAt)}</span>
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 lg:shrink-0 lg:flex-col lg:items-end lg:gap-y-1">
                        <ImpactLegend />
                        <span className="text-[10px] text-gray-400">direction hypotheses, not measured effects</span>
                    </div>
                </header>

                <p className="mt-3 max-w-3xl text-xs leading-relaxed text-gray-500">
                    Festivals, fasting periods, weddings, pilgrimages and seasonal weather that plausibly move wholesale
                    chicken prices in Uttar Pradesh. Bars are event windows, dots are single days, and the season band is
                    background weather rather than a dated celebration.
                </p>

                <div className="mt-5 space-y-3">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                        <button
                            type="button"
                            aria-expanded={filtersOpen}
                            aria-controls={FILTER_PANEL_ID}
                            onClick={() => setFiltersOpen((open) => !open)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white
                                px-2.5 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:border-gray-400
                                hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2
                                focus-visible:outline-green-600"
                        >
                            <SlidersHorizontal size={13} aria-hidden />
                            Filters
                            {panelFilterCount > 0 && (
                                <span className="rounded-full bg-green-600 px-1.5 text-[10px] leading-4 font-semibold text-white">
                                    {panelFilterCount}
                                </span>
                            )}
                            <ChevronDown
                                size={13}
                                className={`text-gray-400 transition-transform ${filtersOpen ? 'rotate-180' : ''}`}
                                aria-hidden
                            />
                        </button>

                        <span className="text-[11px] text-gray-500" role="status" aria-live="polite">
                            <strong className="font-semibold text-gray-800">{filtered.length}</strong> of {eventCalendar.length} events
                        </span>

                        <button
                            type="button"
                            onClick={reset}
                            disabled={!anyFilterActive}
                            className="ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium
                                text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900
                                focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600
                                disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                        >
                            <RotateCcw size={11} aria-hidden />
                            Reset
                        </button>
                    </div>

                    {filtersOpen && (
                        <EventFiltersPanel
                            id={FILTER_PANEL_ID}
                            filters={filters}
                            windowStart={calendarStart}
                            windowEnd={calendarEnd}
                            onChange={setFilters}
                            onReset={reset}
                        />
                    )}

                    <ActiveFilterChips
                        filters={filters}
                        windowStart={calendarStart}
                        windowEnd={calendarEnd}
                        onChange={setFilters}
                    />
                </div>

                <div className="mt-4 border-t border-gray-100 pt-4">
                    <EventToolbar
                        years={years}
                        year={filters.year}
                        onYearChange={setYear}
                        rangeLabel={rangeLabel}
                        rangeIsCustom={rangeIsCustom}
                        view={view}
                        onViewChange={setView}
                        density={density}
                        onDensityChange={setDensity}
                        zoomIndex={zoomIndex}
                        onZoomIndexChange={(index) => setZoomIndex(Math.min(ZOOM_STEPS.length - 1, Math.max(0, index)))}
                    />
                </div>

                <div className="mt-4">
                    {view === 'timeline' ? (
                        <EventTimeline
                            events={filtered}
                            windowStart={calendarStart}
                            windowEnd={calendarEnd}
                            priceDataEnd={priceDataEnd}
                            referenceDate={calendarLastVerifiedAt}
                            density={density}
                            zoom={ZOOM_STEPS[zoomIndex] ?? 1}
                            onSelect={openDetails}
                            onReset={reset}
                        />
                    ) : (
                        <EventList events={filtered} onSelect={openDetails} onReset={reset} />
                    )}
                </div>

                <div className="mt-5 border-t border-gray-100 pt-3">
                    <button
                        type="button"
                        aria-expanded={notesOpen}
                        aria-controls="event-data-notes"
                        onClick={() => setNotesOpen((open) => !open)}
                        className="inline-flex items-center gap-1.5 text-[11px] font-medium text-gray-600
                            hover:text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-2
                            focus-visible:outline-green-600"
                    >
                        <ChevronDown
                            size={13}
                            className={`text-gray-400 transition-transform ${notesOpen ? 'rotate-180' : ''}`}
                            aria-hidden
                        />
                        How these dates and hypotheses are built
                    </button>

                    {notesOpen && (
                        <div id="event-data-notes" className="mt-3 space-y-3 text-[11px] leading-relaxed text-gray-500">
                            <div>
                                <h4 className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-600">
                                    Confidence &amp; verification
                                </h4>
                                <p>
                                    Every occurrence carries a date confidence. Confirmed dates are observed or officially
                                    announced; estimated dates are computed from a published calendar; tentative dates depend on an
                                    announcement that has not happened yet. Each event also records how many independent sources back
                                    it; the Sources column in the list view shows the count.
                                </p>
                            </div>

                            <div>
                                <h4 className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-600">
                                    Methodology
                                </h4>
                                <ul className="list-disc space-y-1 pl-4">
                                    {calendarConventions.map((convention) => (
                                        <li key={convention}>{convention}</li>
                                    ))}
                                    <li>
                                        The calendar window starts on the first quoted price day, derived from the price dataset at
                                        build and load time ({formatEventDate(calendarStart)}) rather than hardcoded.
                                    </li>
                                </ul>
                            </div>

                            <div>
                                <h4 className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-600">
                                    Disclaimer
                                </h4>
                                <p>{calendarDisclaimer}</p>
                                <p className="mt-1">
                                    Events after {formatEventDate(priceDataEnd)} fall in the striped region: there is no price data
                                    for them yet, so they can be planned around but not compared.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </section>

            <EventDetailsDrawer event={selected} onClose={closeDetails} />
        </>
    );
};

EventsAndSeasonality.displayName = 'EventsAndSeasonality';

export default EventsAndSeasonality;
