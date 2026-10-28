/**
 * Aggregations for the wholesale chicken rate tracker.
 *
 * Input is the static dataset generated from the source sheet by
 * `scripts/parse_rate_tracker.mjs`. Only priced days are stored, so every
 * average here is over quoted days — a blank cell is a missing quote, never a
 * zero. Buckets keep their observation count so sparse weeks and months can be
 * read honestly instead of looking like a real price move.
 *
 * All dates are ISO `YYYY-MM-DD` and handled in UTC so a bucket never shifts
 * with the browser's timezone.
 */
import dataset from '../data/chicken_rates.json';

export interface RatePoint {
    date: string;
    rate: number;
}

export interface BucketStat {
    /** `YYYY-MM` for months, ISO Monday (week start) for weeks. */
    key: string;
    /** Short axis label. */
    label: string;
    /** Human-readable range used in tooltips. */
    longLabel: string;
    avg: number;
    min: number;
    max: number;
    /** Priced days inside the bucket. */
    observed: number;
    /** Calendar days inside the bucket (month length or 7). */
    span: number;
}

export interface BestWindow {
    days: number;
    start: string;
    end: string;
    avg: number;
    min: number;
    max: number;
    observed: number;
    coverage: number;
}

export interface RateKpis {
    latest: RatePoint;
    average30: number;
    average30Observed: number;
    high: RatePoint;
    low: RatePoint;
    /** Percent change against the closest quote ~1 year earlier, null if none. */
    yoyPct: number | null;
    yoyBase: RatePoint | null;
}

export const ratePoints: RatePoint[] = dataset.rows;
export const rateUnit = dataset.unit;
export const rateSource = dataset.source;

const MS_PER_DAY = 86_400_000;

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const epochOf = (iso: string) => Date.UTC(
    Number(iso.slice(0, 4)),
    Number(iso.slice(5, 7)) - 1,
    Number(iso.slice(8, 10)),
);

const isoOf = (epoch: number) => {
    const d = new Date(epoch);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
};

const dayLabel = (iso: string) => {
    const epoch = epochOf(iso);
    const d = new Date(epoch);
    return `${d.getUTCDate()} ${MONTHS_SHORT[d.getUTCMonth()]}`;
};

const dayLabelWithYear = (iso: string) => `${dayLabel(iso)} ${iso.slice(0, 4)}`;

const monthLabel = (key: string) => {
    const [year, month] = key.split('-');
    return `${MONTHS_SHORT[Number(month) - 1]} ${year.slice(2)}`;
};

const monthLongLabel = (key: string) => {
    const [year, month] = key.split('-');
    return `${MONTHS_SHORT[Number(month) - 1]} ${year}`;
};

const monthSpan = (key: string) => {
    const [year, month] = key.split('-').map(Number);
    return new Date(Date.UTC(year, month, 0)).getUTCDate();
};

/** Monday of the week containing `iso`. */
const weekStartOf = (iso: string) => {
    const epoch = epochOf(iso);
    const weekday = new Date(epoch).getUTCDay(); // 0 = Sunday
    const offset = (weekday + 6) % 7;
    return isoOf(epoch - offset * MS_PER_DAY);
};

const weekLongLabel = (key: string) => {
    const end = isoOf(epochOf(key) + 6 * MS_PER_DAY);
    return `${dayLabelWithYear(key)} – ${dayLabelWithYear(end)}`;
};

const average = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;

const round2 = (value: number) => Math.round(value * 100) / 100;

export const formatRate = (value: number, digits = 2) =>
    `₹${value.toLocaleString('en-IN', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;

interface Scan {
    key: string;
    values: number[];
    span: number;
    label: string;
    longLabel: string;
}

const toBucket = (scan: Scan): BucketStat => ({
    key: scan.key,
    label: scan.label,
    longLabel: scan.longLabel,
    avg: round2(average(scan.values)),
    min: Math.min(...scan.values),
    max: Math.max(...scan.values),
    observed: scan.values.length,
    span: scan.span,
});

/** Monthly averages over every month that has at least one quote. */
export const monthlySeries = (points: RatePoint[] = ratePoints): BucketStat[] => {
    const buckets = new Map<string, number[]>();

    for (const point of points) {
        const key = point.date.slice(0, 7);
        const values = buckets.get(key);
        if (values) values.push(point.rate);
        else buckets.set(key, [point.rate]);
    }

    return Array.from(buckets.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, values]) => toBucket({
            key,
            values,
            span: monthSpan(key),
            label: monthLabel(key),
            longLabel: monthLongLabel(key),
        }));
};

/**
 * Weekly averages, Monday–Sunday. Weeks without a single quote inside the
 * series range are kept with `avg: null` so the line breaks instead of
 * pretending the price held steady. Callers should pass the result straight
 * to a chart with `connectNulls={false}`.
 */
export interface WeeklyPoint {
    key: string;
    label: string;
    longLabel: string;
    avg: number | null;
    min: number | null;
    max: number | null;
    observed: number;
    span: number;
}

export const weeklySeries = (points: RatePoint[] = ratePoints): WeeklyPoint[] => {
    if (points.length === 0) return [];

    const buckets = new Map<string, number[]>();
    for (const point of points) {
        const key = weekStartOf(point.date);
        const values = buckets.get(key);
        if (values) values.push(point.rate);
        else buckets.set(key, [point.rate]);
    }

    const first = weekStartOf(points[0].date);
    const last = weekStartOf(points[points.length - 1].date);
    const series: WeeklyPoint[] = [];

    for (let epoch = epochOf(first); epoch <= epochOf(last); epoch += 7 * MS_PER_DAY) {
        const key = isoOf(epoch);
        const values = buckets.get(key) ?? [];
        series.push({
            key,
            label: dayLabel(key),
            longLabel: weekLongLabel(key),
            avg: values.length > 0 ? round2(average(values)) : null,
            min: values.length > 0 ? Math.min(...values) : null,
            max: values.length > 0 ? Math.max(...values) : null,
            observed: values.length,
            span: 7,
        });
    }

    return series;
};

export interface BestWindowOptions {
    top?: number;
    /** Share of the window that must have a quote, e.g. 0.6 → 3/5 and 5/7. */
    minCoverage?: number;
    /** Pick the best non-overlapping windows so the list isn't five near-copies. */
    nonOverlapping?: boolean;
}

/**
 * Ranks every consecutive `days`-long calendar window by the average of the
 * days that were actually quoted.
 *
 * A window missing too many quotes is skipped rather than ranked on one day,
 * and by default the winners are de-overlapped: the July 2026 peak otherwise
 * fills the whole top five with windows shifted by a day.
 */
export const bestWindows = (
    points: RatePoint[] = ratePoints,
    days = 5,
    { top = 5, minCoverage = 0.6, nonOverlapping = true }: BestWindowOptions = {},
): BestWindow[] => {
    if (points.length === 0) return [];

    const byDate = new Map(points.map((point) => [point.date, point.rate]));
    const minObserved = Math.ceil(days * minCoverage);
    const first = epochOf(points[0].date);
    const last = epochOf(points[points.length - 1].date);

    const candidates: BestWindow[] = [];

    for (let epoch = first; epoch + (days - 1) * MS_PER_DAY <= last; epoch += MS_PER_DAY) {
        const values: number[] = [];
        for (let offset = 0; offset < days; offset += 1) {
            const rate = byDate.get(isoOf(epoch + offset * MS_PER_DAY));
            if (rate !== undefined) values.push(rate);
        }
        if (values.length < minObserved) continue;

        candidates.push({
            days,
            start: isoOf(epoch),
            end: isoOf(epoch + (days - 1) * MS_PER_DAY),
            avg: round2(average(values)),
            min: Math.min(...values),
            max: Math.max(...values),
            observed: values.length,
            coverage: round2(values.length / days),
        });
    }

    candidates.sort((a, b) => b.avg - a.avg || a.start.localeCompare(b.start));

    if (!nonOverlapping) return candidates.slice(0, top);

    const picked: BestWindow[] = [];
    for (const candidate of candidates) {
        if (picked.length >= top) break;
        const overlaps = picked.some(
            (window) => candidate.start <= window.end && candidate.end >= window.start,
        );
        if (!overlaps) picked.push(candidate);
    }
    return picked;
};

/**
 * Every calendar day between the first and last quote, with `rate: null` on
 * days that were not quoted. Used for the daily line so data outages read as
 * gaps rather than as a straight line between two distant points.
 */
export interface DailyPoint {
    date: string;
    label: string;
    rate: number | null;
}

export const dailySeries = (points: RatePoint[] = ratePoints): DailyPoint[] => {
    if (points.length === 0) return [];

    const byDate = new Map(points.map((point) => [point.date, point.rate]));
    const series: DailyPoint[] = [];

    for (
        let epoch = epochOf(points[0].date);
        epoch <= epochOf(points[points.length - 1].date);
        epoch += MS_PER_DAY
    ) {
        const date = isoOf(epoch);
        series.push({ date, label: dayLabel(date), rate: byDate.get(date) ?? null });
    }

    return series;
};

export const rateKpis = (points: RatePoint[] = ratePoints): RateKpis | null => {
    if (points.length === 0) return null;

    const latest = points[points.length - 1];
    const latestEpoch = epochOf(latest.date);

    const last30 = points.filter((point) => latestEpoch - epochOf(point.date) < 30 * MS_PER_DAY);

    const high = points.reduce((best, point) => (point.rate > best.rate ? point : best), points[0]);
    const low = points.reduce((best, point) => (point.rate < best.rate ? point : best), points[0]);

    // Closest priced day to one year before the latest quote, within two weeks.
    const target = latestEpoch - 365 * MS_PER_DAY;
    let yoyBase: RatePoint | null = null;
    let bestGap = 15 * MS_PER_DAY;

    for (const point of points) {
        const gap = Math.abs(epochOf(point.date) - target);
        if (gap <= bestGap) {
            bestGap = gap;
            yoyBase = point;
        }
    }

    return {
        latest,
        average30: round2(average(last30.map((point) => point.rate))),
        average30Observed: last30.length,
        high,
        low,
        yoyPct: yoyBase && yoyBase.rate > 0
            ? round2(((latest.rate - yoyBase.rate) / yoyBase.rate) * 100)
            : null,
        yoyBase,
    };
};

/** `11 Apr 2026 – 15 Apr 2026` for a ranked window. */
export const windowLabel = (window: BestWindow) => {
    if (window.days === 1) return dayLabelWithYear(window.start);
    return `${dayLabelWithYear(window.start)} – ${dayLabelWithYear(window.end)}`;
};

/** Compact axis label, e.g. `11–15 Apr 26` or `28 Jun – 4 Jul 26`. */
export const windowShortLabel = (window: BestWindow) => {
    const startYear = window.start.slice(0, 4);
    const endYear = window.end.slice(0, 4);
    const startMonth = window.start.slice(0, 7);
    const endMonth = window.end.slice(0, 7);

    if (startMonth === endMonth) {
        const startDay = Number(window.start.slice(8, 10));
        return `${startDay}–${dayLabel(window.end)} ${startYear.slice(2)}`;
    }

    const start = `${dayLabel(window.start)}`;
    const end = `${dayLabel(window.end)}`;
    return startYear === endYear
        ? `${start}–${end} ${startYear.slice(2)}`
        : `${start} ${startYear.slice(2)}–${end} ${endYear.slice(2)}`;
};
