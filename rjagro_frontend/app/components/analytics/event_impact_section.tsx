'use client'
import { useMemo } from 'react';
import { EventImpactChart } from './event_impact_chart';
import { EventImpactTable } from './event_impact_table';
import {
    eventEstimates, forecastMeta, formatPct, reliabilityCounts, reliabilityStyle,
} from '@/app/utils/price_forecast';

const Chip = ({ color, children }: { color: string; children: React.ReactNode }) => (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] text-gray-600">
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} aria-hidden />
        {children}
    </span>
);

export const EventImpactSection = () => {
    const counts = useMemo(() => reliabilityCounts(), []);
    const significant = useMemo(
        () => eventEstimates.filter((event) => event.pooledLo80 > 0 || event.pooledHi80 < 0),
        [],
    );
    const positive = useMemo(() => significant.filter((event) => event.pooledPct > 0), [significant]);
    const negative = useMemo(() => significant.filter((event) => event.pooledPct < 0), [significant]);

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                    <h3 className="text-sm font-semibold text-gray-700">Did prices do what the events suggested?</h3>
                    <p className="mt-0.5 max-w-3xl text-[11px] text-gray-500">
                        Each event is compared with a matched window of normal days on the same price path, then
                        shrunk toward its category so a single observed day cannot pose as a recurring effect.{' '}
                        {significant.length === 0
                            ? 'No event separates from zero at the 80% level in this sample.'
                            : `${significant.length} of ${eventEstimates.length} events separate from zero at the 80% level.`}
                        {positive.length > 0 && (
                            <>
                                {' '}{positive.length === 1 ? 'One is' : `${positive.length} are`} above baseline:{' '}
                                {positive.map((event) => `${event.name} (${formatPct(event.pooledPct)})`).join(', ')}.
                            </>
                        )}
                        {negative.length > 0 && (
                            <>
                                {' '}{negative.length === 1 ? 'One is' : `${negative.length} are`} below baseline:{' '}
                                {negative.map((event) => `${event.name} (${formatPct(event.pooledPct)})`).join(', ')}.
                            </>
                        )}{' '}
                        Everything else is reported with the width of its uncertainty rather than as a number to act
                        on.
                    </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                    {(['A', 'B', 'C', 'D', 'E'] as const).map((grade) => (
                        <Chip key={grade} color={reliabilityStyle(grade).dot}>
                            {counts[grade]} grade {grade}
                        </Chip>
                    ))}
                </div>
            </div>

            <EventImpactChart impacts={eventEstimates} />

            <EventImpactTable impacts={eventEstimates} />

            <details className="rounded-xl border border-gray-100 bg-white p-5 text-[11px] leading-relaxed text-gray-500 shadow-sm">
                <summary className="cursor-pointer text-sm font-semibold text-gray-700">How this is calculated</summary>
                <div className="mt-3 space-y-2">
                    <p>
                        <span className="font-medium text-gray-700">Window.</span> For each occurrence, the mean log
                        price on the official event dates is compared with the mean log price over the 14 days before
                        the lead-in and the 14 days after the recovery. The window is symmetric, so a price that is
                        trending into or out of the event largely cancels; days that belong to a different discrete
                        event&apos;s core window are dropped from the comparison.
                    </p>
                    <p>
                        <span className="font-medium text-gray-700">Why not a before/after difference.</span> That is a
                        description of the path, not an estimate: prices trend, and the run-up to a festival is part of
                        the event. April 2025 rose ₹86 → ₹125 before the wedding cluster, so a simple before/after
                        reads the plateau that followed as a fall.
                    </p>
                    <p>
                        <span className="font-medium text-gray-700">Uncertainty.</span> A circular block bootstrap over
                        the local price path (2,000 draws, 7-day blocks) keeps the serial correlation in the daily
                        series, so a one-day event gets the wide interval it deserves. Occurrences are then pooled with
                        a random-effects model.
                    </p>
                    <p>
                        <span className="font-medium text-gray-700">Pooling.</span> Each event estimate is
                        precision-weighted against a pooled category effect, itself shrunk toward zero:
                        event ~ N(category, {forecastMeta.tauWithin}%²), category ~ N(0, 4%²). That two-level prior is what stops a
                        one-day reading from being reported as a recurring percentage — and what keeps the
                        well-evidenced wedding effect nearly intact while pulling a single-day festival toward its
                        category.
                    </p>
                    <p>
                        <span className="font-medium text-gray-700">Grades.</span> A: 8+ occurrences and 30+ observed
                        days. B: 4+ and 15+. C: 2+ and 5+. D: one occurrence or under five days. E: no usable quotes,
                        so the number is the category prior and nothing else.
                    </p>
                    <p>
                        <span className="font-medium text-gray-700">Caveat.</span> This is co-movement, not causation.
                        Events overlap heavily — the wedding season sits inside the pre-monsoon heat season — and most
                        festival windows contain only one or two quoted days. Only the wedding row is strong enough to
                        act on, and even it rests on about six wedding periods rather than twelve independent seasons.
                    </p>
                </div>
            </details>
        </div>
    );
};

EventImpactSection.displayName = 'EventImpactSection';
