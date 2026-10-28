/**
 * Typed access layer for the Uttar Pradesh chicken price events calendar.
 *
 * The committed dataset (`app/data/up_chicken_events.json`) is generated from
 * `data/up_chicken_events.json` by `scripts/build_event_calendar.mjs`. It keeps
 * recurring definitions separate from per-year occurrences, so this module does
 * the join once and every component works with a flat, fully-resolved event.
 *
 * `expected_price_impact` and `impact_mechanism` are research hypotheses about
 * direction, not measured effects. Nothing here infers a price from an event.
 *
 * All dates are ISO `YYYY-MM-DD` and compared as strings, which sorts correctly
 * and never shifts with the browser timezone.
 */
import dataset from '../data/up_chicken_events.json';
import { ratePoints } from './rate_tracker';

export type EventCategory = 'festival' | 'observance' | 'islamic' | 'wedding' | 'fair' | 'seasonal';
export type PriceImpact = 'positive' | 'negative' | 'mixed' | 'unknown';
export type Confidence = 'low' | 'medium' | 'high';
export type DateConfidence = 'confirmed' | 'estimated' | 'tentative' | 'unknown';
export type GeoScope = 'statewide' | 'regional' | 'national';
export type SourceDepth = 'multi' | 'single';

export interface EventSource {
    title: string;
    url: string;
    publisher: string;
    published_at?: string;
    /** What this source actually backs, in plain language. */
    supports: string;
    retrieved_at: string;
}

interface EventDefinitionRow {
    id: string;
    name: string;
    category: EventCategory;
    calendar_system: string;
    scope: GeoScope;
    location_scope: string;
    expected_price_impact: PriceImpact;
    impact_mechanism: string;
    impact_confidence: Confidence;
    description: string;
    sources: EventSource[];
    notes: string;
    recurrence: 'annual-single' | 'annual-multiple' | 'one-off';
    excluded_years?: { year: number; reason: string }[];
    last_verified_at: string;
}

interface EventOccurrenceRow {
    definition_id: string;
    year: number;
    start_date: string;
    end_date: string;
    date_confidence: DateConfidence;
    notes?: string;
    sources?: EventSource[];
}

interface EventDataset {
    meta: {
        title: string;
        description: string;
        generated_from: string;
        dataset_start: string;
        dataset_start_rule: string;
        coverage_end: string;
        event_count: number;
        last_verified_at: string;
        calendar_conventions: string[];
        impact_disclaimer: string;
    };
    definitions: EventDefinitionRow[];
    occurrences: EventOccurrenceRow[];
}

/** A single dated occurrence, with its definition merged in. */
export interface ChickenEvent {
    id: string;
    definitionId: string;
    name: string;
    category: EventCategory;
    year: number;
    startDate: string;
    endDate: string;
    scope: GeoScope;
    locationScope: string;
    calendarSystem: string;
    impact: PriceImpact;
    impactMechanism: string;
    impactConfidence: Confidence;
    dateConfidence: DateConfidence;
    description: string;
    /** Occurrence-specific note where one exists, otherwise the definition note. */
    notes: string;
    definitionNotes: string;
    sources: EventSource[];
    sourceDepth: SourceDepth;
    lastVerifiedAt: string;
}

export interface EventCalendarWindow {
    /** First quoted price day — derived from the price dataset, never hardcoded. */
    start: string;
    /** Research coverage end. */
    end: string;
}

const data = dataset as unknown as EventDataset;

const definitions = new Map(data.definitions.map((definition) => [definition.id, definition]));

const uniqueByUrl = (sources: EventSource[]) => {
    const seen = new Set<string>();
    return sources.filter((source) => {
        if (seen.has(source.url)) return false;
        seen.add(source.url);
        return true;
    });
};

/**
 * Window start is derived from the price series rather than trusted from the
 * file, so a regenerated price dataset widens the calendar automatically. The
 * two agree today; if they ever diverge the price series is the authority.
 */
export const calendarStart: string = ratePoints[0]?.date ?? data.meta.dataset_start;
export const calendarEnd: string = data.meta.coverage_end;
export const calendarWindow: EventCalendarWindow = { start: calendarStart, end: calendarEnd };
export const calendarLastVerifiedAt: string = data.meta.last_verified_at;
export const calendarConventions: string[] = data.meta.calendar_conventions;
export const calendarDisclaimer: string = data.meta.impact_disclaimer;

export const eventCalendar: ChickenEvent[] = data.occurrences
    .map((occurrence) => {
        const definition = definitions.get(occurrence.definition_id);
        if (!definition) return null;

        const sources = uniqueByUrl([...definition.sources, ...(occurrence.sources ?? [])]);

        return {
            id: `${occurrence.definition_id}-${occurrence.start_date}`,
            definitionId: occurrence.definition_id,
            name: definition.name,
            category: definition.category,
            year: occurrence.year,
            startDate: occurrence.start_date,
            endDate: occurrence.end_date,
            scope: definition.scope,
            locationScope: definition.location_scope,
            calendarSystem: definition.calendar_system,
            impact: definition.expected_price_impact,
            impactMechanism: definition.impact_mechanism,
            impactConfidence: definition.impact_confidence,
            dateConfidence: occurrence.date_confidence,
            description: definition.description,
            notes: occurrence.notes ?? definition.notes,
            definitionNotes: definition.notes,
            sources,
            sourceDepth: sources.length > 1 ? 'multi' : 'single',
            lastVerifiedAt: definition.last_verified_at,
        } satisfies ChickenEvent;
    })
    .filter((event): event is ChickenEvent => event !== null)
    .sort((a, b) =>
        a.startDate.localeCompare(b.startDate)
        || a.endDate.localeCompare(b.endDate)
        || a.name.localeCompare(b.name));

// ---------------------------------------------------------------------------
// Derivations — pure, so they can be unit tested or reused outside the UI.
// ---------------------------------------------------------------------------

/** Inclusive overlap: an event counts if any of its days fall inside the range. */
export const eventOverlaps = (event: ChickenEvent, start: string, end: string): boolean =>
    event.startDate <= end && event.endDate >= start;

export const eventsInRange = (
    events: ChickenEvent[],
    start: string,
    end: string,
): ChickenEvent[] => events.filter((event) => eventOverlaps(event, start, end));

export const eventDurationDays = (event: Pick<ChickenEvent, 'startDate' | 'endDate'>): number => {
    const start = Date.UTC(
        Number(event.startDate.slice(0, 4)),
        Number(event.startDate.slice(5, 7)) - 1,
        Number(event.startDate.slice(8, 10)),
    );
    const end = Date.UTC(
        Number(event.endDate.slice(0, 4)),
        Number(event.endDate.slice(5, 7)) - 1,
        Number(event.endDate.slice(8, 10)),
    );
    return Math.round((end - start) / 86_400_000) + 1;
};

export const isMultiDay = (event: Pick<ChickenEvent, 'startDate' | 'endDate'>): boolean =>
    event.startDate !== event.endDate;

export const eventYears = (events: ChickenEvent[]): number[] =>
    Array.from(new Set(events.map((event) => event.year))).sort((a, b) => a - b);

export const countBy = <K extends string>(
    events: ChickenEvent[],
    pick: (event: ChickenEvent) => K,
): Record<K, number> => {
    const counts = {} as Record<K, number>;
    for (const event of events) {
        const key = pick(event);
        counts[key] = (counts[key] ?? 0) + 1;
    }
    return counts;
};

export const countByCategory = (events: ChickenEvent[]) => countBy(events, (event) => event.category);
export const countByImpact = (events: ChickenEvent[]) => countBy(events, (event) => event.impact);
export const countByYear = (events: ChickenEvent[]): Record<string, number> =>
    countBy(events, (event) => String(event.year));

export interface EventFilters {
    year: number | 'all';
    /** ISO dates; empty string or null means open-ended. */
    from: string | null;
    to: string | null;
    category: EventCategory | 'all';
    impact: PriceImpact | 'all';
    scope: GeoScope | 'all';
    dateConfidence: DateConfidence | 'all';
    sourceDepth: SourceDepth | 'all';
}

export const defaultEventFilters: EventFilters = {
    year: 'all',
    from: null,
    to: null,
    category: 'all',
    impact: 'all',
    scope: 'all',
    dateConfidence: 'all',
    sourceDepth: 'all',
};

/**
 * Every filter is optional and they compose: an event must satisfy all of the
 * active ones. A custom date range takes precedence over the year selector when
 * both are set, so the range cannot silently contradict the year chip.
 */
export const matchesEventFilters = (event: ChickenEvent, filters: EventFilters): boolean => {
    const hasRange = Boolean(filters.from || filters.to);

    if (hasRange) {
        if (filters.from && event.endDate < filters.from) return false;
        if (filters.to && event.startDate > filters.to) return false;
    } else if (filters.year !== 'all' && event.year !== filters.year) {
        return false;
    }

    if (filters.category !== 'all' && event.category !== filters.category) return false;
    if (filters.impact !== 'all' && event.impact !== filters.impact) return false;
    if (filters.scope !== 'all' && event.scope !== filters.scope) return false;
    if (filters.dateConfidence !== 'all' && event.dateConfidence !== filters.dateConfidence) return false;
    if (filters.sourceDepth !== 'all' && event.sourceDepth !== filters.sourceDepth) return false;

    return true;
};

export const filterEvents = (events: ChickenEvent[], filters: EventFilters): ChickenEvent[] =>
    events.filter((event) => matchesEventFilters(event, filters));

export const activeFilterCount = (filters: EventFilters): number => {
    let count = 0;
    if (filters.from || filters.to) count += 1;
    else if (filters.year !== 'all') count += 1;
    if (filters.category !== 'all') count += 1;
    if (filters.impact !== 'all') count += 1;
    if (filters.scope !== 'all') count += 1;
    if (filters.dateConfidence !== 'all') count += 1;
    if (filters.sourceDepth !== 'all') count += 1;
    return count;
};

/** Groups events into the year buckets the timeline draws, in calendar order. */
export const groupByYear = (events: ChickenEvent[]): { year: number; events: ChickenEvent[] }[] => {
    const buckets = new Map<number, ChickenEvent[]>();
    for (const event of events) {
        const bucket = buckets.get(event.year);
        if (bucket) bucket.push(event);
        else buckets.set(event.year, [event]);
    }
    return Array.from(buckets.entries())
        .sort(([a], [b]) => a - b)
        .map(([year, yearEvents]) => ({ year, events: yearEvents }));
};

const dateFormatter = new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
});

const shortFormatter = new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
});

const asUtcDate = (iso: string) => new Date(`${iso}T00:00:00Z`);

/** `18 Oct 2025` */
export const formatEventDate = (iso: string): string => dateFormatter.format(asUtcDate(iso));

/** `18–23 Oct 2025`, or a single date for one-day events. */
export const formatEventRange = (start: string, end: string): string => {
    if (start === end) return formatEventDate(start);

    const sameYear = start.slice(0, 4) === end.slice(0, 4);
    const sameMonth = start.slice(0, 7) === end.slice(0, 7);

    if (sameMonth) {
        const startDay = asUtcDate(start).getUTCDate();
        const endLabel = dateFormatter.format(asUtcDate(end));
        return `${startDay}–${endLabel}`;
    }

    if (sameYear) {
        return `${shortFormatter.format(asUtcDate(start))} – ${formatEventDate(end)}`;
    }

    return `${formatEventDate(start)} – ${formatEventDate(end)}`;
};

/** Plain-language labels so impact is never conveyed by colour alone. */
export const impactLabel: Record<PriceImpact, string> = {
    positive: 'Uptick hypothesis',
    negative: 'Downturn hypothesis',
    mixed: 'Mixed / unclear',
    unknown: 'Unknown direction',
};

export const categoryLabel: Record<EventCategory, string> = {
    festival: 'Festival',
    observance: 'Fast / observance',
    islamic: 'Islamic calendar',
    wedding: 'Wedding season',
    fair: 'Fair / pilgrimage',
    seasonal: 'Seasonal / weather',
};

export const dateConfidenceLabel: Record<DateConfidence, string> = {
    confirmed: 'Confirmed date',
    estimated: 'Estimated date',
    tentative: 'Tentative date',
    unknown: 'Unknown date',
};

export const scopeLabel: Record<GeoScope, string> = {
    statewide: 'Statewide',
    regional: 'Regional',
    national: 'National',
};
