/**
 * The small statistics kernel behind the event-impact labels.
 *
 * Every event is compared with an equal-length window immediately before it,
 * but a raw `during ÷ before` ratio is not a test: prices trend, and a window
 * that opens just after a run-up will look flat or negative even when demand
 * did move. So the comparison is done on `log(price)`, the pre-window trend is
 * fitted and projected over the event, and the leftover move (the forecast
 * error) is ranked against every other window of the same length nearby.
 *
 * Nothing here assumes independent daily quotes. The benchmark resamples whole
 * windows, which keeps the day-to-day autocorrelation of a price series inside
 * the null instead of pretending it is noise.
 *
 * All dates are ISO `YYYY-MM-DD` handled in UTC, and every function is pure and
 * deterministic so the Node check scripts and the browser produce the same
 * numbers.
 */
import type { RatePoint } from './rate_tracker';

const MS_PER_DAY = 86_400_000;

export const epochOf = (iso: string): number => Date.UTC(
    Number(iso.slice(0, 4)),
    Number(iso.slice(5, 7)) - 1,
    Number(iso.slice(8, 10)),
);

export const isoOf = (epoch: number): string => new Date(epoch).toISOString().slice(0, 10);

export const addDays = (iso: string, days: number): string =>
    isoOf(epochOf(iso) + days * MS_PER_DAY);

/** Whole calendar days from `from` to `to`; negative when `to` is earlier. */
export const dayGap = (from: string, to: string): number =>
    Math.round((epochOf(to) - epochOf(from)) / MS_PER_DAY);

export const minIso = (a: string, b: string): string => (a < b ? a : b);

export const roundTo = (value: number, digits: number): number => {
    const factor = 10 ** digits;
    return Math.round(value * factor) / factor;
};

/** Quoted days only: a blank cell in the source sheet is a missing quote, not a zero. */
export const quotesBetween = (
    points: readonly RatePoint[],
    from: string,
    to: string,
): RatePoint[] => points.filter((point) => point.date >= from && point.date <= to);

export const averageRate = (points: readonly RatePoint[]): number | null =>
    points.length === 0
        ? null
        : points.reduce((sum, point) => sum + point.rate, 0) / points.length;

export const percentChange = (from: number, to: number): number => ((to - from) / from) * 100;

/** Groups an ascending series into maximal runs of consecutive calendar days. */
export const contiguousBlocks = (points: readonly RatePoint[]): RatePoint[][] => {
    const blocks: RatePoint[][] = [];
    let current: RatePoint[] = [];

    for (const point of points) {
        const previous = current[current.length - 1];
        if (previous && dayGap(previous.date, point.date) !== 1) {
            blocks.push(current);
            current = [];
        }
        current.push(point);
    }
    if (current.length > 0) blocks.push(current);

    return blocks.filter((block) => block.length >= 2);
};

// ---------------------------------------------------------------------------
// Trend fit
// ---------------------------------------------------------------------------

export interface LogTrend {
    /** Date the day offsets are measured from (the first pre-window quote). */
    origin: string;
    intercept: number;
    /** Log-points per calendar day. */
    slope: number;
    residualSd: number;
    r2: number;
    n: number;
}

/**
 * OLS of `log(rate)` on the calendar-day offset. Returns null when there are
 * fewer than three quotes or every quote falls on the same day, because a
 * slope cannot be identified then.
 */
export const fitLogTrend = (points: readonly RatePoint[]): LogTrend | null => {
    if (points.length < 3) return null;

    const origin = points[0].date;
    const xs = points.map((point) => dayGap(origin, point.date));
    const ys = points.map((point) => Math.log(point.rate));
    const n = xs.length;

    const meanX = xs.reduce((sum, value) => sum + value, 0) / n;
    const meanY = ys.reduce((sum, value) => sum + value, 0) / n;

    let sxx = 0;
    let sxy = 0;
    for (let index = 0; index < n; index += 1) {
        const dx = xs[index] - meanX;
        sxx += dx * dx;
        sxy += dx * (ys[index] - meanY);
    }
    if (sxx < 1e-9) return null;

    const slope = sxy / sxx;
    const intercept = meanY - slope * meanX;

    let sse = 0;
    let sst = 0;
    for (let index = 0; index < n; index += 1) {
        const error = ys[index] - (intercept + slope * xs[index]);
        sse += error * error;
        const centred = ys[index] - meanY;
        sst += centred * centred;
    }

    return {
        origin,
        intercept,
        slope,
        residualSd: n > 2 ? Math.sqrt(sse / (n - 2)) : 0,
        r2: sst > 0 ? 1 - sse / sst : 0,
        n,
    };
};

/**
 * Mean forecast error of the event's quoted days against the pre-window trend,
 * in log points. Positive means prices came in above the trend they were on.
 */
export const meanForecastError = (
    trend: LogTrend,
    during: readonly RatePoint[],
): number | null => {
    if (during.length === 0) return null;

    let total = 0;
    for (const point of during) {
        const predicted = trend.intercept + trend.slope * dayGap(trend.origin, point.date);
        total += Math.log(point.rate) - predicted;
    }
    return total / during.length;
};

// ---------------------------------------------------------------------------
// Benchmark of comparable windows
// ---------------------------------------------------------------------------

export interface WindowResidual {
    /** Start date the window was anchored on. */
    anchor: string;
    /** Mean forecast error of that window against its own pre-trend, log points. */
    value: number;
}

const residualCache = new WeakMap<readonly RatePoint[], Map<number, WindowResidual[]>>();

/**
 * Every same-length window in the series, scored exactly like a real event:
 * trend fitted on the `windowDays` quotes before the anchor, projected over the
 * next `windowDays` quotes. Runs of consecutive days only, so a holiday gap is
 * never bridged.
 */
export const windowResiduals = (
    points: readonly RatePoint[],
    windowDays: number,
): WindowResidual[] => {
    let perLength = residualCache.get(points);
    if (!perLength) {
        perLength = new Map<number, WindowResidual[]>();
        residualCache.set(points, perLength);
    }
    const cached = perLength.get(windowDays);
    if (cached) return cached;

    const out: WindowResidual[] = [];

    for (const block of contiguousBlocks(points)) {
        for (let index = windowDays; index <= block.length - windowDays; index += 1) {
            const trend = fitLogTrend(block.slice(index - windowDays, index));
            if (!trend) continue;

            let total = 0;
            for (let offset = 0; offset < windowDays; offset += 1) {
                const point = block[index + offset];
                const predicted = trend.intercept + trend.slope * dayGap(trend.origin, point.date);
                total += Math.log(point.rate) - predicted;
            }
            out.push({ anchor: block[index].date, value: total / windowDays });
        }
    }

    perLength.set(windowDays, out);
    return out;
};

export interface Benchmark {
    /** `local` = windows within the radius; `global` = the whole series. */
    kind: 'local' | 'global';
    n: number;
    /** Share of benchmark windows with a smaller residual, 0–100. */
    percentile: number;
    /** Two-sided add-one empirical p-value; never zero. */
    p: number;
}

/**
 * Ranks one window's residual against comparable windows. The anchor's own
 * window is excluded. When fewer than `minWindows` sit within `radiusDays` the
 * whole series is used and the result is flagged as global.
 */
export const buildBenchmark = (
    value: number,
    anchor: string,
    windows: readonly WindowResidual[],
    radiusDays = 45,
    minWindows = 20,
): Benchmark | null => {
    const others = windows.filter((window) => window.anchor !== anchor);
    if (others.length < minWindows) return null;

    const local = others.filter((window) => Math.abs(dayGap(anchor, window.anchor)) <= radiusDays);
    const useLocal = local.length >= minWindows;
    const pool = useLocal ? local : others;

    let below = 0;
    let above = 0;
    for (const window of pool) {
        if (window.value < value) below += 1;
        else if (window.value > value) above += 1;
    }

    const n = pool.length;
    const p = Math.min(1, 2 * Math.min((below + 1) / (n + 1), (above + 1) / (n + 1)));

    return {
        kind: useLocal ? 'local' : 'global',
        n,
        percentile: Math.round((below / n) * 100),
        p: roundTo(p, 3),
    };
};

// ---------------------------------------------------------------------------
// Fragility and multiplicity
// ---------------------------------------------------------------------------

export interface StabilityRange {
    min: number;
    max: number;
    shifts: number;
    /** False when the sign of the raw change depends on where the baseline starts. */
    stable: boolean;
}

/**
 * How much the raw change moves when the pre-window is slid 0–`maxShift` days
 * earlier. This is the cheapest honest stress test of the baseline choice: on a
 * series that has already run up, a few days decides whether the event "rose"
 * or "fell".
 */
export const stabilityRange = (
    points: readonly RatePoint[],
    start: string,
    end: string,
    windowDays: number,
    maxShift = 4,
): StabilityRange | null => {
    const during = quotesBetween(points, start, minIso(addDays(start, windowDays - 1), end));
    const duringMean = averageRate(during);
    if (duringMean === null || during.length < 3) return null;

    const deltas: number[] = [];
    for (let shift = 0; shift <= maxShift; shift += 1) {
        const pre = quotesBetween(
            points,
            addDays(start, -windowDays - shift),
            addDays(start, -1 - shift),
        );
        const preMean = averageRate(pre);
        if (preMean === null || pre.length < 3) continue;
        deltas.push(percentChange(preMean, duringMean));
    }

    if (deltas.length < 4) return null;

    const min = Math.min(...deltas);
    const max = Math.max(...deltas);
    return { min, max, shifts: deltas.length, stable: min >= 0 || max <= 0 };
};

/**
 * Benjamini–Hochberg q-values, aligned to the input order. Null p-values stay
 * null. Reported in the UI but deliberately not used to filter labels: the rows
 * are not independent tests, so a hard FDR gate would overstate what is known.
 */
export const benjaminiHochberg = (
    pValues: readonly (number | null)[],
): (number | null)[] => {
    const indexed = pValues
        .map((p, index) => ({ p, index }))
        .filter((entry): entry is { p: number; index: number } =>
            entry.p !== null && Number.isFinite(entry.p));

    const out: (number | null)[] = pValues.map(() => null);
    if (indexed.length === 0) return out;

    indexed.sort((a, b) => a.p - b.p);
    const m = indexed.length;
    const q = new Array<number>(m);
    let running = 1;

    for (let index = m - 1; index >= 0; index -= 1) {
        running = Math.min(running, (indexed[index].p * m) / (index + 1));
        q[index] = running;
    }

    for (let index = 0; index < m; index += 1) {
        out[indexed[index].index] = roundTo(Math.min(1, q[index]), 3);
    }
    return out;
};
