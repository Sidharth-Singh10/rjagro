/**
 * Did the price actually move the way the event hypothesis said it would?
 *
 * For every event occurrence we compare the average of the days quoted *during*
 * the event with the average of an equal-length window immediately *before* it.
 * That window is the event's own length, clamped to 3–14 days, so a one-day
 * festival still gets a few quotes either side and a month-long fasting period
 * is not compared against a single fortnight.
 *
 * Only quoted days count. A blank cell in the source sheet is a missing quote,
 * never a zero, and a side with fewer than three quotes is reported as
 * insufficient rather than given a misleading number.
 *
 * This is descriptive co-movement, not causal attribution. Festivals cluster,
 * pre-festival buying can move the peak outside the window, and prices have
 * their own cycle; the verdict says whether the data is consistent with the
 * hypothesis, not that the event caused the move.
 */
import { eventCalendar, eventDurationDays, type ChickenEvent } from './event_calendar';
import { ratePoints, type RatePoint } from './rate_tracker';

export const FLAT_THRESHOLD_PCT = 2;
export const MIN_QUOTES_PER_SIDE = 3;
export const MIN_WINDOW_DAYS = 3;
export const MAX_WINDOW_DAYS = 14;

const MS_PER_DAY = 86_400_000;

export type ActualDirection = 'up' | 'down' | 'flat' | 'insufficient';
export type ImpactVerdict = 'aligned' | 'opposed' | 'inconclusive' | 'insufficient' | 'pending';

export interface WindowStats {
    from: string;
    to: string;
    quotes: number;
    average: number | null;
}

export interface EventImpact {
    id: string;
    event: ChickenEvent;
    /** False when the event falls entirely after the last quoted day. */
    observable: boolean;
    durationDays: number;
    windowDays: number;
    pre: WindowStats;
    during: WindowStats;
    /** Percent change from the pre-window average to the during-window average. */
    deltaPct: number | null;
    direction: ActualDirection;
    verdict: ImpactVerdict;
    /** Other events overlapping the pre or during window, which may explain the move. */
    confounders: ChickenEvent[];
    /** Why a number could not be computed, when one could not. */
    reason: string | null;
}

const epochOf = (iso: string) => Date.UTC(
    Number(iso.slice(0, 4)),
    Number(iso.slice(5, 7)) - 1,
    Number(iso.slice(8, 10)),
);

const isoOf = (epoch: number) => new Date(epoch).toISOString().slice(0, 10);

const addDays = (iso: string, days: number) => isoOf(epochOf(iso) + days * MS_PER_DAY);

const maxIso = (a: string, b: string) => (a > b ? a : b);
const minIso = (a: string, b: string) => (a < b ? a : b);

const round = (value: number, digits: number) => {
    const factor = 10 ** digits;
    return Math.round(value * factor) / factor;
};

const mean = (points: RatePoint[]) =>
    points.reduce((sum, point) => sum + point.rate, 0) / points.length;

const quotesBetween = (points: RatePoint[], from: string, to: string) =>
    points.filter((point) => point.date >= from && point.date <= to);

const statsFor = (
    points: RatePoint[],
    from: string,
    to: string,
): WindowStats => {
    const quotes = quotesBetween(points, from, to);
    return {
        from,
        to,
        quotes: quotes.length,
        average: quotes.length > 0 ? round(mean(quotes), 2) : null,
    };
};

/**
 * Averages the days quoted during `window` against the same count of days
 * before it. Returns the empty stats when the event sits outside the priced
 * period, so callers can render "no price data yet" without special-casing.
 */
export const analyseEvent = (
    event: ChickenEvent,
    points: RatePoint[] = ratePoints,
): EventImpact => {
    const priceStart = points[0]?.date ?? event.startDate;
    const priceEnd = points[points.length - 1]?.date ?? event.startDate;

    const observable = event.startDate <= priceEnd && event.endDate >= priceStart;
    const durationDays = eventDurationDays(event);
    const windowDays = Math.max(MIN_WINDOW_DAYS, Math.min(MAX_WINDOW_DAYS, durationDays));

    const preFrom = addDays(event.startDate, -windowDays);
    const preTo = addDays(event.startDate, -1);
    const duringFrom = maxIso(event.startDate, priceStart);
    const duringTo = minIso(
        minIso(addDays(event.startDate, windowDays - 1), event.endDate),
        priceEnd,
    );

    const pre = statsFor(points, preFrom, preTo);
    const during = statsFor(points, duringFrom, duringTo);

    const confounders = observable
        ? eventCalendar.filter((other) =>
            other.id !== event.id
            && other.startDate <= priceEnd
            && other.endDate >= priceStart
            && (
                (other.startDate <= pre.to && other.endDate >= pre.from)
                || (other.startDate <= during.to && other.endDate >= during.from)
            ))
        : [];

    const base = {
        id: event.id,
        event,
        observable,
        durationDays,
        windowDays,
        pre,
        during,
        confounders,
    };

    if (!observable) {
        return {
            ...base,
            deltaPct: null,
            direction: 'insufficient',
            verdict: 'pending',
            reason: `No prices after ${priceEnd}`,
        };
    }

    if (pre.quotes < MIN_QUOTES_PER_SIDE || during.quotes < MIN_QUOTES_PER_SIDE) {
        return {
            ...base,
            deltaPct: null,
            direction: 'insufficient',
            verdict: 'insufficient',
            reason: `${pre.quotes} quote${pre.quotes === 1 ? '' : 's'} before, ${during.quotes} during — needs ${MIN_QUOTES_PER_SIDE} each side`,
        };
    }

    const preMean = mean(quotesBetween(points, pre.from, pre.to));
    const duringMean = mean(quotesBetween(points, during.from, during.to));
    const deltaPct = round(((duringMean - preMean) / preMean) * 100, 1);
    const direction: ActualDirection = Math.abs(deltaPct) < FLAT_THRESHOLD_PCT
        ? 'flat'
        : deltaPct > 0 ? 'up' : 'down';

    let verdict: ImpactVerdict;
    if (event.impact === 'mixed' || direction === 'flat') {
        verdict = 'inconclusive';
    } else if (
        (event.impact === 'positive' && direction === 'up')
        || (event.impact === 'negative' && direction === 'down')
    ) {
        verdict = 'aligned';
    } else {
        verdict = 'opposed';
    }

    return {
        ...base,
        deltaPct,
        direction,
        verdict,
        reason: null,
    };
};

export const eventImpacts: EventImpact[] = eventCalendar.map((event) => analyseEvent(event));

export interface ImpactSummary {
    total: number;
    observable: number;
    analysable: number;
    aligned: number;
    opposed: number;
    inconclusive: number;
    insufficient: number;
    pending: number;
}

export const summariseImpacts = (rows: EventImpact[]): ImpactSummary => {
    const summary: ImpactSummary = {
        total: rows.length,
        observable: 0,
        analysable: 0,
        aligned: 0,
        opposed: 0,
        inconclusive: 0,
        insufficient: 0,
        pending: 0,
    };

    for (const row of rows) {
        if (row.observable) summary.observable += 1;
        switch (row.verdict) {
            case 'aligned': summary.aligned += 1; summary.analysable += 1; break;
            case 'opposed': summary.opposed += 1; summary.analysable += 1; break;
            case 'inconclusive': summary.inconclusive += 1; summary.analysable += 1; break;
            case 'insufficient': summary.insufficient += 1; break;
            case 'pending': summary.pending += 1; break;
        }
    }

    return summary;
};

export const directionArrow: Record<ActualDirection, string> = {
    up: '↑',
    down: '↓',
    flat: '→',
    insufficient: '–',
};

export const verdictMark: Record<ImpactVerdict, string> = {
    aligned: '✓',
    opposed: '✗',
    inconclusive: '~',
    insufficient: '–',
    pending: '…',
};

export const verdictLabel: Record<ImpactVerdict, string> = {
    aligned: 'Matched',
    opposed: 'Opposite',
    inconclusive: 'Inconclusive',
    insufficient: 'Not enough quotes',
    pending: 'No price data yet',
};

/** `+2.7%` / `−5.3%` — the typographic minus reads better at 10px than a hyphen. */
export const formatDelta = (deltaPct: number | null): string => {
    if (deltaPct === null) return '—';
    if (deltaPct === 0) return '0%';
    return `${deltaPct > 0 ? '+' : '−'}${Math.abs(deltaPct).toFixed(1)}%`;
};

/** Short label for crowded chart marks, e.g. `Sawan (Shravana) month` → `Sawan`. */
export const shortEventName = (name: string): string => {
    const trimmed = name.split(/[(—–,:]/)[0].trim();
    return trimmed.length > 22 ? `${trimmed.slice(0, 21)}…` : trimmed;
};
