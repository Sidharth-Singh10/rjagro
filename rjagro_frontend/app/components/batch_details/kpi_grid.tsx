'use client'
import { useState } from 'react';

export const KPICard = ({ title, value, subtext, icon: Icon, color }: any) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex justify-between items-start mb-2">
            <div>
                <p className="text-sm font-medium text-gray-500">{title}</p>
                <h3 className="text-2xl font-semibold text-gray-800 mt-1 tnum">{value}</h3>
            </div>
            <div
                className="p-2 rounded-lg"
                style={{ backgroundColor: `color-mix(in srgb, ${color} 12%, white)`, color }}
            >
                <Icon size={20} />
            </div>
        </div>
        <p className="text-xs text-gray-500">{subtext}</p>
    </div>
);

export interface ExpenseBreakdown {
    feed: number;
    chicks: number;
    medicine: number;
    returns: number;
}

const fmt = (v: number) =>
    `₹${v.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const breakdownItems = [
    { key: 'feed' as const, label: 'Feed', color: 'bg-amber-400', text: 'text-amber-700', ring: 'ring-amber-200' },
    { key: 'chicks' as const, label: 'Chicks', color: 'bg-sky-400', text: 'text-sky-700', ring: 'ring-sky-200' },
    { key: 'medicine' as const, label: 'Medicine', color: 'bg-rose-400', text: 'text-rose-700', ring: 'ring-rose-200' },
];

export const ExpenseKPICard = ({
    title,
    value,
    subtext,
    icon: Icon,
    color,
    breakdown,
}: {
    title: string;
    value: string;
    subtext: string;
    icon: any;
    color: string;
    breakdown: ExpenseBreakdown;
}) => {
    const [hovered, setHovered] = useState(false);
    const allocTotal = breakdown.feed + breakdown.chicks + breakdown.medicine;

    return (
        <div
            className="relative bg-white p-6 rounded-xl shadow-sm border border-gray-100 cursor-default transition-shadow duration-200 hover:shadow-md"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            <div className="flex justify-between items-start mb-2">
                <div>
                    <p className="text-sm font-medium text-gray-500">{title}</p>
                    <h3 className="text-2xl font-semibold text-gray-800 mt-1 tnum">{value}</h3>
                </div>
                <div
                    className="p-2 rounded-lg"
                    style={{ backgroundColor: `color-mix(in srgb, ${color} 12%, white)`, color }}
                >
                    <Icon size={20} />
                </div>
            </div>
            <p className="text-xs text-gray-500">{subtext}</p>

            {hovered && (
                <div className="absolute z-50 left-0 right-0 top-full mt-2 pointer-events-none">
                    <div className="relative mx-2">
                        {/* Ripple rings */}
                        <div className="absolute inset-0 rounded-xl animate-[ripple_0.6s_ease-out]" />
                        <div className="absolute inset-0 rounded-xl animate-[ripple_0.6s_0.15s_ease-out]" />

                        {/* Card body */}
                        <div className="
                            bg-white/95 backdrop-blur-md rounded-xl shadow-xl border border-gray-100
                            px-5 py-4
                            origin-top animate-[dropReveal_0.4s_cubic-bezier(0.34,1.56,0.64,1)_forwards]
                        ">
                            {/* Arrow pointing up */}
                            <div className="absolute left-1/2 -translate-x-1/2 -top-1.5 w-3 h-3 bg-white/95 border-l border-t border-gray-100 rotate-45" />

                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
                                Expense Breakdown
                            </div>

                            <div className="space-y-2.5">
                                {breakdownItems.map((item, i) => {
                                    const val = breakdown[item.key];
                                    const pct = allocTotal > 0 ? (val / allocTotal) * 100 : 0;
                                    return (
                                        <div
                                            key={item.key}
                                            className="animate-[slideUp_0.35s_cubic-bezier(0.16,1,0.3,1)_forwards] opacity-0"
                                            style={{ animationDelay: `${0.1 + i * 0.08}s` }}
                                        >
                                            <div className="flex items-center justify-between text-xs mb-1">
                                                <span className={`font-semibold ${item.text}`}>{item.label}</span>
                                                <span className="font-bold text-gray-800">{fmt(val)}</span>
                                            </div>
                                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full ${item.color} rounded-full animate-[barFill_0.5s_cubic-bezier(0.16,1,0.3,1)_forwards]`}
                                                    style={{
                                                        width: `${pct}%`,
                                                        animationDelay: `${0.15 + i * 0.08}s`,
                                                        transform: 'scaleX(0)',
                                                        transformOrigin: 'left',
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {breakdown.returns > 0 && (
                                <div
                                    className="mt-3 pt-2 border-t border-gray-100 flex justify-between text-xs animate-[slideUp_0.35s_cubic-bezier(0.16,1,0.3,1)_forwards] opacity-0"
                                    style={{ animationDelay: '0.34s' }}
                                >
                                    <span className="text-red-500 font-medium">Returns</span>
                                    <span className="font-bold text-red-600">- {fmt(breakdown.returns)}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};