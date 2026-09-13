'use client'
import { memo } from 'react';

export interface RangeOption {
    key: string;
    label: string;
}

interface RangeFilterProps {
    options: RangeOption[];
    mode: string;
    onModeChange: (mode: string) => void;
    customFrom: string;
    onCustomFromChange: (value: string) => void;
    customTo: string;
    onCustomToChange: (value: string) => void;
    /** Input used for custom bounds: 'date' (YYYY-MM-DD) or 'month' (YYYY-MM). */
    inputType?: 'date' | 'month';
}

export const RangeFilter = memo(({
    options,
    mode,
    onModeChange,
    customFrom,
    onCustomFromChange,
    customTo,
    onCustomToChange,
    inputType = 'date',
}: RangeFilterProps) => (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
        <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
            {options.map(option => (
                <button
                    key={option.key}
                    onClick={() => onModeChange(option.key)}
                    className={`px-2.5 py-1 font-medium transition-colors ${
                        mode === option.key
                            ? 'bg-gray-800 text-white'
                            : 'bg-white text-gray-500 hover:bg-gray-50'
                    }`}
                >
                    {option.label}
                </button>
            ))}
        </div>

        {mode === 'custom' && (
            <div className="flex items-center gap-1.5 text-xs">
                <input
                    type={inputType}
                    value={customFrom}
                    onChange={e => onCustomFromChange(e.target.value)}
                    className="border border-gray-200 rounded-md px-2 py-1 text-gray-600 focus:outline-none focus:ring-1 focus:ring-gray-300"
                />
                <span className="text-gray-400">to</span>
                <input
                    type={inputType}
                    value={customTo}
                    onChange={e => onCustomToChange(e.target.value)}
                    className="border border-gray-200 rounded-md px-2 py-1 text-gray-600 focus:outline-none focus:ring-1 focus:ring-gray-300"
                />
            </div>
        )}
    </div>
));
RangeFilter.displayName = 'RangeFilter';

export interface SeriesPoint {
    key: string;
    label: string;
    [metric: string]: number | string;
}

/**
 * Slices a period series according to a named range.
 *  - mode 'all'    → everything
 *  - mode 'custom' → keys between customFrom/customTo (inclusive, lexicographic)
 *  - any other mode (e.g. '60d', '12m') → the last `modeCount` points, when
 *    `modeCount` is provided.
 */
export const sliceSeries = (
    rows: SeriesPoint[],
    mode: string,
    customFrom: string,
    customTo: string,
    modeCount?: number,
): SeriesPoint[] => {
    if (mode === 'custom') {
        return rows.filter(
            row =>
                (!customFrom || row.key >= customFrom) &&
                (!customTo || row.key <= customTo),
        );
    }
    if (modeCount !== undefined && modeCount > 0) {
        return rows.slice(-modeCount);
    }
    return rows;
};
