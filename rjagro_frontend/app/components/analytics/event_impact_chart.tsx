'use client'
import { memo, useMemo } from 'react';
import { categoryColor, formatPct, type EventEstimate } from '@/app/utils/price_forecast';

const ROW = 26;
const TOP = 26;
const LEFT = 238;
const RIGHT = 62;
const WIDTH = 780;
const PAD_X = 18;
const TICKS = [-10, -8, -6, -4, -2, 0, 2, 4, 6, 8];

/**
 * Dot-and-whisker plot of the pooled event association.
 *
 * Only the 80% interval of the pooled estimate is drawn: the raw 95% intervals
 * span ±25% for one-day events and would flatten every pooled effect into the
 * axis. The raw numbers are in the table below, next to the pooled ones.
 */
export const EventImpactChart = memo(({ impacts }: { impacts: EventEstimate[] }) => {
    const rows = useMemo(
        () => [...impacts].sort((a, b) => b.pooledPct - a.pooledPct),
        [impacts],
    );

    const height = TOP + rows.length * ROW + 34;
    const plotWidth = WIDTH - LEFT - RIGHT;

    const domain = useMemo<[number, number]>(() => {
        const lows = rows.map((row) => row.pooledLo80);
        const highs = rows.map((row) => row.pooledHi80);
        return [
            Math.min(-4, Math.floor(Math.min(...lows) - 1)),
            Math.max(4, Math.ceil(Math.max(...highs) + 1)),
        ];
    }, [rows]);

    const x = (value: number) =>
        LEFT + PAD_X + ((value - domain[0]) / (domain[1] - domain[0])) * (plotWidth - PAD_X * 2);

    const zero = x(0);
    const ticks = TICKS.filter((value) => value >= domain[0] && value <= domain[1]);

    return (
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
                <h4 className="text-sm font-semibold text-gray-700">Estimated association, event by event</h4>
                <span className="text-[11px] text-gray-400">pooled estimate with its 80% interval</span>
            </div>

            <svg
                viewBox={`0 0 ${WIDTH} ${height}`}
                className="w-full"
                style={{ height: 'auto', maxHeight: 620 }}
                role="img"
                aria-label="Pooled event effect with 80% intervals"
            >
                {ticks.map((value) => (
                    <g key={value}>
                        <line
                            x1={x(value)}
                            x2={x(value)}
                            y1={TOP - 8}
                            y2={TOP + rows.length * ROW}
                            stroke={value === 0 ? '#cbd5e1' : '#f0f0f0'}
                            strokeWidth={1}
                        />
                        <text
                            x={x(value)}
                            y={TOP + rows.length * ROW + 16}
                            textAnchor="middle"
                            fontSize={9}
                            fill="#6b7280"
                        >
                            {value === 0 ? '0' : formatPct(value, 0)}
                        </text>
                    </g>
                ))}

                {rows.map((row, index) => {
                    const cy = TOP + index * ROW + ROW / 2;
                    const color = row.pooledPct > 0 ? '#16a34a' : row.pooledPct < 0 ? '#dc2626' : '#94a3b8';
                    const label = row.name.length > 42 ? `${row.name.slice(0, 40)}…` : row.name;

                    return (
                        <g key={row.id}>
                            <title>
                                {`${row.name}: ${formatPct(row.pooledPct)} (80% ${formatPct(row.pooledLo80)} to ${formatPct(row.pooledHi80)}), ${row.occurrences} occurrences, ${row.days} observed days, grade ${row.reliability}`}
                            </title>
                            <circle cx={LEFT - 12} cy={cy} r={3.2} fill={categoryColor[row.category]} />
                            <text x={LEFT - 20} y={cy + 3} textAnchor="end" fontSize={9.5} fill="#4b5563">
                                {label}
                            </text>
                            <line
                                x1={x(row.pooledLo80)}
                                x2={x(row.pooledHi80)}
                                y1={cy}
                                y2={cy}
                                stroke={color}
                                strokeWidth={2.4}
                                strokeLinecap="round"
                                opacity={0.42}
                            />
                            <line
                                x1={x(row.pooledLo80)}
                                x2={x(row.pooledHi80)}
                                y1={cy}
                                y2={cy}
                                stroke={color}
                                strokeWidth={0.8}
                                strokeLinecap="round"
                                opacity={0.55}
                            />
                            <circle cx={x(row.pooledPct)} cy={cy} r={4.4} fill={color} stroke="#fff" strokeWidth={1.2} />
                            <text
                                x={WIDTH - 6}
                                y={cy + 3}
                                textAnchor="end"
                                fontSize={9.5}
                                fill={color}
                                fontWeight={600}
                            >
                                {formatPct(row.pooledPct)}
                            </text>
                            <text x={WIDTH - 6} y={cy + 13} textAnchor="end" fontSize={8} fill="#9ca3af">
                                {`${row.reliability} · ${row.occurrences}×`}
                            </text>
                        </g>
                    );
                })}

                <line x1={zero} x2={zero} y1={TOP - 8} y2={TOP + rows.length * ROW} stroke="#94a3b8" strokeWidth={1} />
            </svg>

            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-gray-500">
                <span className="inline-flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" /> above baseline
                </span>
                <span className="inline-flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-600" /> below baseline
                </span>
                <span className="text-gray-400">
                    n× is the number of independent historical occurrences; the letter is the evidence grade.
                </span>
            </div>
        </div>
    );
});

EventImpactChart.displayName = 'EventImpactChart';
