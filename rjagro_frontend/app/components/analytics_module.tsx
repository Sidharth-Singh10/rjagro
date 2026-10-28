'use client'
import { useMemo } from 'react';
import { Info } from 'lucide-react';
import { chart } from './v2/overview/chart_colors';
import {
    bestWindows, dailySeries, formatRate, monthlySeries, rateKpis, ratePoints, rateUnit, weeklySeries,
} from '@/app/utils/rate_tracker';
import { RateKpis } from './analytics/rate_kpis';
import { MonthlyRateChart } from './analytics/monthly_rate_chart';
import { WeeklyRateChart } from './analytics/weekly_rate_chart';
import { BestRangeChart } from './analytics/best_range_chart';
import { DailyRateChart } from './analytics/daily_rate_chart';
import { EventsAndSeasonality } from './analytics/events/events_section';
import { eventCalendar } from '@/app/utils/event_calendar';

const DAY_MS = 86_400_000;

const Analysis = () => {
    const months = useMemo(() => monthlySeries(ratePoints), []);
    const weeks = useMemo(() => weeklySeries(ratePoints), []);
    const days = useMemo(() => dailySeries(ratePoints), []);
    const kpis = useMemo(() => rateKpis(ratePoints), []);
    const best5 = useMemo(() => bestWindows(ratePoints, 5), []);
    const best7 = useMemo(() => bestWindows(ratePoints, 7), []);

    const coverage = useMemo(() => {
        if (ratePoints.length === 0) return { quoted: 0, total: 0, pct: 0, from: '', to: '' };
        const first = ratePoints[0].date;
        const last = ratePoints[ratePoints.length - 1].date;
        const epoch = (iso: string) => Date.UTC(
            Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)),
        );
        const total = Math.round((epoch(last) - epoch(first)) / DAY_MS) + 1;
        return {
            quoted: ratePoints.length,
            total,
            pct: Math.round((ratePoints.length / total) * 100),
            from: first,
            to: last,
        };
    }, []);

    const short = (iso: string) =>
        new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
        });

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500">
                <Info size={14} className="text-gray-400" />
                <span>
                    {coverage.quoted} quoted days ({coverage.pct}% of {short(coverage.from)} – {short(coverage.to)})
                </span>
                <span className="text-gray-300">·</span>
                <span>All figures in ₹ per kg</span>
            </div>

            {kpis && <RateKpis kpis={kpis} />}

            <MonthlyRateChart months={months} />

            <WeeklyRateChart weeks={weeks} />

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <BestRangeChart windows={best5} days={5} color={chart.amber} />
                <BestRangeChart windows={best7} days={7} color={chart.violet} />
            </div>

            <DailyRateChart days={days} best5={best5[0] ?? null} best7={best7[0] ?? null} events={eventCalendar} />

            <EventsAndSeasonality />

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 text-xs text-gray-500 space-y-1.5">
                <p className="font-semibold text-gray-700 text-sm">How these numbers are built</p>
                <p>
                    Averages use only the days that carry a quote. Blank cells in the source sheet are treated as
                    missing, never as zero, so the {coverage.total - coverage.quoted} unpriced days do not drag the
                    trend down.
                </p>
                <p>
                    A 5-day window counts if at least 3 of its days are quoted, and a 7-day window if at least 5
                    are. The ranked list keeps the best non-overlapping windows so one hot week does not fill every row.
                </p>
                <p>
                    Rates are {rateUnit === 'INR/kg' ? 'rupees per kilogram' : rateUnit}. Best single window so far:{' '}
                    {best5.length > 0 ? `${formatRate(best5[0].avg)} over ${best5[0].days} days` : '—'}.
                </p>
            </div>
        </div>
    );
};

export default Analysis;
