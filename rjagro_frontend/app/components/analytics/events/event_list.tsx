'use client'
import { memo, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, CalendarX2, ChevronsUpDown, ChevronRight } from 'lucide-react';
import EmptyState from '../../ui/empty_state';
import Button from '../../ui/button';
import {
    categoryLabel, dateConfidenceLabel, eventDurationDays, formatEventRange,
    type ChickenEvent,
} from '@/app/utils/event_calendar';
import { ImpactIcon, impactColor, impactOrder, impactShortLabel } from './event_chips';

type SortKey = 'date' | 'name' | 'category' | 'impact' | 'dateConfidence' | 'sourceDepth';
type SortDir = 'asc' | 'desc';

interface Props {
    events: ChickenEvent[];
    onSelect: (event: ChickenEvent) => void;
    onReset: () => void;
}

const categoryRank = new Map(
    Object.keys(categoryLabel).map((category, index) => [category, index]),
);
const confidenceRank = new Map(
    (Object.keys(dateConfidenceLabel) as (keyof typeof dateConfidenceLabel)[])
        .map((confidence, index) => [confidence, index]),
);
const impactRank = new Map(impactOrder.map((impact, index) => [impact, index]));

const compare = (a: ChickenEvent, b: ChickenEvent, key: SortKey): number => {
    switch (key) {
        case 'name':
            return a.name.localeCompare(b.name);
        case 'category':
            return (categoryRank.get(a.category) ?? 0) - (categoryRank.get(b.category) ?? 0)
                || a.name.localeCompare(b.name);
        case 'impact':
            return (impactRank.get(a.impact) ?? 0) - (impactRank.get(b.impact) ?? 0)
                || a.startDate.localeCompare(b.startDate);
        case 'dateConfidence':
            return (confidenceRank.get(a.dateConfidence) ?? 0) - (confidenceRank.get(b.dateConfidence) ?? 0)
                || a.startDate.localeCompare(b.startDate);
        case 'sourceDepth':
            return b.sources.length - a.sources.length || a.startDate.localeCompare(b.startDate);
        case 'date':
        default:
            return a.startDate.localeCompare(b.startDate)
                || a.endDate.localeCompare(b.endDate)
                || a.name.localeCompare(b.name);
    }
};

const headerClass = `inline-flex items-center gap-1 whitespace-nowrap text-[11px] font-semibold uppercase
    tracking-wide text-gray-500 transition-colors hover:text-gray-800
    focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600`;

const SortIcon = ({ active, dir }: { active: boolean; dir: SortDir }) => {
    if (!active) return <ChevronsUpDown size={11} className="text-gray-300" aria-hidden />;
    return dir === 'asc'
        ? <ArrowUp size={11} className="text-gray-600" aria-hidden />
        : <ArrowDown size={11} className="text-gray-600" aria-hidden />;
};

export const EventList = memo(({ events, onSelect, onReset }: Props) => {
    const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: 'date', dir: 'asc' });

    const sorted = useMemo(() => {
        const rows = [...events].sort((a, b) => compare(a, b, sort.key));
        return sort.dir === 'asc' ? rows : rows.reverse();
    }, [events, sort]);

    const toggle = (key: SortKey) => setSort((current) => (
        current.key === key
            ? { key, dir: current.dir === 'asc' ? 'desc' : 'asc' }
            : { key, dir: 'asc' }
    ));

    if (events.length === 0) {
        return (
            <EmptyState
                icon={CalendarX2}
                title="No events match these filters"
                message="Try a different year, clear the custom date range, or reset the filters to see the full calendar."
                action={<Button variant="secondary" size="sm" onClick={onReset}>Reset filters</Button>}
            />
        );
    }

    const ariaSort = (key: SortKey) => (sort.key === key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none');

    return (
        <div>
            <div className="max-h-[34rem] overflow-auto">
                <table className="w-full min-w-[30rem] border-collapse text-sm">
                    <caption className="sr-only">
                        Sourced events that plausibly move wholesale chicken prices, sortable by column.
                    </caption>
                    <thead className="sticky top-0 z-10 border-b border-gray-200 bg-white">
                        <tr className="text-left">
                            <th scope="col" className="py-2 pr-3" aria-sort={ariaSort('date')}>
                                <button type="button" onClick={() => toggle('date')} className={headerClass}>
                                    Date
                                    <SortIcon active={sort.key === 'date'} dir={sort.dir} />
                                </button>
                            </th>
                            <th scope="col" className="px-3 py-2" aria-sort={ariaSort('name')}>
                                <button type="button" onClick={() => toggle('name')} className={headerClass}>
                                    Event
                                    <SortIcon active={sort.key === 'name'} dir={sort.dir} />
                                </button>
                            </th>
                            <th scope="col" className="hidden px-3 py-2 md:table-cell" aria-sort={ariaSort('category')}>
                                <button type="button" onClick={() => toggle('category')} className={headerClass}>
                                    Category
                                    <SortIcon active={sort.key === 'category'} dir={sort.dir} />
                                </button>
                            </th>
                            <th scope="col" className="px-3 py-2" aria-sort={ariaSort('impact')}>
                                <button type="button" onClick={() => toggle('impact')} className={headerClass}>
                                    Impact
                                    <SortIcon active={sort.key === 'impact'} dir={sort.dir} />
                                </button>
                            </th>
                            <th scope="col" className="hidden px-3 py-2 lg:table-cell" aria-sort={ariaSort('dateConfidence')}>
                                <button type="button" onClick={() => toggle('dateConfidence')} className={headerClass}>
                                    Date confidence
                                    <SortIcon active={sort.key === 'dateConfidence'} dir={sort.dir} />
                                </button>
                            </th>
                            <th scope="col" className="hidden px-3 py-2 sm:table-cell" aria-sort={ariaSort('sourceDepth')}>
                                <button type="button" onClick={() => toggle('sourceDepth')} className={headerClass}>
                                    Sources
                                    <SortIcon active={sort.key === 'sourceDepth'} dir={sort.dir} />
                                </button>
                            </th>
                            <th scope="col" className="w-8 py-2" aria-label="Open details" />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {sorted.map((event) => (
                            <tr
                                key={event.id}
                                onClick={() => onSelect(event)}
                                className="cursor-pointer align-top transition-colors hover:bg-gray-50/80"
                            >
                                <td className="py-2.5 pr-3 text-xs whitespace-nowrap text-gray-500">
                                    {formatEventRange(event.startDate, event.endDate)}
                                    {eventDurationDays(event) > 1 && (
                                        <span className="ml-1 text-[10px] text-gray-400">
                                            {eventDurationDays(event)}d
                                        </span>
                                    )}
                                </td>
                                <td className="max-w-[16rem] px-3 py-2.5">
                                    <button
                                        type="button"
                                        onClick={(clickEvent) => {
                                            clickEvent.stopPropagation();
                                            onSelect(event);
                                        }}
                                        aria-haspopup="dialog"
                                        className="text-left text-xs font-medium text-gray-800
                                            hover:text-green-700 focus-visible:outline-2 focus-visible:outline-offset-2
                                            focus-visible:outline-green-600"
                                    >
                                        {event.name}
                                    </button>
                                    <span className="mt-0.5 block text-[10px] text-gray-400 md:hidden">
                                        {categoryLabel[event.category]}
                                    </span>
                                </td>
                                <td className="hidden px-3 py-2.5 text-xs whitespace-nowrap text-gray-500 md:table-cell">
                                    {categoryLabel[event.category]}
                                </td>
                                <td className="px-3 py-2.5">
                                    <span
                                        className="inline-flex items-center gap-1 text-[11px] font-medium whitespace-nowrap"
                                        style={{ color: impactColor[event.impact] }}
                                    >
                                        <ImpactIcon impact={event.impact} size={12} />
                                        {impactShortLabel[event.impact]}
                                    </span>
                                </td>
                                <td className="hidden px-3 py-2.5 text-xs whitespace-nowrap text-gray-500 lg:table-cell">
                                    {dateConfidenceLabel[event.dateConfidence]}
                                </td>
                                <td className="hidden px-3 py-2.5 text-xs whitespace-nowrap text-gray-500 sm:table-cell">
                                    {event.sources.length} source{event.sources.length === 1 ? '' : 's'}
                                </td>
                                <td className="py-2.5 text-right" aria-hidden>
                                    <ChevronRight size={13} className="ml-auto text-gray-300" />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <p className="mt-3 border-t border-gray-100 pt-3 text-[11px] text-gray-400">
                {sorted.length} event{sorted.length === 1 ? '' : 's'}, sorted by{' '}
                {sort.key === 'dateConfidence' ? 'date confidence' : sort.key === 'sourceDepth' ? 'source count' : sort.key}
                {' '}({sort.dir === 'asc' ? 'ascending' : 'descending'}). Select a row for the full record and its sources.
            </p>
        </div>
    );
});
EventList.displayName = 'EventList';
