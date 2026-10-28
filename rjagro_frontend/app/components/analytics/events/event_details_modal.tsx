'use client'
import { memo } from 'react';
import { CalendarRange, ExternalLink, Info, MapPin } from 'lucide-react';
import Modal from '../../ui/modal';
import {
    categoryLabel, dateConfidenceLabel, eventDurationDays, formatEventDate, formatEventRange, impactLabel, scopeLabel,
    type ChickenEvent,
} from '@/app/utils/event_calendar';
import { ConfidenceChip, DateConfidenceChip, ImpactChip, impactColor } from './event_chips';

interface Props {
    event: ChickenEvent | null;
    onClose: () => void;
}

export const EventDetailsModal = memo(({ event, onClose }: Props) => (
    <Modal
        open={event !== null}
        onClose={onClose}
        size="lg"
        title={event?.name}
        description={event ? `${formatEventRange(event.startDate, event.endDate)} · ${categoryLabel[event.category]}` : undefined}
    >
        {event && (
            <div className="space-y-5">
                <div className="flex flex-wrap items-center gap-1.5">
                    <ImpactChip impact={event.impact} />
                    <DateConfidenceChip confidence={event.dateConfidence} />
                    <ConfidenceChip confidence={event.impactConfidence} />
                    <span className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-1.5 py-0.5 text-[11px] font-medium text-gray-600">
                        {scopeLabel[event.scope]}
                    </span>
                </div>

                <section aria-labelledby="event-facts-heading" className="space-y-2">
                    <h3 id="event-facts-heading" className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                        Documented
                    </h3>
                    <p className="text-sm leading-relaxed text-gray-700">{event.description}</p>

                    <dl className="grid grid-cols-1 gap-x-4 gap-y-2 text-xs sm:grid-cols-2">
                        <div className="flex items-start gap-1.5">
                            <CalendarRange size={14} className="mt-0.5 shrink-0 text-gray-400" aria-hidden />
                            <div>
                                <dt className="text-gray-500">Dates</dt>
                                <dd className="font-medium text-gray-800">
                                    {formatEventRange(event.startDate, event.endDate)}
                                    <span className="ml-1 font-normal text-gray-400">
                                        ({eventDurationDays(event)} day{eventDurationDays(event) === 1 ? '' : 's'})
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
                                        {' '}— the date is computed or awaiting an official announcement rather than observed.
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
                    <h3 id="event-hypothesis-heading" className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-600">
                        <Info size={13} aria-hidden />
                        Price effect — research hypothesis, not a measured effect
                    </h3>
                    <p className="text-sm font-medium" style={{ color: impactColor[event.impact] }}>
                        {impactLabel[event.impact]}
                    </p>
                    <p className="text-sm leading-relaxed text-gray-700">{event.impactMechanism}</p>
                    <p className="text-[11px] text-gray-500">
                        Mechanism confidence is {event.impactConfidence}. This record describes a plausible direction and channel;
                        it does not claim the price moved, or by how much. Check the price series before drawing conclusions.
                    </p>
                </section>

                <section aria-labelledby="event-sources-heading" className="space-y-2">
                    <h3 id="event-sources-heading" className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                        Sources ({event.sources.length})
                    </h3>
                    <ul className="space-y-2">
                        {event.sources.map((source) => (
                            <li key={source.url} className="rounded-lg border border-gray-100 bg-white p-2.5">
                                <a
                                    href={source.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-start gap-1 text-xs font-semibold text-green-700 underline decoration-green-700/30 underline-offset-2
                                        hover:text-green-800 hover:decoration-green-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
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
                        Last verified {formatEventDate(event.lastVerifiedAt)}.
                    </p>
                </section>
            </div>
        )}
    </Modal>
));
EventDetailsModal.displayName = 'EventDetailsModal';
