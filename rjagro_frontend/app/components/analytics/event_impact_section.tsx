'use client'
import { useMemo } from 'react';
import { EventImpactChart } from './event_impact_chart';
import { EventImpactTable } from './event_impact_table';
import { ConclusionsList } from './conclusions_list';
import { useAnalytics } from './analytics_provider';
import { reliabilityStyle, type Reliability } from '@/app/utils/analytics';

const Chip = ({ color, children }: { color: string; children: React.ReactNode }) => (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] text-gray-600">
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} aria-hidden />
        {children}
    </span>
);

export const EventImpactSection = () => {
    const { payload } = useAnalytics();
    const items = payload.events.items;

    const counts = useMemo(() => {
        const c: Record<Reliability, number> = { A: 0, B: 0, C: 0, D: 0, E: 0 };
        for (const e of items) c[e.reliability] += 1;
        return c;
    }, [items]);

    const eventConclusions = payload.conclusions.filter((c) =>
        ['event-strength', 'strongest-event', 'festival-pool', 'evidence-depth'].includes(c.id));

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                    <h3 className="text-sm font-semibold text-gray-700">Did prices do what the events suggested?</h3>
                    <p className="mt-0.5 max-w-3xl text-[11px] text-gray-500">
                        Each event is compared with a matched window of normal days on the same price path, then
                        shrunk toward its category so a single observed day cannot pose as a recurring effect. The
                        statements below are written by the pipeline from this run&apos;s numbers.
                    </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                    {(['A', 'B', 'C', 'D', 'E'] as const).map((g) => (
                        <Chip key={g} color={reliabilityStyle(g).dot}>{counts[g]} grade {g}</Chip>
                    ))}
                </div>
            </div>

            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                <ConclusionsList conclusions={eventConclusions} />
            </div>

            <EventImpactChart impacts={items} />

            <EventImpactTable impacts={items} />

            <details className="rounded-xl border border-gray-100 bg-white p-5 text-[11px] leading-relaxed text-gray-500 shadow-sm">
                <summary className="cursor-pointer text-sm font-semibold text-gray-700">How this is calculated</summary>
                <div className="mt-3 space-y-2">
                    <p>
                        <span className="font-medium text-gray-700">Window.</span> For each occurrence, the mean log
                        price on the official event dates is compared with the mean over the 14 days before the
                        lead-in and after the recovery. Days that belong to another discrete event&apos;s core window
                        are dropped from the comparison.
                    </p>
                    <p>
                        <span className="font-medium text-gray-700">Why not a before/after difference.</span> That
                        describes the path, not the effect: prices trend, and the run-up to a festival is part of the
                        event. A symmetric window makes a trend largely cancel.
                    </p>
                    <p>
                        <span className="font-medium text-gray-700">Uncertainty.</span> A circular block bootstrap
                        over the local price path (7-day blocks) keeps the serial correlation of the daily series, so
                        a one-day event gets the interval it deserves. Occurrences are then pooled with a
                        random-effects model.
                    </p>
                    <p>
                        <span className="font-medium text-gray-700">Pooling.</span> Each event is precision-weighted
                        against a pooled category effect, itself shrunk toward zero. That is what stops a one-day
                        reading being reported as a recurring percentage.
                    </p>
                    <p>
                        <span className="font-medium text-gray-700">Grades.</span> A: 8+ occurrences and 30+ quoted
                        days. B: 4+ and 15+. C: 2+ and 5+. D: one occurrence or under five days. E: no usable quotes,
                        so the number is the category prior and nothing else.
                    </p>
                    <p>
                        <span className="font-medium text-gray-700">Caveat.</span> This is co-movement, not causation.
                        Events overlap heavily and most festival windows contain one or two quoted days.
                    </p>
                </div>
            </details>
        </div>
    );
};

EventImpactSection.displayName = 'EventImpactSection';
