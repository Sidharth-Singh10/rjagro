'use client'
import { useMemo } from 'react';
import { dailySeries } from '@/app/utils/rate_tracker';
import { eventImpacts, summariseImpacts } from '@/app/utils/event_price_impact';
import { EventImpactChart } from './event_impact_chart';
import { EventImpactTable } from './event_impact_table';

const Chip = ({ color, children }: { color: string; children: React.ReactNode }) => (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] text-gray-600">
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} aria-hidden />
        {children}
    </span>
);

export const EventImpactSection = () => {
    const days = useMemo(() => dailySeries(), []);
    const summary = useMemo(() => summariseImpacts(eventImpacts), []);

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                    <h3 className="text-sm font-semibold text-gray-700">Did prices do what the events suggested?</h3>
                    <p className="mt-0.5 max-w-2xl text-[11px] text-gray-500">
                        {summary.observable} events fall inside the priced window and {summary.analysable} have enough
                        quotes to test. The rest are marked rather than guessed.
                    </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                    <Chip color="#16a34a">{summary.aligned} matched</Chip>
                    <Chip color="#dc2626">{summary.opposed} opposite</Chip>
                    <Chip color="#a6761a">{summary.inconclusive} inconclusive</Chip>
                    <Chip color="#94a3b8">{summary.insufficient} not enough quotes</Chip>
                    <Chip color="#cbd5e1">{summary.pending} future</Chip>
                </div>
            </div>

            <EventImpactChart impacts={eventImpacts} days={days} />

            <EventImpactTable impacts={eventImpacts} />

            <details className="rounded-xl border border-gray-100 bg-white p-5 text-[11px] leading-relaxed text-gray-500 shadow-sm">
                <summary className="cursor-pointer text-sm font-semibold text-gray-700">How this is calculated</summary>
                <div className="mt-3 space-y-2">
                    <p>
                        <span className="font-medium text-gray-700">Window.</span> Each event is compared against a
                        window of the same length immediately before it, clamped to 3–14 days. A one-day festival
                        therefore uses three days either side; a month-long fasting period uses fourteen.
                    </p>
                    <p>
                        <span className="font-medium text-gray-700">Average.</span> Only days with a quote are
                        averaged. The comparison is <span className="font-medium text-gray-700">(average during − average before) ÷ average before</span>,
                        rounded to one decimal.
                    </p>
                    <p>
                        <span className="font-medium text-gray-700">Labels.</span> A move smaller than 2% counts as
                        flat. An event is <em>matched</em> when an uptick hypothesis met a rise (or a downturn a
                        fall), <em>opposite</em> when it went the other way, and <em>inconclusive</em> when the
                        hypothesis was mixed or the move was flat. A side with fewer than three quotes shows
                        “not enough quotes” and no percentage.
                    </p>
                    <p>
                        <span className="font-medium text-gray-700">Caveat.</span> This is co-movement, not causation.
                        Events overlap, pre-festival buying can move the peak outside the window, and the price has
                        its own cycle. Rows list any other event sharing the comparison windows.
                    </p>
                </div>
            </details>
        </div>
    );
};

EventImpactSection.displayName = 'EventImpactSection';
