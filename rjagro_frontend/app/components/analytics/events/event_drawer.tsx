'use client'
import { memo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { CalendarRange, ExternalLink, Info, MapPin, X } from 'lucide-react';
import {
    categoryLabel, dateConfidenceLabel, eventDurationDays, formatEventDate, formatEventRange, impactLabel, scopeLabel,
    type ChickenEvent,
} from '@/app/utils/event_calendar';
import { ConfidenceChip, DateConfidenceChip, ImpactChip, impactColor } from './event_chips';

interface Props {
    event: ChickenEvent | null;
    onClose: () => void;
}

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Detail view as a right-hand drawer on desktop, so the year track the event
 * came from stays on screen, and a bottom sheet on small screens where there is
 * no room beside the timeline.
 */
export const EventDetailsDrawer = memo(({ event, onClose }: Props) => {
    const panelRef = useRef<HTMLDivElement | null>(null);
    const closeRef = useRef<HTMLButtonElement | null>(null);

    useEffect(() => {
        if (!event) return;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        const onKeyDown = (keyboardEvent: KeyboardEvent) => {
            if (keyboardEvent.key === 'Escape') {
                keyboardEvent.preventDefault();
                onClose();
                return;
            }
            if (keyboardEvent.key !== 'Tab') return;

            const panel = panelRef.current;
            if (!panel) return;
            const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE))
                .filter((node) => node.offsetParent !== null);
            if (focusable.length === 0) return;

            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (keyboardEvent.shiftKey && document.activeElement === first) {
                keyboardEvent.preventDefault();
                last.focus();
            } else if (!keyboardEvent.shiftKey && document.activeElement === last) {
                keyboardEvent.preventDefault();
                first.focus();
            }
        };

        document.addEventListener('keydown', onKeyDown);
        const frame = requestAnimationFrame(() => closeRef.current?.focus());

        return () => {
            document.removeEventListener('keydown', onKeyDown);
            cancelAnimationFrame(frame);
            document.body.style.overflow = previousOverflow;
        };
    }, [event, onClose]);

    if (!event || typeof document === 'undefined') return null;

    const days = eventDurationDays(event);

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-end justify-end">
            <button
                type="button"
                aria-label="Close event details"
                tabIndex={-1}
                onClick={onClose}
                className="absolute inset-0 cursor-default bg-gray-950/40 lg:bg-gray-950/10"
            />

            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="event-drawer-title"
                aria-describedby="event-drawer-subtitle"
                className="relative flex h-[88vh] w-full flex-col overflow-hidden rounded-t-2xl border border-gray-100
                    bg-white shadow-2xl animate-[slideUp_180ms_ease-out]
                    lg:h-full lg:max-w-[27rem] lg:rounded-none lg:border-y-0 lg:border-r-0"
            >
                <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-gray-200 lg:hidden" aria-hidden />

                <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3">
                    <div className="min-w-0">
                        <p id="event-drawer-subtitle" className="text-[11px] font-medium text-gray-500">
                            {categoryLabel[event.category]} · {formatEventRange(event.startDate, event.endDate)}
                        </p>
                        <h2 id="event-drawer-title" className="mt-0.5 text-base leading-snug font-semibold text-gray-900">
                            {event.name}
                        </h2>
                    </div>
                    <button
                        ref={closeRef}
                        type="button"
                        onClick={onClose}
                        aria-label="Close event details"
                        className="shrink-0 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100
                            hover:text-gray-600 focus-visible:outline-2 focus-visible:outline-offset-2
                            focus-visible:outline-green-600"
                    >
                        <X size={17} aria-hidden />
                    </button>
                </div>

                <div className="min-h-0 flex-1 space-y-5 overflow-y-auto border-t border-gray-100 px-5 py-4">
                    <div className="flex flex-wrap items-center gap-1.5">
                        <ImpactChip impact={event.impact} />
                        <DateConfidenceChip confidence={event.dateConfidence} />
                        <ConfidenceChip confidence={event.impactConfidence} />
                        <span className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-1.5 py-0.5 text-[11px] font-medium text-gray-600">
                            {scopeLabel[event.scope]}
                        </span>
                    </div>

                    <section aria-labelledby="event-facts-heading" className="space-y-2">
                        <h3 id="event-facts-heading" className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                            Documented
                        </h3>
                        <p className="text-xs leading-relaxed text-gray-700">{event.description}</p>

                        <dl className="grid grid-cols-1 gap-x-4 gap-y-2 text-xs sm:grid-cols-2">
                            <div className="flex items-start gap-1.5">
                                <CalendarRange size={14} className="mt-0.5 shrink-0 text-gray-400" aria-hidden />
                                <div>
                                    <dt className="text-gray-500">Dates</dt>
                                    <dd className="font-medium text-gray-800">
                                        {formatEventRange(event.startDate, event.endDate)}
                                        <span className="ml-1 font-normal text-gray-400">
                                            ({days} day{days === 1 ? '' : 's'})
                                        </span>
                                    </dd>
                                </div>
                            </div>
                            <div className="flex items-start gap-1.5">
                                <MapPin size={14} className="mt-0.5 shrink-0 text-gray-400" aria-hidden />
                                <div>
                                    <dt className="text-gray-500">Where</dt>
                                    <dd className="font-medium text-gray-800">{event.locationScope}</dd>
                                </div>
                            </div>
                            <div className="sm:col-span-2">
                                <dt className="text-gray-500">Calendar basis</dt>
                                <dd className="text-gray-700">{event.calendarSystem}</dd>
                            </div>
                            <div className="sm:col-span-2">
                                <dt className="text-gray-500">Date confidence</dt>
                                <dd className="text-gray-700">
                                    {dateConfidenceLabel[event.dateConfidence]}
                                    {event.dateConfidence !== 'confirmed' && (
                                        <span className="text-gray-500">
                                            {' '}— computed or awaiting an official announcement rather than observed.
                                        </span>
                                    )}
                                </dd>
                            </div>
                        </dl>

                        <div className="rounded-lg bg-gray-50 p-3 text-xs leading-relaxed text-gray-600">
                            <p className="mb-1 font-semibold text-gray-700">Notes</p>
                            <p>{event.notes}</p>
                            {event.definitionNotes !== event.notes && (
                                <p className="mt-2 text-gray-500">{event.definitionNotes}</p>
                            )}
                        </div>
                    </section>

                    <section
                        aria-labelledby="event-hypothesis-heading"
                        className="space-y-2 rounded-lg border p-3"
                        style={{
                            borderColor: `color-mix(in srgb, ${impactColor[event.impact]} 26%, white)`,
                            backgroundColor: `color-mix(in srgb, ${impactColor[event.impact]} 5%, white)`,
                        }}
                    >
                        <h3 id="event-hypothesis-heading" className="flex items-start gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-600">
                            <Info size={13} className="mt-px shrink-0" aria-hidden />
                            Price effect — hypothesis, not a measured effect
                        </h3>
                        <p className="text-sm font-medium" style={{ color: impactColor[event.impact] }}>
                            {impactLabel[event.impact]}
                        </p>
                        <p className="text-xs leading-relaxed text-gray-700">{event.impactMechanism}</p>
                        <p className="text-[11px] leading-relaxed text-gray-500">
                            Mechanism confidence is {event.impactConfidence}. This record describes a plausible direction and
                            channel; it does not claim the price moved, or by how much. Check the price series before
                            drawing conclusions.
                        </p>
                    </section>

                    <section aria-labelledby="event-sources-heading" className="space-y-2">
                        <h3 id="event-sources-heading" className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                            Sources ({event.sources.length})
                        </h3>
                        <ul className="space-y-2">
                            {event.sources.map((source) => (
                                <li key={source.url} className="rounded-lg border border-gray-100 bg-white p-2.5">
                                    <a
                                        href={source.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-start gap-1 text-xs font-semibold text-green-700
                                            underline decoration-green-700/30 underline-offset-2 hover:text-green-800
                                            hover:decoration-green-700 focus-visible:outline-2 focus-visible:outline-offset-2
                                            focus-visible:outline-green-600"
                                        aria-label={`${source.title} — ${source.publisher} (opens in a new tab)`}
                                    >
                                        {source.title}
                                        <ExternalLink size={11} className="mt-0.5 shrink-0" aria-hidden />
                                    </a>
                                    <p className="mt-0.5 text-[11px] text-gray-500">
                                        {source.publisher} · retrieved {formatEventDate(source.retrieved_at)}
                                    </p>
                                    <p className="mt-1 text-[11px] leading-relaxed text-gray-600">{source.supports}</p>
                                </li>
                            ))}
                        </ul>
                        <p className="text-[11px] text-gray-400">
                            Event dates last verified {formatEventDate(event.lastVerifiedAt)}.
                        </p>
                    </section>
                </div>
            </div>
        </div>,
        document.body,
    );
});
EventDetailsDrawer.displayName = 'EventDetailsDrawer';
