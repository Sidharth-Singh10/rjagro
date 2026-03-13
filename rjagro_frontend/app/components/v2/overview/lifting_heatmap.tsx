'use client';
import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, FlaskConical, Plus, X } from 'lucide-react';
import { ChartCard } from './chart_card';
import { Batch } from '@/app/types/interfaces';

interface BatchLift {
    batch_id: number | string;
    farmer_name: string;
    chick_count: number;
    planned?: boolean;
}

interface DayData {
    date: Date;
    dateKey: string;
    totalChicks: number;
    batches: BatchLift[];
}

interface TooltipState {
    visible: boolean;
    x: number;
    y: number;
    day: DayData | null;
}

interface PlannedBatch {
    id: string;
    startDate: string;
    chickCount: number;
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const LIFT_START_DAY = 35;
const LIFT_END_DAY = 40;

function addDays(date: Date, days: number): Date {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
}

function dateKey(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getMonthDays(year: number, month: number): Date[] {
    const days: Date[] = [];
    const d = new Date(year, month, 1);
    while (d.getMonth() === month) {
        days.push(new Date(d));
        d.setDate(d.getDate() + 1);
    }
    return days;
}

function getMondayOffset(date: Date): number {
    const dow = date.getDay();
    return dow === 0 ? 6 : dow - 1;
}

const COLOR_LEVELS = [
    { threshold: 0, bg: '#f3f4f6', text: '#9ca3af' },
    { threshold: 0.01, bg: '#dcfce7', text: '#166534' },
    { threshold: 0.25, bg: '#fef9c3', text: '#854d0e' },
    { threshold: 0.50, bg: '#fed7aa', text: '#9a3412' },
    { threshold: 0.75, bg: '#fca5a5', text: '#991b1b' },
    { threshold: 0.95, bg: '#dc2626', text: '#ffffff' },
];

function getColor(ratio: number): { bg: string; text: string } {
    for (let i = COLOR_LEVELS.length - 1; i >= 0; i--) {
        if (ratio >= COLOR_LEVELS[i].threshold) return COLOR_LEVELS[i];
    }
    return COLOR_LEVELS[0];
}

interface Props {
    batches: Batch[];
}

let plannedCounter = 0;

export const LiftingHeatmap = ({ batches }: Props) => {
    const today = useMemo(() => new Date(), []);
    const [baseMonth, setBaseMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
    const [planMode, setPlanMode] = useState(false);
    const [plannedBatches, setPlannedBatches] = useState<PlannedBatch[]>([]);
    const [draftDate, setDraftDate] = useState('');
    const [draftCount, setDraftCount] = useState('');

    const addPlannedBatch = useCallback(() => {
        const count = parseInt(draftCount);
        if (!draftDate || isNaN(count) || count <= 0) return;
        plannedCounter++;
        setPlannedBatches(prev => [...prev, {
            id: `P${plannedCounter}`,
            startDate: draftDate,
            chickCount: count,
        }]);
        setDraftDate('');
        setDraftCount('');
    }, [draftDate, draftCount]);

    const removePlannedBatch = useCallback((id: string) => {
        setPlannedBatches(prev => prev.filter(b => b.id !== id));
    }, []);

    const visibleMonths = useMemo(() => {
        return [0, 1, 2].map(i => new Date(baseMonth.getFullYear(), baseMonth.getMonth() + i, 1));
    }, [baseMonth]);

    const liftMap = useMemo(() => {
        const map: Record<string, BatchLift[]> = {};

        batches.forEach(b => {
            if (b.status !== 'Open') return;
            const start = new Date(b.start_date);
            if (isNaN(start.getTime())) return;
            const liftStart = addDays(start, LIFT_START_DAY);
            const liftEnd = addDays(start, LIFT_END_DAY);
            for (let d = new Date(liftStart); d <= liftEnd; d.setDate(d.getDate() + 1)) {
                const key = dateKey(d);
                if (!map[key]) map[key] = [];
                map[key].push({
                    batch_id: b.batch_id,
                    farmer_name: b.farmer_name,
                    chick_count: b.current_bird_count ?? b.initial_bird_count,
                });
            }
        });

        if (planMode) {
            plannedBatches.forEach(pb => {
                const start = new Date(pb.startDate);
                if (isNaN(start.getTime())) return;
                const liftStart = addDays(start, LIFT_START_DAY);
                const liftEnd = addDays(start, LIFT_END_DAY);
                for (let d = new Date(liftStart); d <= liftEnd; d.setDate(d.getDate() + 1)) {
                    const key = dateKey(d);
                    if (!map[key]) map[key] = [];
                    map[key].push({
                        batch_id: pb.id,
                        farmer_name: 'Planned',
                        chick_count: pb.chickCount,
                        planned: true,
                    });
                }
            });
        }

        return map;
    }, [batches, planMode, plannedBatches]);

    const maxChicks = useMemo(() => {
        let max = 0;
        for (const lifts of Object.values(liftMap)) {
            const total = lifts.reduce((s, l) => s + l.chick_count, 0);
            if (total > max) max = total;
        }
        return max;
    }, [liftMap]);

    const shiftMonth = useCallback((delta: number) => {
        setBaseMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
    }, []);

    const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, x: 0, y: 0, day: null });
    const containerRef = useRef<HTMLDivElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!tooltip.visible || !tooltipRef.current || !containerRef.current) return;
        const tt = tooltipRef.current;
        const container = containerRef.current.getBoundingClientRect();
        const ttRect = tt.getBoundingClientRect();

        if (ttRect.right > container.right) {
            tt.style.left = `${tooltip.x - ttRect.width - 8}px`;
        }
        if (ttRect.bottom > container.bottom + 100) {
            tt.style.top = `${tooltip.y - ttRect.height - 8}px`;
        }
    }, [tooltip]);

    const handleMouseEnter = useCallback((e: React.MouseEvent, day: DayData) => {
        if (day.totalChicks === 0) return;
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        setTooltip({
            visible: true,
            x: e.clientX - rect.left + 12,
            y: e.clientY - rect.top + 12,
            day,
        });
    }, []);

    const handleMouseMove = useCallback((e: React.MouseEvent, day: DayData) => {
        if (day.totalChicks === 0) return;
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        setTooltip(prev => ({
            ...prev,
            x: e.clientX - rect.left + 12,
            y: e.clientY - rect.top + 12,
        }));
    }, []);

    const handleMouseLeave = useCallback(() => {
        setTooltip({ visible: false, x: 0, y: 0, day: null });
    }, []);

    const todayKey = dateKey(today);

    return (
        <ChartCard title="Chick Lifting Schedule">
            <div ref={containerRef} className="relative">
                {/* Header: Navigation + Plan Mode toggle */}
                <div className="flex items-center justify-between mb-4">
                    <button
                        onClick={() => shiftMonth(-1)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <span className="text-sm font-medium text-gray-600">
                        {visibleMonths[0].toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                        {' — '}
                        {visibleMonths[2].toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPlanMode(prev => !prev)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                                planMode
                                    ? 'bg-violet-100 text-violet-700 ring-1 ring-violet-300'
                                    : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                            }`}
                        >
                            <FlaskConical size={14} />
                            Plan
                        </button>
                        <button
                            onClick={() => shiftMonth(1)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>
                </div>

                {/* Plan Mode Panel */}
                {planMode && (
                    <div className="mb-5 p-4 rounded-xl bg-violet-50 border border-violet-200">
                        <p className="text-xs font-semibold text-violet-700 mb-3">
                            What-if: Add hypothetical batches to preview lifting pressure
                        </p>
                        <div className="flex flex-wrap items-end gap-3 mb-3">
                            <div>
                                <label className="block text-[10px] font-medium text-violet-500 mb-1">Batch Start Date</label>
                                <input
                                    type="date"
                                    value={draftDate}
                                    onChange={e => setDraftDate(e.target.value)}
                                    className="px-3 py-1.5 text-xs text-gray-900 rounded-lg border border-violet-200 bg-white focus:outline-none focus:ring-2 focus:ring-violet-300"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-medium text-violet-500 mb-1">Chick Count</label>
                                <input
                                    type="number"
                                    min={1}
                                    value={draftCount}
                                    onChange={e => setDraftCount(e.target.value)}
                                    placeholder="e.g. 5000"
                                    className="px-3 py-1.5 text-xs text-gray-900 rounded-lg border border-violet-200 bg-white w-28 focus:outline-none focus:ring-2 focus:ring-violet-300"
                                />
                            </div>
                            <button
                                onClick={addPlannedBatch}
                                disabled={!draftDate || !draftCount || parseInt(draftCount) <= 0}
                                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                                <Plus size={14} />
                                Add
                            </button>
                        </div>
                        {plannedBatches.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {plannedBatches.map(pb => {
                                    const liftStart = addDays(new Date(pb.startDate), LIFT_START_DAY);
                                    const liftEnd = addDays(new Date(pb.startDate), LIFT_END_DAY);
                                    return (
                                        <div
                                            key={pb.id}
                                            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white border border-violet-200 text-xs"
                                        >
                                            <div>
                                                <span className="font-semibold text-violet-700">{pb.chickCount.toLocaleString('en-IN')}</span>
                                                <span className="text-violet-400 ml-1">chicks</span>
                                                <span className="text-gray-400 mx-1.5">|</span>
                                                <span className="text-gray-500">
                                                    Lift: {liftStart.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                                    {' - '}
                                                    {liftEnd.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => removePlannedBatch(pb.id)}
                                                className="p-0.5 rounded hover:bg-violet-100 text-violet-400 hover:text-violet-600 transition-colors"
                                            >
                                                <X size={12} />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* Calendar Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {visibleMonths.map(monthDate => {
                        const days = getMonthDays(monthDate.getFullYear(), monthDate.getMonth());
                        const leadingBlanks = getMondayOffset(days[0]);
                        const monthLabel = monthDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });

                        return (
                            <div key={monthLabel}>
                                <p className="text-xs font-semibold text-gray-500 mb-2 text-center">{monthLabel}</p>
                                <div className="grid grid-cols-7 gap-0.5">
                                    {WEEKDAYS.map(w => (
                                        <div key={w} className="text-[10px] text-gray-400 text-center font-medium pb-1">
                                            {w}
                                        </div>
                                    ))}
                                    {Array.from({ length: leadingBlanks }).map((_, i) => (
                                        <div key={`blank-${i}`} />
                                    ))}
                                    {days.map(d => {
                                        const key = dateKey(d);
                                        const lifts = liftMap[key] ?? [];
                                        const totalChicks = lifts.reduce((s, l) => s + l.chick_count, 0);
                                        const ratio = maxChicks > 0 ? totalChicks / maxChicks : 0;
                                        const color = getColor(ratio);
                                        const isToday = key === todayKey;
                                        const hasPlanned = lifts.some(l => l.planned);
                                        const dayData: DayData = { date: d, dateKey: key, totalChicks, batches: lifts };

                                        return (
                                            <div
                                                key={key}
                                                className={`
                                                    aspect-square rounded-md flex items-center justify-center
                                                    text-[11px] font-medium cursor-default transition-all duration-150
                                                    ${totalChicks > 0 ? 'hover:scale-110 hover:shadow-md cursor-pointer' : ''}
                                                    ${isToday ? 'ring-2 ring-blue-400 ring-offset-1' : ''}
                                                    ${hasPlanned ? 'ring-2 ring-violet-400 ring-inset' : ''}
                                                `}
                                                style={{ backgroundColor: color.bg, color: color.text }}
                                                onMouseEnter={e => handleMouseEnter(e, dayData)}
                                                onMouseMove={e => handleMouseMove(e, dayData)}
                                                onMouseLeave={handleMouseLeave}
                                            >
                                                {d.getDate()}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Legend */}
                <div className="flex items-center justify-center gap-2 mt-5 text-[10px] text-gray-500">
                    <span>No lifts</span>
                    {COLOR_LEVELS.map((level, i) => (
                        <div
                            key={i}
                            className="w-5 h-3 rounded-sm"
                            style={{ backgroundColor: level.bg }}
                        />
                    ))}
                    <span>Heavy</span>
                </div>

                {/* Tooltip */}
                {tooltip.visible && tooltip.day && (
                    <div
                        ref={tooltipRef}
                        className="absolute z-50 pointer-events-none bg-white border border-gray-200 rounded-lg shadow-xl p-3 min-w-[220px]"
                        style={{ left: tooltip.x, top: tooltip.y }}
                    >
                        <p className="text-xs font-semibold text-gray-700 mb-1.5">
                            {tooltip.day.date.toLocaleDateString('en-IN', {
                                weekday: 'short',
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                            })}
                        </p>
                        <p className="text-sm font-bold text-gray-900 mb-2">
                            {tooltip.day.totalChicks.toLocaleString('en-IN')} chicks to lift
                        </p>
                        <div className="space-y-1 max-h-[160px] overflow-y-auto">
                            {tooltip.day.batches.map(b => (
                                <div key={b.batch_id} className={`flex items-center justify-between text-xs gap-3 ${b.planned ? 'opacity-80' : ''}`}>
                                    <span className={`truncate ${b.planned ? 'text-violet-600' : 'text-gray-600'}`}>
                                        {b.planned ? `${b.batch_id}` : `Batch #${b.batch_id}`}
                                        <span className={`ml-1 ${b.planned ? 'text-violet-400' : 'text-gray-400'}`}>
                                            ({b.farmer_name})
                                        </span>
                                    </span>
                                    <span className={`font-semibold whitespace-nowrap ${b.planned ? 'text-violet-700' : 'text-gray-800'}`}>
                                        {b.chick_count.toLocaleString('en-IN')}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </ChartCard>
    );
};
