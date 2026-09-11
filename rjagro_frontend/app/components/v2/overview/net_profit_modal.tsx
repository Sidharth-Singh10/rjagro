'use client';

import { memo } from 'react';
import { X } from 'lucide-react';

export interface NetProfitMonth {
    key: string;
    label: string;
    revenue: number;
    cogs: number;
    grossProfit: number;
    otherExpenses: number;
    commission: number;
    interest: number;
    netProfit: number;
    otherByCategory: { name: string; value: number }[];
}

export interface NetProfitBreakdown {
    month: NetProfitMonth;
    previousMonth: NetProfitMonth;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    breakdown: NetProfitBreakdown;
}

const fmtAbs = (v: number) =>
    `₹${Math.abs(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtSigned = (v: number) => `${v < 0 ? '−' : ''}${fmtAbs(v)}`;

const amountColor = (v: number) => (v >= 0 ? '#16a34a' : '#dc2626');

export const NetProfitModal = memo(({ isOpen, onClose, breakdown }: Props) => {
    if (!isOpen) return null;

    const { month, previousMonth } = breakdown;

    const rows: Array<{ label: string; amount: number; kind: 'add' | 'sub' | 'subtotal' | 'total' }> = [
        { label: 'Revenue (closed batches)', amount: month.revenue, kind: 'add' },
        { label: '− COGS (allocated costs)', amount: month.cogs, kind: 'sub' },
        { label: '= Gross Profit', amount: month.grossProfit, kind: 'subtotal' },
        { label: '− Other Expenses', amount: month.otherExpenses, kind: 'sub' },
        { label: '− Farmer Commission', amount: month.commission, kind: 'sub' },
        { label: '− Interest', amount: month.interest, kind: 'sub' },
        { label: '= Net Profit', amount: month.netProfit, kind: 'total' },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex justify-between items-center px-6 py-4 border-b bg-white">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">Net Profit — {month.label}</h2>
                        <p className="text-xs text-gray-500 mt-0.5">Step-by-step calculation</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                        <X size={18} className="text-gray-500" />
                    </button>
                </div>

                {/* Body */}
                <div className="overflow-y-auto p-6 space-y-5">
                    {/* Step 1: P&L */}
                    <section>
                        <h3 className="text-sm font-semibold text-gray-700 mb-2">
                            Step 1: Profit & Loss — {month.label}
                        </h3>
                        <div className="border border-gray-100 rounded-lg overflow-hidden">
                            <table className="w-full text-xs">
                                <tbody>
                                    {rows.map(r => (
                                        <tr
                                            key={r.label}
                                            className={`border-t border-gray-50 ${r.kind === 'subtotal' || r.kind === 'total' ? 'bg-gray-50' : ''}`}
                                        >
                                            <td className={`px-3 py-2 ${r.kind === 'total' ? 'font-bold text-gray-900' : r.kind === 'subtotal' ? 'font-semibold text-gray-800' : 'text-gray-600'}`}>
                                                {r.label}
                                            </td>
                                            <td
                                                className={`px-3 py-2 text-right ${r.kind === 'total' ? 'font-bold' : r.kind === 'subtotal' ? 'font-semibold' : 'text-gray-700'}`}
                                                style={{
                                                    color: r.kind === 'sub' ? '#b3702e' : amountColor(r.amount),
                                                }}
                                            >
                                                {fmtSigned(r.amount)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <p className="text-[11px] text-gray-500 mt-2">
                            Revenue is the closure revenue; COGS is the allocated cost of those closed batches.
                            Other Expenses, Farmer Commission and Interest are expenses booked in {month.label}.
                        </p>
                    </section>

                    {/* Step 2: Other expenses split */}
                    <section>
                        <h3 className="text-sm font-semibold text-gray-700 mb-2">
                            Step 2: Other Expenses Breakdown
                        </h3>
                        <div className="border border-gray-100 rounded-lg overflow-hidden">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="bg-gray-50 text-gray-500">
                                        <th className="text-left px-3 py-2 font-medium">Category</th>
                                        <th className="text-right px-3 py-2 font-medium">Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {month.otherByCategory.length === 0 ? (
                                        <tr className="border-t border-gray-50">
                                            <td colSpan={2} className="px-3 py-6 text-center text-gray-400">
                                                No other expenses in {month.label}
                                            </td>
                                        </tr>
                                    ) : month.otherByCategory.map(c => (
                                        <tr key={c.name} className="border-t border-gray-50">
                                            <td className="px-3 py-2 text-gray-700">{c.name}</td>
                                            <td className="px-3 py-2 text-right text-gray-700">{fmtSigned(c.value)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                {month.otherByCategory.length > 0 && (
                                    <tfoot>
                                        <tr className="border-t-2 border-gray-200 bg-gray-50">
                                            <td className="px-3 py-2 text-right font-semibold text-gray-600">Total</td>
                                            <td className="px-3 py-2 text-right font-bold text-gray-900">{fmtSigned(month.otherExpenses)}</td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                    </section>

                    {/* Step 3: Previous month comparison */}
                    <section>
                        <h3 className="text-sm font-semibold text-gray-700 mb-2">
                            Step 3: Previous Month — {previousMonth.label}
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div className="border border-gray-100 rounded-lg p-3">
                                <p className="text-[11px] text-gray-500">Gross Profit</p>
                                <p className="text-sm font-semibold" style={{ color: amountColor(previousMonth.grossProfit) }}>
                                    {fmtSigned(previousMonth.grossProfit)}
                                </p>
                            </div>
                            <div className="border border-gray-100 rounded-lg p-3">
                                <p className="text-[11px] text-gray-500">Other Expenses</p>
                                <p className="text-sm font-semibold text-gray-900">{fmtSigned(previousMonth.otherExpenses)}</p>
                            </div>
                            <div className="border border-gray-100 rounded-lg p-3">
                                <p className="text-[11px] text-gray-500">Commission + Interest</p>
                                <p className="text-sm font-semibold text-gray-900">{fmtSigned(previousMonth.commission + previousMonth.interest)}</p>
                            </div>
                            <div className="border border-gray-100 rounded-lg p-3">
                                <p className="text-[11px] text-gray-500">Net Profit</p>
                                <p className="text-sm font-semibold" style={{ color: amountColor(previousMonth.netProfit) }}>
                                    {fmtSigned(previousMonth.netProfit)}
                                </p>
                            </div>
                        </div>
                        {previousMonth.revenue === 0 && previousMonth.otherExpenses === 0 && previousMonth.commission === 0 && (
                            <p className="text-[11px] text-gray-400 mt-2">
                                No activity recorded in {previousMonth.label}.
                            </p>
                        )}
                    </section>
                </div>
            </div>
        </div>
    );
});

NetProfitModal.displayName = 'NetProfitModal';
