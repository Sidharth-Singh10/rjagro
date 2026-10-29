/**
 * Forecast and event-effect statistics for the Analytics tab.
 *
 * Input is `app/data/price_forecast.json`, written by
 * `chicken_price_forecast/src/09_export_frontend.py` from the validated model
 * outputs. Nothing here re-estimates anything: the UI shows exactly the numbers
 * the pipeline produced, so a chart cannot drift away from the report.
 *
 * Dates are ISO `YYYY-MM-DD` and handled in UTC, matching `rate_tracker.ts`.
 */
import dataset from '../data/price_forecast.json';

export type Reliability = 'A' | 'B' | 'C' | 'D' | 'E';
export type Category = 'festival' | 'observance' | 'islamic' | 'wedding' | 'fair' | 'seasonal';
export type Hypothesis = 'positive' | 'negative' | 'mixed';

export interface ForecastMeta {
    generatedAt: string;
    source: string;
    unit: string;
    market: string;
    dataThrough: string;
    forecastStart: string;
    forecastEnd: string;
    model: string;
    /** Between-event sd of the empirical-Bayes prior, in log per cent. */
    tauWithin: number;
    intervalMeaning: string;
    backtest: {
        models: number;
        scoredDays: number;
        origins: number;
        originRange: [string, string];
        smape1to7: number;
        smape8to28: number;
        smape29to90: number;
        smapeAll: number;
        bestModel: string;
        bestSmape: number;
    };
}

export interface DailyForecast {
    date: string;
    forecast: number;
    baseline: number;
    impactPct: number;
    lo80: number;
    hi80: number;
    lo95: number;
    hi95: number;
    events: string[];
    grade: Reliability;
}

export interface EventEstimate {
    id: string;
    name: string;
    category: Category;
    hypothesis: Hypothesis;
    occurrences: number;
    days: number;
    observedPrice: number | null;
    baselinePrice: number | null;
    absoluteImpact: number | null;
    rawPct: number | null;
    rawLo95: number | null;
    rawHi95: number | null;
    pooledPct: number;
    pooledLo80: number;
    pooledHi80: number;
    reliability: Reliability;
    reliabilityLabel: string;
    note: string | null;
    firstDate: string | null;
    lastDate: string | null;
}

export interface EventForecastRow {
    id: string;
    name: string;
    category: Category;
    start: string;
    end: string;
    dateConfidence: string;
    coreDays: number;
    meanPrice: number;
    baselinePrice: number;
    impactPct: number;
    impactInr: number;
    impactLo80: number;
    impactHi80: number;
    reliability: Reliability;
    occurrences: number;
    days: number;
    overlaps: string[];
}

export const forecastMeta = dataset.meta as unknown as ForecastMeta;
export const dailyForecast = dataset.daily as unknown as DailyForecast[];
export const eventEstimates = dataset.events as unknown as EventEstimate[];
export const futureEvents = dataset.eventForecasts as unknown as EventForecastRow[];

/** Every event type named in the forecast, in first-appearance order. */
export const eventNames = new Map(eventEstimates.map((e) => [e.id, e.name]));

export const eventName = (id: string): string => eventNames.get(id) ?? id;

// ---------------------------------------------------------------------------
// Reliability presentation
// ---------------------------------------------------------------------------
export const RELIABILITY_MEANING: Record<Reliability, string> = {
    A: 'at least 8 occurrences and 30 observed days',
    B: '4+ occurrences and 15+ observed days',
    C: '2+ occurrences and 5+ observed days',
    D: 'one occurrence or fewer than 5 days',
    E: 'no usable historical evidence — category prior only',
};

export const reliabilityStyle = (grade: Reliability) => {
    switch (grade) {
        case 'A':
            return { text: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', dot: '#16a34a' };
        case 'B':
            return { text: 'text-teal-700', bg: 'bg-teal-50', border: 'border-teal-200', dot: '#0d9488' };
        case 'C':
            return { text: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', dot: '#a6761a' };
        case 'D':
            return { text: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200', dot: '#b3702e' };
        default:
            return { text: 'text-gray-500', bg: 'bg-gray-50', border: 'border-gray-200', dot: '#94a3b8' };
    }
};

export const categoryColor: Record<Category, string> = {
    festival: '#6f6a9e',
    observance: '#2e8b64',
    islamic: '#b3702e',
    wedding: '#a6761a',
    fair: '#94a3b8',
    seasonal: '#3d7ea6',
};

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------
export const formatPct = (value: number | null, digits = 1): string => {
    if (value === null || value === undefined || Number.isNaN(value)) return '—';
    const sign = value > 0 ? '+' : value < 0 ? '−' : '';
    return `${sign}${Math.abs(value).toFixed(digits)}%`;
};

export const formatInr = (value: number | null, digits = 1): string =>
    value === null || value === undefined || Number.isNaN(value)
        ? '—'
        : `₹${value.toLocaleString('en-IN', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;

const shortDate = new Intl.DateTimeFormat('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
});

const monthShort = new Intl.DateTimeFormat('en-IN', { month: 'short', timeZone: 'UTC' });

const asUtc = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d));
};

export const formatDate = (iso: string): string => shortDate.format(asUtc(iso));

/** `18–23 Oct 2026`, collapsing the parts the two dates share. */
export const formatRange = (start: string, end: string): string => {
    if (start === end) return formatDate(start);
    const a = asUtc(start);
    const b = asUtc(end);
    const sameMonth = start.slice(0, 7) === end.slice(0, 7);
    const sameYear = start.slice(0, 4) === end.slice(0, 4);
    if (sameMonth) return `${a.getUTCDate()}–${b.getUTCDate()} ${monthShort.format(a)} ${b.getUTCFullYear()}`;
    if (sameYear) {
        return `${a.getUTCDate()} ${monthShort.format(a)} – ${b.getUTCDate()} ${monthShort.format(b)} ${b.getUTCFullYear()}`;
    }
    return `${formatDate(start)} – ${formatDate(end)}`;
};

/** `2026-10` → `Oct 2026`. */
export const formatMonth = (key: string): string => {
    const [y, m] = key.split('-').map(Number);
    return `${monthShort.format(new Date(Date.UTC(y, m - 1, 1)))} ${y}`;
};

// ---------------------------------------------------------------------------
// Derived series
// ---------------------------------------------------------------------------
const DAY_MS = 86_400_000;

const epoch = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
};

const isoFromEpoch = (value: number) => new Date(value).toISOString().slice(0, 10);

/** Centre-of-window moving average over calendar days, skipping missing days. */
export const smooth = (rows: DailyForecast[], window = 7): DailyForecast[] => {
    if (rows.length <= window) return rows;
    const half = Math.floor(window / 2);
    return rows.map((row, index) => {
        const slice = rows.slice(Math.max(0, index - half), Math.min(rows.length, index + half + 1));
        const mean = (pick: (r: DailyForecast) => number) =>
            slice.reduce((sum, r) => sum + pick(r), 0) / slice.length;
        return {
            ...row,
            forecast: mean((r) => r.forecast),
            baseline: mean((r) => r.baseline),
            lo80: mean((r) => r.lo80),
            hi80: mean((r) => r.hi80),
            lo95: mean((r) => r.lo95),
            hi95: mean((r) => r.hi95),
        };
    });
};

export interface ChartPoint {
    date: string;
    history: number | null;
    forecast: number | null;
    baseline: number | null;
    /** `[low, high]` pairs; Recharts renders a range area from an array value. */
    band95: [number, number] | null;
    band80: [number, number] | null;
    active: string[];
}

/**
 * History and forecast on one daily axis. The forecast is smoothed so the
 * weekly pattern does not read as noise at this scale; the unsmoothed values
 * stay in `daily` for the table.
 */
export const chartSeries = (
    history: Array<{ date: string; rate: number }>,
    window = 7,
): ChartPoint[] => {
    const smoothed = smooth(dailyForecast, window);
    const byDate = new Map(smoothed.map((row) => [row.date, row]));
    const first = smoothed[0]?.date ?? dailyForecast[0].date;
    const last = smoothed[smoothed.length - 1]?.date ?? dailyForecast[dailyForecast.length - 1].date;

    // two months of observed prices before the forecast, so the join is visible
    const joinFrom = isoFromEpoch(epoch(first) - 60 * DAY_MS);

    const points: ChartPoint[] = history
        .filter((point) => point.date >= joinFrom && point.date <= first)
        .map((point) => ({
            date: point.date,
            history: point.rate,
            forecast: null,
            baseline: null,
            band95: null,
            band80: null,
            active: [],
        }));

    const lastHistory = [...history].reverse().find((point) => point.date <= first);
    if (lastHistory) {
        const anchor = points[points.length - 1];
        if (anchor) {
            anchor.forecast = lastHistory.rate;
            anchor.baseline = lastHistory.rate;
        }
    }

    for (let t = epoch(first); t <= epoch(last); t += DAY_MS) {
        const date = isoFromEpoch(t);
        const row = byDate.get(date);
        if (!row) continue;
        points.push({
            date,
            history: null,
            forecast: row.forecast,
            baseline: row.baseline,
            band95: [row.lo95, row.hi95],
            band80: [row.lo80, row.hi80],
            active: row.events,
        });
    }

    return points;
};

/** Month-end snapshot of the central path, for the summary strip. */
export const monthlyForecast = (): Array<{ key: string; label: string; forecast: number; baseline: number }> => {
    const groups = new Map<string, DailyForecast[]>();
    for (const row of dailyForecast) {
        const key = row.date.slice(0, 7);
        const bucket = groups.get(key);
        if (bucket) bucket.push(row);
        else groups.set(key, [row]);
    }
    return [...groups.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, rows]) => ({
            key,
            label: formatMonth(key),
            forecast: rows.reduce((sum, r) => sum + r.forecast, 0) / rows.length,
            baseline: rows.reduce((sum, r) => sum + r.baseline, 0) / rows.length,
        }));
};

export const forecastSummary = () => {
    const first = dailyForecast[0];
    const last = dailyForecast[dailyForecast.length - 1];
    // seasonal extremes come from the baseline: the event-adjusted path can dip
    // on a single festival day without saying anything about the season
    const peak = dailyForecast.reduce((best, row) => (row.baseline > best.baseline ? row : best), first);
    const trough = dailyForecast.reduce((best, row) => (row.baseline < best.baseline ? row : best), first);
    const eventDays = dailyForecast.filter((row) => row.impactPct !== 0).length;
    return { first, last, peak, trough, eventDays, days: dailyForecast.length };
};

export const reliabilityCounts = (): Record<Reliability, number> => {
    const counts: Record<Reliability, number> = { A: 0, B: 0, C: 0, D: 0, E: 0 };
    for (const event of eventEstimates) counts[event.reliability] += 1;
    return counts;
};
