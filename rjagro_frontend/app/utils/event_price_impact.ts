/**
 * Did the price actually move the way the event hypothesis said it would?
 *
 * For every event occurrence we compare the days quoted *during* the event with
 * an equal-length window immediately *before* it, clamped to 3–14 days. But the
 * label is no longer the raw ratio of those two averages: prices trend, so a
 * window that opens just after a run-up looks flat or negative even when demand
 * did move. The comparison is done on `log(price)`, the pre-window trend is
 * fitted and projected over the event, and the leftover move is ranked against
 * every other window of the same length nearby.
 *
 * A row is called *unusual* only when that residual beats 95% of comparable
 * windows. It is called *with* or *against* the hypothesis only when the move
 * is unusual, the direction agrees or disagrees, and the sign survives sliding
 * the baseline four days earlier. Everything else is a typical move — which is
 * the honest description of most rows.
 *
 * Only quoted days count. A blank cell in the source sheet is a missing quote,
 * never a zero, and a side with too few quotes is reported as insufficient
 * rather than given a misleading number.
 *
 * This is still co-movement, not causal attribution. Festivals cluster, the
 * heat season overlaps the wedding season, pre-event buying can move the peak
 * outside the window, and the series has one dense season. The verdict says
 * whether the price path is unusual and which way it went, not that the event
 * caused it.
 */
import { eventCalendar, eventDurationDays, type ChickenEvent } from './event_calendar';
import { ratePoints, type RatePoint } from './rate_tracker';
import {
    addDays,
    averageRate,
    benjaminiHochberg,
    buildBenchmark,
    fitLogTrend,
    meanForecastError,
    minIso,
    percentChange,
    quotesBetween,
    roundTo,
    stabilityRange,
    windowResiduals,
    type Benchmark,
    type StabilityRange,
} from './event_stats';

export const MIN_PRE_QUOTES = 4;
export const MIN_DURING_QUOTES = 3;
export const MIN_WINDOW_DAYS = 3;
export const MAX_WINDOW_DAYS = 14;
export const BENCHMARK_RADIUS_DAYS = 45;
export const BENCHMARK_MIN_WINDOWS = 20;
export const UNUSUAL_P = 0.05;
export const STABILITY_SHIFT_DAYS = 4;
/** Keeps a 0.0% change from drawing an arrow. */
export const FLAT_EPSILON_PCT = 0.05;

export type ActualDirection = 'up' | 'down' | 'flat' | 'insufficient';

/**
 * `consistent` / `contradicted` require an unusual move (p ≤ 0.05) in which the
 * sign survives a four-day baseline shift. `fragile` is an unusual move whose
 * sign does not. `notable` is unusual with a mixed/unknown hypothesis, which has
 * no direction to agree or disagree with. Everything else is `typical`.
 */
export type ImpactVerdict =
    | 'consistent'
    | 'contradicted'
    | 'fragile'
    | 'notable'
    | 'typical'
    | 'insufficient'
    | 'pending';

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
    /** Mean forecast error against the pre-window trend, in percent. */
    trendPct: number | null;
    /** Quotes used by the trend fit. */
    trendQuotes: number;
    /** Ranking of the trend residual against comparable windows. */
    benchmark: Benchmark | null;
    /** Raw change when the baseline starts 0–4 days earlier. */
    stability: StabilityRange | null;
    /** Benjamini–Hochberg q across analysable rows; informational only. */
    qValue: number | null;
    verdict: ImpactVerdict;
    /** Other events overlapping the pre or during window. */
    confounders: ChickenEvent[];
    /** Why a number could not be computed, when one could not. */
    reason: string | null;
}

const clampWindowDays = (durationDays: number): number =>
    Math.max(MIN_WINDOW_DAYS, Math.min(MAX_WINDOW_DAYS, durationDays));

const statsFor = (
    points: readonly RatePoint[],
    from: string,
    to: string,
): WindowStats => {
    const quotes = quotesBetween(points, from, to);
    const average = averageRate(quotes);
    return {
        from,
        to,
        quotes: quotes.length,
        average: average === null ? null : roundTo(average, 2),
    };
};

/**
 * Averages the days quoted during `window` against the same count of days
 * before it, then tests the move. Returns the empty stats when the event sits
 * outside the priced period, so callers can render "no price data yet" without
 * special-casing.
 */
export const analyseEvent = (
    event: ChickenEvent,
    points: readonly RatePoint[] = ratePoints,
): EventImpact => {
    const priceStart = points[0]?.date ?? event.startDate;
    const priceEnd = points[points.length - 1]?.date ?? event.startDate;

    const observable = event.startDate <= priceEnd && event.endDate >= priceStart;
    const durationDays = eventDurationDays(event);
    const windowDays = clampWindowDays(durationDays);

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
            trendPct: null,
            trendQuotes: 0,
            benchmark: null,
            stability: null,
            qValue: null,
            verdict: 'pending',
            reason: `No prices after ${priceEnd}`,
        };
    }

    if (pre.quotes < MIN_PRE_QUOTES || during.quotes < MIN_DURING_QUOTES) {
        return {
            ...base,
            deltaPct: null,
            direction: 'insufficient',
            trendPct: null,
            trendQuotes: pre.quotes,
            benchmark: null,
            stability: null,
            qValue: null,
            verdict: 'insufficient',
            reason: `${pre.quotes} quote${pre.quotes === 1 ? '' : 's'} before, ${during.quotes} during — needs ${MIN_PRE_QUOTES} and ${MIN_DURING_QUOTES}`,
        };
    }

    const prePoints = quotesBetween(points, pre.from, pre.to);
    const duringPoints = quotesBetween(points, during.from, during.to);
    const preMean = averageRate(prePoints);
    const duringMean = averageRate(duringPoints);

    if (preMean === null || duringMean === null) {
        return {
            ...base,
            deltaPct: null,
            direction: 'insufficient',
            trendPct: null,
            trendQuotes: pre.quotes,
            benchmark: null,
            stability: null,
            qValue: null,
            verdict: 'insufficient',
            reason: 'Not enough quotes to average either side',
        };
    }

    const deltaPct = roundTo(percentChange(preMean, duringMean), 1);
    const direction: ActualDirection = Math.abs(deltaPct) < FLAT_EPSILON_PCT
        ? 'flat'
        : deltaPct > 0 ? 'up' : 'down';

    const trend = fitLogTrend(prePoints);
    const residual = trend ? meanForecastError(trend, duringPoints) : null;
    const trendPct = residual === null ? null : roundTo((Math.exp(residual) - 1) * 100, 1);
    const benchmark = residual === null
        ? null
        : buildBenchmark(
            residual,
            event.startDate,
            windowResiduals(points, windowDays),
            BENCHMARK_RADIUS_DAYS,
            BENCHMARK_MIN_WINDOWS,
        );
    const stability = stabilityRange(
        points,
        event.startDate,
        during.to,
        windowDays,
        STABILITY_SHIFT_DAYS,
    );

    if (trendPct === null || benchmark === null) {
        return {
            ...base,
            deltaPct,
            direction,
            trendPct,
            trendQuotes: trend?.n ?? pre.quotes,
            benchmark,
            stability,
            qValue: null,
            verdict: 'insufficient',
            reason: benchmark === null
                ? 'No comparable windows to benchmark against'
                : 'Not enough distinct quotes to fit a trend',
        };
    }

    let verdict: ImpactVerdict;
    if (benchmark.p > UNUSUAL_P) {
        verdict = 'typical';
    } else if (stability !== null && !stability.stable) {
        verdict = 'fragile';
    } else if (event.impact === 'positive') {
        verdict = trendPct > 0 ? 'consistent' : trendPct < 0 ? 'contradicted' : 'notable';
    } else if (event.impact === 'negative') {
        verdict = trendPct < 0 ? 'consistent' : trendPct > 0 ? 'contradicted' : 'notable';
    } else {
        verdict = 'notable';
    }

    return {
        ...base,
        deltaPct,
        direction,
        trendPct,
        trendQuotes: trend?.n ?? pre.quotes,
        benchmark,
        stability,
        qValue: null,
        verdict,
        reason: null,
    };
};

const maxIso = (a: string, b: string): string => (a > b ? a : b);

const rows = eventCalendar.map((event) => analyseEvent(event));
const qValues = benjaminiHochberg(rows.map((row) => row.benchmark?.p ?? null));

/** Every occurrence with its label, plus the multiplicity-adjusted q. */
export const eventImpacts: EventImpact[] = rows.map((row, index) => ({
    ...row,
    qValue: qValues[index] ?? null,
}));

export interface ImpactSummary {
    total: number;
    observable: number;
    /** Rows with a benchmark, i.e. testable rather than insufficient or pending. */
    analysable: number;
    consistent: number;
    contradicted: number;
    fragile: number;
    notable: number;
    typical: number;
    insufficient: number;
    pending: number;
}

export const summariseImpacts = (impacts: readonly EventImpact[]): ImpactSummary => {
    const summary: ImpactSummary = {
        total: impacts.length,
        observable: 0,
        analysable: 0,
        consistent: 0,
        contradicted: 0,
        fragile: 0,
        notable: 0,
        typical: 0,
        insufficient: 0,
        pending: 0,
    };

    for (const row of impacts) {
        if (row.observable) summary.observable += 1;
        if (row.verdict === 'insufficient' || row.verdict === 'pending') {
            summary[row.verdict] += 1;
            continue;
        }
        summary[row.verdict] += 1;
        summary.analysable += 1;
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
    consistent: '✓',
    contradicted: '✗',
    fragile: '~',
    notable: '!',
    typical: '→',
    insufficient: '–',
    pending: '…',
};

/** Full sentence used in detail rows and the chart tooltip. */
export const verdictLabel: Record<ImpactVerdict, string> = {
    consistent: 'Unusual, with hypothesis',
    contradicted: 'Unusual, against hypothesis',
    fragile: 'Unusual, baseline-sensitive',
    notable: 'Unusual move',
    typical: 'Typical move',
    insufficient: 'Not enough data',
    pending: 'No price data yet',
};

/** Compact form for chips and the legend. */
export const verdictShortLabel: Record<ImpactVerdict, string> = {
    consistent: 'With hypothesis',
    contradicted: 'Against hypothesis',
    fragile: 'Baseline-sensitive',
    notable: 'Unusual',
    typical: 'Typical',
    insufficient: 'Not enough data',
    pending: 'Future',
};

/** `+2.7%` / `−5.3%` — the typographic minus reads better at 10px than a hyphen. */
export const formatDelta = (deltaPct: number | null): string => {
    if (deltaPct === null) return '—';
    if (deltaPct === 0) return '0%';
    return `${deltaPct > 0 ? '+' : '−'}${Math.abs(deltaPct).toFixed(1)}%`;
};

export const formatPValue = (p: number | null): string => {
    if (p === null) return '—';
    return p < 0.001 ? '<0.001' : p.toFixed(3);
};

/** `33rd`, `100th`, `2nd` — benchmark ranks read as prose, not raw numbers. */
export const ordinal = (value: number): string => {
    const mod100 = value % 100;
    if (mod100 >= 11 && mod100 <= 13) return `${value}th`;
    switch (value % 10) {
        case 1: return `${value}st`;
        case 2: return `${value}nd`;
        case 3: return `${value}rd`;
        default: return `${value}th`;
    }
};

/** `50 nearby windows` / `78 windows across the series`. */
export const benchmarkScope = (benchmark: Benchmark): string =>
    benchmark.kind === 'local'
        ? `${benchmark.n} nearby windows`
        : `${benchmark.n} windows across the series`;

/** Short label for crowded chart marks, e.g. `Sawan (Shravana) month` → `Sawan`. */
export const shortEventName = (name: string): string => {
    const trimmed = name.split(/[(—–,:]/)[0].trim();
    return trimmed.length > 22 ? `${trimmed.slice(0, 21)}…` : trimmed;
};
