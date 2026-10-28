'use client'
import { memo } from 'react';
import {
    ChartGantt, ChevronLeft, ChevronRight, LayoutList, Maximize2, Rows3, Rows4, ZoomIn, ZoomOut,
} from 'lucide-react';
import type { EventDensity } from './event_timeline';

export type EventView = 'timeline' | 'list';

/** Discrete zoom ladder. 1 is fit-to-width, and nothing can go below it. */
export const ZOOM_STEPS = [1, 1.5, 2, 3, 4, 6];

interface Props {
    years: number[];
    year: number | 'all';
    onYearChange: (year: number | 'all') => void;
    /** Human-readable description of the window currently drawn. */
    rangeLabel: string;
    rangeIsCustom: boolean;
    view: EventView;
    onViewChange: (view: EventView) => void;
    density: EventDensity;
    onDensityChange: (density: EventDensity) => void;
    zoomIndex: number;
    onZoomIndexChange: (index: number) => void;
}

const segmentButton = (selected: boolean) => `inline-flex items-center justify-center gap-1.5 rounded-md px-2.5 py-1
    text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600
    ${selected ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`;

const iconButton = `inline-flex items-center justify-center rounded-md text-gray-500 transition-colors
    hover:bg-gray-100 hover:text-gray-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600
    disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent`;

const squareIcon = `${iconButton} h-7 w-7`;

const stepIndex = (year: number | 'all', years: number[], direction: 1 | -1): number | 'all' => {
    if (years.length === 0) return 'all';
    if (year === 'all') return direction === 1 ? years[0] : years[years.length - 1];
    const index = years.indexOf(year);
    if (index === -1) return years[0];
    const next = index + direction;
    if (next < 0) return 'all';
    if (next >= years.length) return 'all';
    return years[next];
};

export const EventToolbar = memo(({
    years, year, onYearChange, rangeLabel, rangeIsCustom, view, onViewChange,
    density, onDensityChange, zoomIndex, onZoomIndexChange,
}: Props) => {
    const zoom = ZOOM_STEPS[zoomIndex] ?? 1;

    return (
        <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                <div
                    role="group"
                    aria-label="Year"
                    className="flex items-center gap-0.5 rounded-lg bg-gray-100 p-0.5"
                >
                    {years.map((option) => (
                        <button
                            key={option}
                            type="button"
                            aria-pressed={year === option}
                            onClick={() => onYearChange(option)}
                            className={segmentButton(year === option)}
                        >
                            {option}
                        </button>
                    ))}
                    <button
                        type="button"
                        aria-pressed={year === 'all'}
                        onClick={() => onYearChange('all')}
                        className={segmentButton(year === 'all')}
                    >
                        All
                    </button>
                </div>

                <div className="flex items-center rounded-lg border border-gray-200 bg-white">
                    <button
                        type="button"
                        onClick={() => onYearChange(stepIndex(year, years, -1))}
                        className={`${squareIcon} rounded-r-none`}
                        aria-label="Previous year"
                        title="Previous year"
                    >
                        <ChevronLeft size={14} aria-hidden />
                    </button>
                    <span className="h-4 w-px bg-gray-200" aria-hidden />
                    <button
                        type="button"
                        onClick={() => onYearChange(stepIndex(year, years, 1))}
                        className={`${squareIcon} rounded-l-none`}
                        aria-label="Next year"
                        title="Next year"
                    >
                        <ChevronRight size={14} aria-hidden />
                    </button>
                </div>

                <span className="text-[11px] text-gray-500">
                    {rangeLabel}
                    {rangeIsCustom && <span className="text-gray-400"> · custom range</span>}
                </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                <div role="group" aria-label="View" className="flex items-center gap-0.5 rounded-lg bg-gray-100 p-0.5">
                    <button
                        type="button"
                        aria-pressed={view === 'timeline'}
                        onClick={() => onViewChange('timeline')}
                        className={segmentButton(view === 'timeline')}
                    >
                        <ChartGantt size={13} aria-hidden />
                        Timeline
                    </button>
                    <button
                        type="button"
                        aria-pressed={view === 'list'}
                        onClick={() => onViewChange('list')}
                        className={segmentButton(view === 'list')}
                    >
                        <LayoutList size={13} aria-hidden />
                        Event list
                    </button>
                </div>

                {view === 'timeline' && (
                    <>
                        <div
                            role="group"
                            aria-label="Row density"
                            className="flex items-center gap-0.5 rounded-lg bg-gray-100 p-0.5"
                        >
                            <button
                                type="button"
                                aria-pressed={density === 'comfortable'}
                                onClick={() => onDensityChange('comfortable')}
                                className={segmentButton(density === 'comfortable')}
                                aria-label="Comfortable row density"
                                title="Comfortable rows"
                            >
                                <Rows3 size={13} aria-hidden />
                            </button>
                            <button
                                type="button"
                                aria-pressed={density === 'compact'}
                                onClick={() => onDensityChange('compact')}
                                className={segmentButton(density === 'compact')}
                                aria-label="Compact row density"
                                title="Compact rows"
                            >
                                <Rows4 size={13} aria-hidden />
                            </button>
                        </div>

                        <div className="flex items-center rounded-lg border border-gray-200 bg-white">
                            <button
                                type="button"
                                onClick={() => onZoomIndexChange(zoomIndex - 1)}
                                disabled={zoomIndex <= 0}
                                className={`${squareIcon} rounded-r-none`}
                                aria-label="Zoom out timeline"
                                title="Zoom out"
                            >
                                <ZoomOut size={14} aria-hidden />
                            </button>
                            <span className="w-9 text-center text-[11px] tabular-nums text-gray-500" aria-hidden>
                                {Math.round(zoom * 100)}%
                            </span>
                            <button
                                type="button"
                                onClick={() => onZoomIndexChange(zoomIndex + 1)}
                                disabled={zoomIndex >= ZOOM_STEPS.length - 1}
                                className={`${squareIcon} rounded-l-none`}
                                aria-label="Zoom in timeline"
                                title="Zoom in"
                            >
                                <ZoomIn size={14} aria-hidden />
                            </button>
                            <span className="mx-1 h-4 w-px bg-gray-200" aria-hidden />
                            <button
                                type="button"
                                onClick={() => onZoomIndexChange(0)}
                                disabled={zoomIndex === 0}
                                className={`${iconButton} h-7 gap-1 pr-2 pl-1.5 text-[11px] font-medium`}
                                aria-label="Fit timeline to width"
                                title="Fit to width"
                            >
                                <Maximize2 size={12} aria-hidden />
                                Fit
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
});
EventToolbar.displayName = 'EventToolbar';

export { stepIndex };
