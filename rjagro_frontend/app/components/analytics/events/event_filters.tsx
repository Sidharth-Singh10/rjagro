'use client'
import { memo } from 'react';
import { RotateCcw, X } from 'lucide-react';
import {
    activeFilterCount, categoryLabel, dateConfidenceLabel, formatEventRange, impactLabel, scopeLabel,
    type DateConfidence, type EventCategory, type EventFilters, type GeoScope, type PriceImpact,
    type SourceDepth,
} from '@/app/utils/event_calendar';
import { impactShortLabel } from './event_chips';

interface PanelProps {
    id: string;
    filters: EventFilters;
    windowStart: string;
    windowEnd: string;
    onChange: (next: EventFilters) => void;
    onReset: () => void;
}

const controlClass = `w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-800
    hover:border-gray-400 focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-500/25`;

const labelClass = 'mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gray-500';

const Field = ({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) => (
    <div>
        <label htmlFor={htmlFor} className={labelClass}>{label}</label>
        {children}
    </div>
);

/** Filters live behind a button; every control from the old always-open form is kept. */
export const EventFiltersPanel = memo(({
    id, filters, windowStart, windowEnd, onChange, onReset,
}: PanelProps) => {
    const setFrom = (from: string) => {
        const next = from || null;
        const to = filters.to && next && filters.to < next ? next : filters.to;
        onChange({ ...filters, year: 'all', from: next, to });
    };

    const setTo = (to: string) => {
        const next = to || null;
        const from = filters.from && next && next < filters.from ? next : filters.from;
        onChange({ ...filters, year: 'all', from, to: next });
    };

    return (
        <div id={id} className="rounded-xl border border-gray-100 bg-gray-50/60 p-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <fieldset className="sm:col-span-2 lg:col-span-1">
                    <legend className={labelClass}>Custom date range</legend>
                    <div className="flex items-center gap-1.5">
                        <input
                            id="event-from"
                            type="date"
                            aria-label="Events from"
                            value={filters.from ?? ''}
                            min={windowStart}
                            max={windowEnd}
                            onChange={(event) => setFrom(event.target.value)}
                            className={controlClass}
                        />
                        <span className="text-[11px] text-gray-400" aria-hidden>to</span>
                        <input
                            id="event-to"
                            type="date"
                            aria-label="Events to"
                            value={filters.to ?? ''}
                            min={windowStart}
                            max={windowEnd}
                            onChange={(event) => setTo(event.target.value)}
                            className={controlClass}
                        />
                    </div>
                    <p className="mt-1 text-[10px] leading-tight text-gray-400">
                        A custom range overrides the year buttons.
                    </p>
                </fieldset>

                <Field label="Category" htmlFor="event-category">
                    <select
                        id="event-category"
                        value={filters.category}
                        onChange={(event) => onChange({ ...filters, category: event.target.value as EventCategory | 'all' })}
                        className={controlClass}
                    >
                        <option value="all">All categories</option>
                        {(Object.keys(categoryLabel) as EventCategory[]).map((category) => (
                            <option key={category} value={category}>{categoryLabel[category]}</option>
                        ))}
                    </select>
                </Field>

                <Field label="Impact" htmlFor="event-impact">
                    <select
                        id="event-impact"
                        value={filters.impact}
                        onChange={(event) => onChange({ ...filters, impact: event.target.value as PriceImpact | 'all' })}
                        className={controlClass}
                    >
                        <option value="all">Any direction</option>
                        {(Object.keys(impactLabel) as PriceImpact[]).map((impact) => (
                            <option key={impact} value={impact}>{impactLabel[impact]}</option>
                        ))}
                    </select>
                </Field>

                <Field label="Scope" htmlFor="event-scope">
                    <select
                        id="event-scope"
                        value={filters.scope}
                        onChange={(event) => onChange({ ...filters, scope: event.target.value as GeoScope | 'all' })}
                        className={controlClass}
                    >
                        <option value="all">Any scope</option>
                        {(Object.keys(scopeLabel) as GeoScope[]).map((scope) => (
                            <option key={scope} value={scope}>{scopeLabel[scope]}</option>
                        ))}
                    </select>
                </Field>

                <Field label="Date confidence" htmlFor="event-confidence">
                    <select
                        id="event-confidence"
                        value={filters.dateConfidence}
                        onChange={(event) => onChange({
                            ...filters,
                            dateConfidence: event.target.value as DateConfidence | 'all',
                        })}
                        className={controlClass}
                    >
                        <option value="all">Any confidence</option>
                        {(Object.keys(dateConfidenceLabel) as DateConfidence[]).map((confidence) => (
                            <option key={confidence} value={confidence}>{dateConfidenceLabel[confidence]}</option>
                        ))}
                    </select>
                </Field>

                <Field label="Verification" htmlFor="event-sources">
                    <select
                        id="event-sources"
                        value={filters.sourceDepth}
                        onChange={(event) => onChange({ ...filters, sourceDepth: event.target.value as SourceDepth | 'all' })}
                        className={controlClass}
                    >
                        <option value="all">Any verification</option>
                        <option value="multi">2+ sources</option>
                        <option value="single">Single source</option>
                    </select>
                </Field>
            </div>

            <div className="mt-3 flex items-center justify-between gap-2 border-t border-gray-200/70 pt-2.5">
                <p className="text-[11px] text-gray-400">
                    Filters compose: an event must match every one that is set.
                </p>
                <button
                    type="button"
                    onClick={onReset}
                    disabled={activeFilterCount(filters) === 0}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-gray-600
                        hover:bg-white hover:text-gray-900
                        focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600
                        disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                >
                    <RotateCcw size={11} aria-hidden />
                    Reset all filters
                </button>
            </div>
        </div>
    );
});
EventFiltersPanel.displayName = 'EventFiltersPanel';

interface Chip {
    id: string;
    prefix: string;
    label: string;
    /** Removes just this filter and leaves the rest untouched. */
    clear: (filters: EventFilters) => EventFilters;
}

const buildChips = (filters: EventFilters, windowStart: string, windowEnd: string): Chip[] => {
    const chips: Chip[] = [];

    if (filters.from || filters.to) {
        chips.push({
            id: 'range',
            prefix: 'Dates',
            label: formatEventRange(filters.from ?? windowStart, filters.to ?? windowEnd),
            clear: (current) => ({ ...current, from: null, to: null }),
        });
    }
    if (filters.category !== 'all') {
        chips.push({
            id: 'category',
            prefix: 'Category',
            label: categoryLabel[filters.category],
            clear: (current) => ({ ...current, category: 'all' }),
        });
    }
    if (filters.impact !== 'all') {
        chips.push({
            id: 'impact',
            prefix: 'Impact',
            label: impactShortLabel[filters.impact],
            clear: (current) => ({ ...current, impact: 'all' }),
        });
    }
    if (filters.scope !== 'all') {
        chips.push({
            id: 'scope',
            prefix: 'Scope',
            label: scopeLabel[filters.scope],
            clear: (current) => ({ ...current, scope: 'all' }),
        });
    }
    if (filters.dateConfidence !== 'all') {
        chips.push({
            id: 'dateConfidence',
            prefix: 'Date',
            label: dateConfidenceLabel[filters.dateConfidence],
            clear: (current) => ({ ...current, dateConfidence: 'all' }),
        });
    }
    if (filters.sourceDepth !== 'all') {
        chips.push({
            id: 'sourceDepth',
            prefix: 'Sources',
            label: filters.sourceDepth === 'multi' ? '2+ sources' : 'Single source',
            clear: (current) => ({ ...current, sourceDepth: 'all' }),
        });
    }

    return chips;
};

/** Removable chips for everything the collapsed panel is holding on to. */
export const ActiveFilterChips = memo(({
    filters, windowStart, windowEnd, onChange,
}: {
    filters: EventFilters;
    windowStart: string;
    windowEnd: string;
    onChange: (next: EventFilters) => void;
}) => {
    const chips = buildChips(filters, windowStart, windowEnd);
    if (chips.length === 0) return null;

    return (
        <ul className="flex flex-wrap items-center gap-1.5" aria-label="Active filters">
            {chips.map((chip) => (
                <li key={chip.id}>
                    <button
                        type="button"
                        onClick={() => onChange(chip.clear(filters))}
                        aria-label={`Remove filter — ${chip.prefix}: ${chip.label}`}
                        className="group inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white
                            py-0.5 pl-2 pr-1 text-[11px] font-medium text-gray-700 transition-colors
                            hover:border-gray-300 hover:bg-gray-50
                            focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
                    >
                        <span className="text-gray-400">{chip.prefix}</span>
                        {chip.label}
                        <span className="rounded-full p-0.5 text-gray-400 group-hover:bg-gray-200 group-hover:text-gray-700">
                            <X size={10} aria-hidden />
                        </span>
                    </button>
                </li>
            ))}
        </ul>
    );
});
ActiveFilterChips.displayName = 'ActiveFilterChips';
