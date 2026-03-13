'use client';
import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ChartCard } from './chart_card';
import { Batch } from '@/app/types/interfaces';

interface BatchLift {
    batch_id: number;
    farmer_name: string;
    chick_count: number;
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

export const LiftingHeatmap = ({ batches }: Props) => {
    const today = useMemo(() => new Date(), []);
    const [baseMonth, setBaseMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));

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
        return map;
    }, [batches]);

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
                {/* Navigation */}
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
                    <button
                        onClick={() => shiftMonth(1)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>

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
                                        const dayData: DayData = { date: d, dateKey: key, totalChicks, batches: lifts };

                                        return (
                                            <div
                                                key={key}
                                                className={`
                                                    aspect-square rounded-md flex items-center justify-center
                                                    text-[11px] font-medium cursor-default transition-all duration-150
                                                    ${totalChicks > 0 ? 'hover:scale-110 hover:shadow-md cursor-pointer' : ''}
                                                    ${isToday ? 'ring-2 ring-blue-400 ring-offset-1' : ''}
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
                                <div key={b.batch_id} className="flex items-center justify-between text-xs gap-3">
                                    <span className="text-gray-600 truncate">
                                        Batch #{b.batch_id}
                                        <span className="text-gray-400 ml-1">({b.farmer_name})</span>
                                    </span>
                                    <span className="font-semibold text-gray-800 whitespace-nowrap">
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
