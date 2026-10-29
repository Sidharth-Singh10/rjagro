'use client'
import { useMemo } from 'react';
import { Info } from 'lucide-react';
import { chart } from './v2/overview/chart_colors';
import { bestWindows, formatRate, monthlySeries, rateKpis, weeklySeries } from '@/app/utils/rate_tracker';
import { RateKpis } from './analytics/rate_kpis';
import { MonthlyRateChart } from './analytics/monthly_rate_chart';
import { WeeklyRateChart } from './analytics/weekly_rate_chart';
import { BestRangeChart } from './analytics/best_range_chart';
import { EventImpactSection } from './analytics/event_impact_section';
import { ForecastSection } from './analytics/forecast_section';
import { EventsAndSeasonality } from './analytics/events/events_section';
import { PricesCalendar } from './analytics/prices_calendar';
import { AnalyticsProvider, Provenance, useAnalytics } from './analytics/analytics_provider';

const DAY_MS = 86_400_000;

const AnalysisBody = () => {
    const { payload, points } = useAnalytics();

    const months = useMemo(() => monthlySeries(points), [points]);
    const weeks = useMemo(() => weeklySeries(points), [points]);
    const kpis = useMemo(() => rateKpis(points), [points]);
    const best5 = useMemo(() => bestWindows(points, 5), [points]);
    const best7 = useMemo(() => bestWindows(points, 7), [points]);

    const short = (iso: string) =>
        new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
        });

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500">
                <Info size={14} className="text-gray-400" />
                <span>
                    {payload.data.observations} quoted days ({100 - payload.data.missingPct}% of{' '}
                    {short(payload.data.first)} – {short(payload.data.last)})
                </span>
                <span className="text-gray-300">·</span>
                <span>All figures in ₹ per kg</span>
            </div>

            <Provenance />

            <PricesCalendar />

            {kpis && <RateKpis kpis={kpis} />}

            <MonthlyRateChart months={months} />

            <WeeklyRateChart weeks={weeks} />

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <BestRangeChart windows={best5} days={5} color={chart.amber} />
                <BestRangeChart windows={best7} days={7} color={chart.violet} />
            </div>

            <EventImpactSection />

            <ForecastSection />

            <EventsAndSeasonality />

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 text-xs text-gray-500 space-y-1.5">
                <p className="font-semibold text-gray-700 text-sm">How these numbers are built</p>
                <p>
                    Averages use only the days that carry a quote. A blank day is missing, never zero, so the{' '}
                    {payload.data.missingDays} unpriced days inside the history do not drag the trend down.
                </p>
                <p>
                    A 5-day window counts if at least 3 of its days are quoted, and a 7-day window if at least 5
                    are. The ranked list keeps the best non-overlapping windows so one hot week does not fill every row.
                </p>
                <p>
                    Rates are {payload.meta.unit === 'INR/kg' ? 'rupees per kilogram' : payload.meta.unit}. Best single
                    window so far: {best5.length > 0 ? `${formatRate(best5[0].avg)} over ${best5[0].days} days` : '—'}.
                </p>
            </div>
        </div>
    );
};

const Analysis = () => (
    <AnalyticsProvider>
        <AnalysisBody />
    </AnalyticsProvider>
);

export default Analysis;
