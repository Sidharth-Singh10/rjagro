'use client'
import { memo, useMemo } from 'react';
import { GraphRenderer } from '@graphysdk/react';
import type { Data, GraphSlots, TooltipSlotProps } from '@graphysdk/react';
import { ChartCard } from '../v2/overview/chart_card';
import { chart } from '../v2/overview/chart_colors';
import {
    formatRate, windowLabel, windowShortLabel, type BestWindow,
} from '@/app/utils/rate_tracker';
import { graphyKit } from './graphy/price_bar_geom';
import surface from './graphy/graphy_surface.module.css';

interface Props {
    windows: BestWindow[];
    days: number;
    color: string;
}

/**
 * The hovered window, read off the tooltip's row key (`<layerId>:<pointIndex>`).
 * Graphy hands a slot only formatted strings, so the index is what ties a row
 * back to the ranked window it came from.
 */
const observationAt = <T,>(rows: TooltipSlotProps['content']['rows'], series: T[]): T | null => {
    const row = rows.find(candidate => candidate.primary) ?? rows[0];
    if (!row) return null;
    const index = Number(row.key.slice(row.key.lastIndexOf(':') + 1));
    return series[index] ?? null;
};

const BestTooltip = ({ content, windows }: TooltipSlotProps & { windows: BestWindow[] }) => {
    const window = observationAt(content.rows, windows);
    if (window === null) return null;
    return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-100 text-xs space-y-1">
            <p className="font-semibold text-gray-700">{windowLabel(window)}</p>
            <p style={{ color: chart.brand }}>Average {formatRate(window.avg)}/kg</p>
            <p className="text-gray-500">
                Range {formatRate(window.min, 0)} – {formatRate(window.max, 0)}
            </p>
            <p className="text-gray-400">
                {window.observed} of {window.days} days quoted ({Math.round(window.coverage * 100)}%)
            </p>
        </div>
    );
};

export const BestRangeChart = memo(({ windows, days, color }: Props) => {
    const data = useMemo<Data>(() => ({
        columns: [
            { key: 'name', valueFormat: { type: 'text' } },
            { key: 'avg', label: 'Average', valueFormat: { type: 'currency', iso: 'inr' } },
        ],
        rows: windows.map((window, index) => ({
            name: `${index + 1}. ${windowShortLabel(window)}`,
            avg: window.avg,
        })),
    }), [windows]);

    // Bars rise from the lowest ranked average, not from ₹0: the ranking is a
    // comparison between five close values, so a zero baseline would flatten it.
    const [domainMin, domainMax] = useMemo<[number, number]>(() => {
        if (windows.length === 0) return [0, 100];
        const lowest = Math.min(...windows.map(window => window.avg));
        const highest = Math.max(...windows.map(window => window.avg));
        return [Math.max(0, Math.floor(lowest / 5) * 5 - 5), Math.ceil(highest / 5) * 5 + 5];
    }, [windows]);

    const firstName = windows[0] !== undefined ? `1. ${windowShortLabel(windows[0])}` : null;

    const spec = useMemo(() => graphyKit.pipe(
        graphyKit.createSpec({ x: 'name', y: 'avg' }),
        graphyKit.geom.priceBar({ id: 'ranges', params: { base: domainMin, radius: 4 } }),
        graphyKit.coord.flip(),
        graphyKit.scale.x.discrete(),
        graphyKit.scale.y.continuous({ domainMin, domainMax }),
        graphyKit.config({
            legend: { position: 'none' },
            tooltip: { mode: 'observation' },
            numberFormat: { decimals: 0 },
            axes: {
                x: { label: '', position: 'left', grid: { visible: false } },
                y: { label: '', position: 'bottom', grid: { visible: true } },
            },
        }),
        graphyKit.styles({
            defaults: [
                graphyKit.style.graph({
                    fill: 'transparent',
                    strokeWidth: 0,
                    padding: { top: 8, right: 12, bottom: 8, left: 4 },
                }),
                graphyKit.style.panelBorder({ strokeWidth: 0 }),
                graphyKit.style.tickLabel({ textColor: chart.tick, fontSize: 11 }),
                graphyKit.style.geom({ fill: color, alpha: 0.55 }, { layer: 'ranges' }),
            ],
            // The winning window keeps full weight; the runners-up are context.
            overrides: firstName === null ? [] : [
                graphyKit.style.geom({ alpha: 1 }, {
                    layer: 'ranges',
                    where: { variable: 'name', eq: firstName },
                }),
            ],
        }),
    ), [color, domainMin, domainMax, firstName]);

    const slots = useMemo<GraphSlots>(() => ({
        Tooltip: (props: TooltipSlotProps) => <BestTooltip {...props} windows={windows} />,
    }), [windows]);

    return (
        <ChartCard title={`Best ${days}-day selling windows (₹/kg)`}>
            {windows.length === 0 ? (
                <div className="h-[280px] flex items-center justify-center text-sm text-gray-400">
                    Not enough quoted days for a {days}-day window
                </div>
            ) : (
                <>
                    <div className={surface.clipped} style={{ height: 280 }}>
                        <graphyKit.GraphProvider data={data} spec={spec} formattingLocale="en-GB">
                            <GraphRenderer animation={false} slots={slots} />
                        </graphyKit.GraphProvider>
                    </div>
                    <p className="mt-2 text-[11px] text-gray-400">
                        Best non-overlapping {days}-day stretches, ranked by average of the days quoted.
                    </p>
                </>
            )}
        </ChartCard>
    );
});
BestRangeChart.displayName = 'BestRangeChart';
