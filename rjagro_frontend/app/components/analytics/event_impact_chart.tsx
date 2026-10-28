'use client'
import { memo, useMemo, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { ChartCard } from '../v2/overview/chart_card';
import { chart } from '../v2/overview/chart_colors';
import type { DailyPoint } from '@/app/utils/rate_tracker';
import {
    formatDelta, formatPValue, ordinal, shortEventName, verdictLabel, verdictMark,
    type EventImpact, type ImpactVerdict,
} from '@/app/utils/event_price_impact';

const MS_PER_DAY = 86_400_000;
const PX_PER_DAY = [8, 12, 18, 24];
const LANE_COUNT = 4;
const LANE_HEIGHT = 26;
const LABEL_TOP = 8;
const LABEL_HEIGHT = LABEL_TOP + LANE_COUNT * LANE_HEIGHT + 6;
const PLOT_HEIGHT = 300;
const AXIS_HEIGHT = 28;
const HEIGHT = LABEL_HEIGHT + PLOT_HEIGHT + AXIS_HEIGHT;
const AXIS_WIDTH = 52;
const DOMAIN: [number, number] = [50, 150];
const Y_TICKS = [50, 75, 100, 125, 150];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const verdictColor: Record<ImpactVerdict, string> = {
    consistent: chart.green,
    contradicted: chart.red,
    fragile: chart.amber,
    notable: chart.blue,
    typical: chart.slate,
    insufficient: '#cbd5e1',
    pending: '#e2e8f0',
};

const epochOf = (iso: string) => Date.UTC(
    Number(iso.slice(0, 4)),
    Number(iso.slice(5, 7)) - 1,
    Number(iso.slice(8, 10)),
);

const shortDate = (iso: string) =>
    `${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1]} ${iso.slice(2, 4)}`;

const assumedArrow = (impact: EventImpact['event']['impact']) => {
    if (impact === 'positive') return '↑';
    if (impact === 'negative') return '↓';
    if (impact === 'mixed') return '~';
    return '?';
};

interface Placed {
    impact: EventImpact;
    x: number;
    lane: number;
    width: number;
}

const LegendChip = ({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) => (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-gray-500">
        <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: dashed ? 'transparent' : color, border: dashed ? `1.5px solid ${color}` : undefined }}
        />
        {label}
    </span>
);

export const EventImpactChart = memo(({
    impacts,
    days,
}: {
    impacts: EventImpact[];
    days: DailyPoint[];
}) => {
    const [zoomIndex, setZoomIndex] = useState(0);
    const [active, setActive] = useState<EventImpact | null>(null);
    const px = PX_PER_DAY[zoomIndex] ?? PX_PER_DAY[0];

    const start = days[0]?.date ?? '';
    const end = days[days.length - 1]?.date ?? '';
    const totalDays = days.length;
    const width = Math.max(totalDays * px, 320);

    const xOf = (iso: string) => {
        const index = Math.round((epochOf(iso) - epochOf(start)) / MS_PER_DAY);
        return Math.max(0, Math.min(totalDays, index)) * px + px / 2;
    };

    const yOf = (rate: number) => {
        const [low, high] = DOMAIN;
        return LABEL_HEIGHT + ((high - rate) / (high - low)) * PLOT_HEIGHT;
    };

    const observable = useMemo(() => impacts.filter((row) => row.observable), [impacts]);

    const { placed, hidden } = useMemo(() => {
        const laneEnds = new Array<number>(LANE_COUNT).fill(-Infinity);
        const lanes: Placed[] = [];
        let skipped = 0;

        const toX = (iso: string) => {
            const index = Math.round((epochOf(iso) - epochOf(start)) / MS_PER_DAY);
            return Math.max(0, Math.min(totalDays, index)) * px + px / 2;
        };

        const candidates = observable
            .filter((row) => row.verdict !== 'insufficient')
            .sort((a, b) => a.event.startDate.localeCompare(b.event.startDate));

        for (const impact of candidates) {
            const textWidth = Math.max(
                76,
                Math.min(168, Math.max(shortEventName(impact.event.name).length * 6.2,
                    `assumed ${assumedArrow(impact.event.impact)} · actual ${formatDelta(impact.deltaPct)}`.length * 5.2) + 20),
            );
            const x = toX(impact.event.startDate);
            const half = textWidth / 2;
            const lane = laneEnds.findIndex((laneEnd) => laneEnd + 8 < x - half);

            if (lane === -1) {
                skipped += 1;
                continue;
            }
            laneEnds[lane] = x + half;
            lanes.push({ impact, x, lane, width: textWidth });
        }

        return { placed: lanes, hidden: skipped };
    }, [observable, px, start, totalDays]);

    const monthTicks = useMemo(() => {
        const ticks: { x: number; label: string }[] = [];
        if (!start || !end) return ticks;
        const toX = (iso: string) => {
            const index = Math.round((epochOf(iso) - epochOf(start)) / MS_PER_DAY);
            return Math.max(0, Math.min(totalDays, index)) * px + px / 2;
        };
        const cursor = new Date(`${start.slice(0, 7)}-01T00:00:00Z`);
        cursor.setUTCMonth(cursor.getUTCMonth() + 1);
        while (cursor.toISOString().slice(0, 10) <= end) {
            const iso = cursor.toISOString().slice(0, 10);
            ticks.push({
                x: toX(iso),
                label: `${MONTHS[cursor.getUTCMonth()]}${cursor.getUTCMonth() === 0 ? ` ${cursor.getUTCFullYear()}` : ''}`,
            });
            cursor.setUTCMonth(cursor.getUTCMonth() + 1);
        }
        return ticks;
    }, [start, end, px, totalDays]);

    const linePath = useMemo(() => {
        let path = '';
        let penDown = false;
        days.forEach((day, index) => {
            const x = index * px + px / 2;
            if (day.rate === null) {
                penDown = false;
                return;
            }
            const y = LABEL_HEIGHT + ((DOMAIN[1] - day.rate) / (DOMAIN[1] - DOMAIN[0])) * PLOT_HEIGHT;
            path += `${penDown ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
            penDown = true;
        });
        return path;
    }, [days, px]);

    const toggleActive = (impact: EventImpact) =>
        setActive((current) => (current?.id === impact.id ? null : impact));

    const controls = (
        <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1.5">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <LegendChip color={chart.brand} label="Daily rate" />
                <LegendChip color={chart.green} label="With hypothesis" />
                <LegendChip color={chart.red} label="Against" />
                <LegendChip color={chart.amber} label="Baseline-sensitive" />
                <LegendChip color={chart.slate} label="Typical" />
                <LegendChip color="#cbd5e1" label="No data" dashed />
            </div>
            <div className="flex items-center rounded-lg border border-gray-200 bg-white">
                <button
                    type="button"
                    onClick={() => setZoomIndex((value) => Math.max(0, value - 1))}
                    disabled={zoomIndex === 0}
                    aria-label="Zoom out chart"
                    title="Zoom out"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-l-md text-gray-500 transition-colors
                        hover:bg-gray-100 hover:text-gray-800 focus-visible:outline-2 focus-visible:outline-offset-2
                        focus-visible:outline-green-600 disabled:cursor-not-allowed disabled:opacity-35"
                >
                    <Minus size={14} aria-hidden />
                </button>
                <span className="w-10 text-center text-[11px] tabular-nums text-gray-500" aria-hidden>
                    {Math.round((px / PX_PER_DAY[0]) * 100)}%
                </span>
                <button
                    type="button"
                    onClick={() => setZoomIndex((value) => Math.min(PX_PER_DAY.length - 1, value + 1))}
                    disabled={zoomIndex === PX_PER_DAY.length - 1}
                    aria-label="Zoom in chart"
                    title="Zoom in"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-r-md text-gray-500 transition-colors
                        hover:bg-gray-100 hover:text-gray-800 focus-visible:outline-2 focus-visible:outline-offset-2
                        focus-visible:outline-green-600 disabled:cursor-not-allowed disabled:opacity-35"
                >
                    <Plus size={14} aria-hidden />
                </button>
            </div>
        </div>
    );

    return (
        <ChartCard title="Continuous rate with event impact" headerControls={controls}>
            <p className="mb-3 text-[11px] text-gray-500">
                Each flag is an event, positioned on the day it starts. The first line is our assumption, the second
                the move the quoted prices actually show — average during the event versus the equal window before it.
                Scroll sideways, or zoom in when flags crowd.
                {hidden > 0 && (
                    <span className="ml-1 text-gray-400">
                        {hidden} flag{hidden === 1 ? '' : 's'} hidden at this zoom.
                    </span>
                )}
            </p>

            <div className="flex">
                <svg
                    width={AXIS_WIDTH}
                    height={HEIGHT}
                    className="shrink-0"
                    role="presentation"
                    aria-hidden
                >
                    {Y_TICKS.map((tick) => (
                        <g key={tick}>
                            <text
                                x={AXIS_WIDTH - 8}
                                y={yOf(tick) + 3}
                                textAnchor="end"
                                fontSize={10}
                                fill={chart.tick}
                            >
                                ₹{tick}
                            </text>
                        </g>
                    ))}
                </svg>

                <div
                    className="flex-1 overflow-x-auto overflow-y-hidden"
                    tabIndex={0}
                    role="group"
                    aria-label="Continuous price chart with event flags, scrolls horizontally"
                >
                    <div className="relative" style={{ width }}>
                        <svg width={width} height={HEIGHT} role="img" aria-label="Daily wholesale rate with event impact flags">
                            <defs>
                                <clipPath id="impact-plot">
                                    <rect x={0} y={LABEL_HEIGHT} width={width} height={PLOT_HEIGHT} />
                                </clipPath>
                            </defs>

                            {/* month boundaries + labels */}
                            {monthTicks.map((tick) => (
                                <g key={tick.x}>
                                    <line
                                        x1={tick.x}
                                        x2={tick.x}
                                        y1={LABEL_HEIGHT}
                                        y2={LABEL_HEIGHT + PLOT_HEIGHT}
                                        stroke={chart.grid}
                                        strokeWidth={1}
                                    />
                                    <text
                                        x={tick.x + 4}
                                        y={LABEL_HEIGHT + PLOT_HEIGHT + 16}
                                        fontSize={10}
                                        fill={chart.tick}
                                    >
                                        {tick.label}
                                    </text>
                                </g>
                            ))}

                            {/* horizontal grid */}
                            {Y_TICKS.map((tick) => (
                                <line
                                    key={tick}
                                    x1={0}
                                    x2={width}
                                    y1={yOf(tick)}
                                    y2={yOf(tick)}
                                    stroke={chart.grid}
                                    strokeDasharray="3 3"
                                    strokeWidth={1}
                                />
                            ))}

                            {/* event bands */}
                            <g clipPath="url(#impact-plot)">
                                {observable.map((impact) => {
                                    if (impact.event.startDate === impact.event.endDate) return null;
                                    const from = xOf(impact.event.startDate) - px / 2;
                                    const to = xOf(impact.event.endDate) + px / 2;
                                    return (
                                        <rect
                                            key={`band-${impact.id}`}
                                            x={from}
                                            y={LABEL_HEIGHT}
                                            width={Math.max(px, to - from)}
                                            height={PLOT_HEIGHT}
                                            fill={verdictColor[impact.verdict]}
                                            fillOpacity={impact.verdict === 'insufficient' ? 0.03 : 0.05}
                                        />
                                    );
                                })}
                            </g>

                            {/* the rate line */}
                            <path
                                d={linePath}
                                fill="none"
                                stroke={chart.brand}
                                strokeWidth={1.6}
                                clipPath="url(#impact-plot)"
                            />

                            {/* markers, connectors and labels */}
                            {observable.map((impact) => {
                                const x = xOf(impact.event.startDate);
                                const color = verdictColor[impact.verdict];
                                const isPlaced = impact.verdict !== 'insufficient';
                                const spot = placed.find((item) => item.impact.id === impact.id);
                                const lineTop = isPlaced && spot ? LABEL_TOP + spot.lane * LANE_HEIGHT + LANE_HEIGHT - 4 : LABEL_HEIGHT;
                                // Stop at the plot's top edge: a full-height guide reads as data.
                                const lineBottom = LABEL_HEIGHT + 12;
                                const labelY = spot ? LABEL_TOP + spot.lane * LANE_HEIGHT + 10 : 0;
                                const isActive = active?.id === impact.id;

                                return (
                                    <g key={impact.id}>
                                        <line
                                            x1={x}
                                            x2={x}
                                            y1={lineTop}
                                            y2={lineBottom}
                                            stroke={color}
                                            strokeWidth={isActive ? 1.8 : 1}
                                            strokeOpacity={isActive ? 0.9 : 0.45}
                                        />
                                        <circle
                                            cx={x}
                                            cy={LABEL_HEIGHT + 6}
                                            r={isActive ? 4 : 3}
                                            fill={impact.verdict === 'insufficient' ? '#fff' : color}
                                            stroke={color}
                                            strokeWidth={1.4}
                                        />

                                        {spot && (
                                            <g
                                                tabIndex={0}
                                                role="button"
                                                aria-label={`${impact.event.name}, ${shortDate(impact.event.startDate)}. Assumed ${impact.event.impact}, actual ${formatDelta(impact.deltaPct)}, ${verdictLabel[impact.verdict]}.`}
                                                onMouseEnter={() => setActive(impact)}
                                                onMouseLeave={() => setActive(null)}
                                                onFocus={() => setActive(impact)}
                                                onBlur={() => setActive(null)}
                                                onClick={() => toggleActive(impact)}
                                                onKeyDown={(event) => {
                                                    if (event.key === 'Enter' || event.key === ' ') {
                                                        event.preventDefault();
                                                        toggleActive(impact);
                                                    }
                                                }}
                                                className="cursor-pointer outline-none"
                                            >
                                                <rect
                                                    x={x - spot.width / 2}
                                                    y={labelY - 12}
                                                    width={spot.width}
                                                    height={26}
                                                    fill={isActive ? '#f8fafc' : 'transparent'}
                                                    rx={4}
                                                />
                                                <text
                                                    x={x}
                                                    y={labelY}
                                                    textAnchor="middle"
                                                    fontSize={10.5}
                                                    fontWeight={600}
                                                    fill="#374151"
                                                >
                                                    {shortEventName(impact.event.name)}
                                                </text>
                                                <text
                                                    x={x}
                                                    y={labelY + 12}
                                                    textAnchor="middle"
                                                    fontSize={9.5}
                                                    fill={color}
                                                >
                                                    {`assumed ${assumedArrow(impact.event.impact)} · actual ${formatDelta(impact.deltaPct)}`}
                                                </text>
                                            </g>
                                        )}
                                    </g>
                                );
                            })}
                        </svg>

                        {active && (
                            <div
                                className="pointer-events-none absolute z-20 w-[268px] rounded-lg border border-gray-200 bg-white p-3 text-[11px] shadow-lg"
                                style={{
                                    left: Math.min(Math.max(0, xOf(active.event.startDate) - 134), Math.max(0, width - 268)),
                                    top: LABEL_HEIGHT + 8,
                                }}
                            >
                                <p className="font-semibold text-gray-800">{active.event.name}</p>
                                <p className="mt-0.5 text-gray-500">
                                    {shortDate(active.event.startDate)}
                                    {active.event.startDate !== active.event.endDate ? ` – ${shortDate(active.event.endDate)}` : ''}
                                    {' · '}
                                    {verdictMark[active.verdict]} {verdictLabel[active.verdict]}
                                </p>
                                {active.verdict === 'insufficient' ? (
                                    <p className="mt-1 text-gray-500">{active.reason}</p>
                                ) : (
                                    <>
                                        <p className="mt-1 text-gray-600">
                                            Assumed {active.event.impact} · actual {formatDelta(active.deltaPct)}
                                        </p>
                                        {active.benchmark !== null && (
                                            <p className="text-gray-500">
                                                {formatDelta(active.trendPct)} vs trend · {ordinal(active.benchmark.percentile)} pct · p {formatPValue(active.benchmark.p)}
                                            </p>
                                        )}
                                        <p className="text-gray-500">
                                            Pre ₹{active.pre.average} ({active.pre.quotes} quotes) → during ₹{active.during.average} ({active.during.quotes} quotes)
                                        </p>
                                        {active.confounders.length > 0 && (
                                            <p className="mt-1 text-gray-400">
                                                Also in this window: {active.confounders.slice(0, 2).map((item) => item.name).join(', ')}
                                                {active.confounders.length > 2 ? ` +${active.confounders.length - 2}` : ''}
                                            </p>
                                        )}
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </ChartCard>
    );
});
EventImpactChart.displayName = 'EventImpactChart';
