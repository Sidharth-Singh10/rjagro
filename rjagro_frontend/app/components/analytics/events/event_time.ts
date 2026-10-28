/**
 * Small date helpers for the event timeline.
 *
 * Every year track is drawn on the same Jan–Dec day scale, so month columns
 * line up down the stack and two years can be compared by eye. All comparisons
 * stay on ISO `YYYY-MM-DD` strings or UTC epochs, so nothing shifts with the
 * browser timezone.
 */

export const MS_PER_DAY = 86_400_000;

const pad = (value: number) => String(value).padStart(2, '0');

export const epochOf = (iso: string): number => Date.UTC(
    Number(iso.slice(0, 4)),
    Number(iso.slice(5, 7)) - 1,
    Number(iso.slice(8, 10)),
);

export const isoOf = (epoch: number): string => new Date(epoch).toISOString().slice(0, 10);

export const daysBetween = (from: string, to: string): number =>
    Math.round((epochOf(to) - epochOf(from)) / MS_PER_DAY);

export const addDays = (iso: string, days: number): string => isoOf(epochOf(iso) + days * MS_PER_DAY);

export const daysInYear = (year: number): number => daysBetween(`${year}-01-01`, `${year}-12-31`) + 1;

export const clampIso = (iso: string, min: string, max: string): string =>
    iso < min ? min : iso > max ? max : iso;

export const MONTH_LABELS = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;

export interface MonthCell {
    month: number;
    label: string;
    /** First and last ISO day of the month. */
    first: string;
    last: string;
    /** Number of days this month contributes to the track. */
    days: number;
    /** Share of the year track, for width percentages. */
    widthPct: number;
}

/** Twelve equal-day columns of a calendar year, shared by every year track. */
export const monthCells = (year: number): MonthCell[] => {
    const total = daysInYear(year);
    return MONTH_LABELS.map((label, month) => {
        const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
        return {
            month,
            label,
            first: `${year}-${pad(month + 1)}-01`,
            last: `${year}-${pad(month + 1)}-${pad(days)}`,
            days,
            widthPct: (days / total) * 100,
        };
    });
};

/** Left offset of an ISO date as a share of the whole year track. */
export const offsetPct = (iso: string, trackStart: string, totalDays: number): number =>
    (daysBetween(trackStart, iso) / totalDays) * 100;

/** Width of an inclusive ISO range as a share of the whole year track. */
export const spanPct = (from: string, to: string, totalDays: number): number =>
    ((daysBetween(from, to) + 1) / totalDays) * 100;
