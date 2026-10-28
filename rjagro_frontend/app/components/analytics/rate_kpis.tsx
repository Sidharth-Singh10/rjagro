'use client'
import { memo } from 'react';
import { ArrowDownRight, ArrowUpRight, CalendarClock, IndianRupee, TrendingDown, TrendingUp, LucideIcon } from 'lucide-react';
import { chart } from '../v2/overview/chart_colors';
import { formatRate, type RateKpis as RateKpisData } from '@/app/utils/rate_tracker';

const KpiCard = memo(({
    title,
    value,
    subtext,
    icon: Icon,
    color,
    trend,
}: {
    title: string;
    value: string;
    subtext: string;
    icon: LucideIcon;
    color: string;
    trend?: number | null;
}) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-3 hover:shadow-md transition-shadow duration-200">
        <div
            className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: `color-mix(in srgb, ${color} 10%, white)`, color }}
        >
            <Icon size={19} strokeWidth={1.8} />
        </div>
        <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium text-gray-500">{title}</p>
            <div className="flex items-baseline gap-1.5">
                <p className="text-lg font-semibold text-gray-900 truncate tnum">{value}</p>
                {trend !== undefined && trend !== null && (
                    <span className={`inline-flex items-center gap-0.5 text-[11px] font-medium ${trend >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {trend >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                        {Math.abs(trend).toFixed(1)}%
                    </span>
                )}
            </div>
            <p className="text-[11px] text-gray-400 mt-0.5 truncate">{subtext}</p>
        </div>
    </div>
));
KpiCard.displayName = 'KpiCard';

const shortDate = (iso: string) =>
    new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: '2-digit',
        timeZone: 'UTC',
    });

export const RateKpis = memo(({ kpis }: { kpis: RateKpisData }) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        <KpiCard
            title="Current rate"
            value={formatRate(kpis.latest.rate)}
            subtext={shortDate(kpis.latest.date)}
            icon={IndianRupee}
            color={chart.brand}
        />
        <KpiCard
            title="30-day average"
            value={formatRate(kpis.average30)}
            subtext={`${kpis.average30Observed} quoted days`}
            icon={CalendarClock}
            color={chart.blue}
        />
        <KpiCard
            title="Peak rate"
            value={formatRate(kpis.high.rate)}
            subtext={shortDate(kpis.high.date)}
            icon={TrendingUp}
            color={chart.green}
        />
        <KpiCard
            title="Lowest rate"
            value={formatRate(kpis.low.rate)}
            subtext={shortDate(kpis.low.date)}
            icon={TrendingDown}
            color={chart.red}
        />
        <KpiCard
            title="Year on year"
            value={kpis.yoyPct === null ? '—' : `${kpis.yoyPct > 0 ? '+' : ''}${kpis.yoyPct.toFixed(1)}%`}
            subtext={kpis.yoyBase ? `vs ${shortDate(kpis.yoyBase.date)}` : 'No quote a year back'}
            icon={kpis.yoyPct !== null && kpis.yoyPct < 0 ? ArrowDownRight : ArrowUpRight}
            color={kpis.yoyPct !== null && kpis.yoyPct < 0 ? chart.rose : chart.teal}
        />
    </div>
));
RateKpis.displayName = 'RateKpis';
