'use client'
import { memo } from 'react';
import { Filter, RotateCcw } from 'lucide-react';
import {
    activeFilterCount, categoryLabel, dateConfidenceLabel, scopeLabel,
    type DateConfidence, type EventCategory, type EventFilters, type GeoScope, type PriceImpact,
    type SourceDepth,
} from '@/app/utils/event_calendar';

interface Props {
    filters: EventFilters;
    years: number[];
    windowStart: string;
    windowEnd: string;
    resultCount: number;
    totalCount: number;
    onChange: (next: EventFilters) => void;
    onReset: () => void;
}

const selectClass = `w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-800
    hover:border-gray-400 focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-500/25`;

const labelClass = 'block text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-1';

const Field = ({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) => (
    <div>
        <label htmlFor={htmlFor} className={labelClass}>{label}</label>
        {children}
    </div>
);

export const EventFiltersBar = memo(({
    filters, years, windowStart, windowEnd, resultCount, totalCount, onChange, onReset,
}: Props) => {
    const active = activeFilterCount(filters);

    const setYear = (year: number | 'all') => onChange({ ...filters, year, from: null, to: null });

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
        <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                    <Filter size={14} className="text-gray-400" aria-hidden />
                    <span>Filter the calendar</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[11px] text-gray-500" role="status" aria-live="polite">
                        <strong className="text-gray-800">{resultCount}</strong> of {totalCount} events
                        {active > 0 && <span className="text-gray-400"> · {active} filter{active === 1 ? '' : 's'}</span>}
                    </span>
                    <button
                        type="button"
                        onClick={onReset}
                        disabled={active === 0}
                        className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2 py-1 text-[11px] font-medium text-gray-600
                            hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600
                            disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        <RotateCcw size={11} aria-hidden />
                        Reset
                    </button>
                </div>
            </div>

            <fieldset className="space-y-2">
                <legend className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">Year</legend>
                <div className="flex flex-wrap gap-1.5">
                    {(['all', ...years] as (number | 'all')[]).map((year) => {
                        const selected = filters.year === year && !filters.from && !filters.to;
                        return (
                            <button
                                key={String(year)}
                                type="button"
                                aria-pressed={selected}
                                onClick={() => setYear(year)}
                                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors
                                    focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600
                                    ${selected
                                        ? 'bg-green-600 text-white shadow-sm'
                                        : 'border border-gray-300 bg-white text-gray-600 hover:border-gray-400 hover:bg-gray-50'}`}
                            >
                                {year === 'all' ? 'All years' : year}
                            </button>
                        );
                    })}
                </div>
            </fieldset>

            <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                <Field label="From" htmlFor="event-from">
                    <input
                        id="event-from"
                        type="date"
                        value={filters.from ?? ''}
                        min={windowStart}
                        max={windowEnd}
                        onChange={(event) => setFrom(event.target.value)}
                        className={selectClass}
                    />
                </Field>
                <Field label="To" htmlFor="event-to">
                    <input
                        id="event-to"
                        type="date"
                        value={filters.to ?? ''}
                        min={windowStart}
                        max={windowEnd}
                        onChange={(event) => setTo(event.target.value)}
                        className={selectClass}
                    />
                </Field>
                <Field label="Category" htmlFor="event-category">
                    <select
                        id="event-category"
                        value={filters.category}
                        onChange={(event) => onChange({ ...filters, category: event.target.value as EventCategory | 'all' })}
                        className={selectClass}
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
                        className={selectClass}
                    >
                        <option value="all">Any direction</option>
                        <option value="positive">Uptick hypothesis</option>
                        <option value="negative">Downturn hypothesis</option>
                        <option value="mixed">Mixed / unclear</option>
                        <option value="unknown">Unknown</option>
                    </select>
                </Field>
                <Field label="Scope" htmlFor="event-scope">
                    <select
                        id="event-scope"
                        value={filters.scope}
                        onChange={(event) => onChange({ ...filters, scope: event.target.value as GeoScope | 'all' })}
                        className={selectClass}
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
                        className={selectClass}
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
                        className={selectClass}
                    >
                        <option value="all">Any verification</option>
                        <option value="multi">2+ sources</option>
                        <option value="single">Single source</option>
                    </select>
                </Field>
                <div className="flex items-end">
                    <p className="text-[10px] leading-tight text-gray-400">
                        A custom range overrides the year buttons.
                    </p>
                </div>
            </div>
        </div>
    );
});
EventFiltersBar.displayName = 'EventFiltersBar';
