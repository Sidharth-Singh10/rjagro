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
                        quotes to test. A move counts only when it is unusual for nearby windows of the same length —{' '}
                        {summary.consistent + summary.contradicted + summary.fragile + summary.notable} of{' '}
                        {summary.analysable} are. The rest are marked rather than guessed.
                    </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                    <Chip color="#16a34a">{summary.consistent} with hypothesis</Chip>
                    <Chip color="#dc2626">{summary.contradicted} against hypothesis</Chip>
                    <Chip color="#a6761a">{summary.fragile} baseline-sensitive</Chip>
                    {summary.notable > 0 && <Chip color="#3d7ea6">{summary.notable} unusual</Chip>}
                    <Chip color="#94a3b8">{summary.typical} typical</Chip>
                    <Chip color="#cbd5e1">{summary.insufficient} not enough data</Chip>
                    <Chip color="#e2e8f0">{summary.pending} future</Chip>
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
                        <span className="font-medium text-gray-700">Why not just average both sides.</span> That is what
                        the first version did, and it is not a test: prices trend, so a window that opens just after a
                        run-up reads as flat or negative even when demand moved. April 2025 rose ₹86 → ₹125 before the
                        25–30 Apr cluster, so its raw −2.0% is what a plateau after a run-up looks like — start the
                        baseline four days earlier and the same row reads +3.8%.
                    </p>
                    <p>
                        <span className="font-medium text-gray-700">The test.</span> The comparison is made on log
                        prices: a trend is fitted to the quoted days before the event, projected across the event, and
                        the mean forecast error is the “move vs the pre-window trend”. That residual is ranked against
                        every other window of the same length within ±45 days — or the whole series when fewer than 20
                        are nearby. <span className="font-medium text-gray-700">p</span> is the two-sided share of those
                        windows at least as extreme, so it never reaches zero; a move is called unusual at p ≤ 0.05.
                    </p>
                    <p>
                        <span className="font-medium text-gray-700">Labels.</span>{' '}
                        <em>Unusual, with hypothesis</em> — the move is unusual, it goes the assumed way, and its sign
                        survives starting the baseline up to four days earlier. <em>Against hypothesis</em> — unusual
                        and opposite. <em>Baseline-sensitive</em> — unusual, but the sign flips with the baseline
                        choice. <em>Typical</em> — not separable from ordinary window-to-window movement, whatever the
                        assumed direction. A side with fewer than four quoted days before, or three during, shows
                        “not enough data”.
                    </p>
                    <p>
                        <span className="font-medium text-gray-700">Caveat.</span> This is co-movement, not causation.
                        Events overlap — the pre-monsoon heat season covers the whole wedding season — pre-event buying
                        can move the peak outside the window, and only one season has dense quotes. With roughly
                        {summary.analysable} tests, one p near 0.05 is about what chance produces; the q column shows
                        the multiplicity-adjusted value, and nothing here survives it. Read an unusual row as a lead to
                        investigate, not a measured effect.
                    </p>
                </div>
            </details>
        </div>
    );
};

EventImpactSection.displayName = 'EventImpactSection';
