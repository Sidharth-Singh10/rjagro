'use client';

import { memo } from 'react';
import { X } from 'lucide-react';

export interface CogsBreakdownRow {
    batchId: number;
    endDate: string;
    revenue: number;
    cogs: number;
    grossProfit: number;
}

export interface CogsMonthTotals {
    key: string;
    label: string;
    rows: CogsBreakdownRow[];
    revenue: number;
    cogs: number;
    grossProfit: number;
    marginPct: number;
}

export interface CogsBreakdown {
    month: CogsMonthTotals;
    previousMonth: CogsMonthTotals;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    breakdown: CogsBreakdown;
}

const fmtAbs = (v: number) =>
    `₹${Math.abs(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtSigned = (v: number) => `${v < 0 ? '−' : ''}${fmtAbs(v)}`;

const gpColor = (v: number) => (v >= 0 ? '#16a34a' : '#dc2626');

const formatDate = (dateStr: string) => {
    const [y, m, d] = dateStr.slice(0, 10).split('-').map(Number);
    if (!y || !m || !d) return dateStr;
    return new Date(y, m - 1, d).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
};

export const CogsDetailModal = memo(({ isOpen, onClose, breakdown }: Props) => {
    if (!isOpen) return null;

    const { month, previousMonth } = breakdown;
    const hasRows = month.rows.length > 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex justify-between items-center px-6 py-4 border-b bg-white">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">COGS — {month.label}</h2>
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
                    {/* Step 1: Closed batches */}
                    <section>
                        <h3 className="text-sm font-semibold text-gray-700 mb-2">
                            Step 1: Batches Closed in {month.label}
                        </h3>
                        <div className="border border-gray-100 rounded-lg overflow-hidden">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="bg-gray-50 text-gray-500">
                                        <th className="text-left px-3 py-2 font-medium">Batch</th>
                                        <th className="text-left px-3 py-2 font-medium">Closed on</th>
                                        <th className="text-right px-3 py-2 font-medium">Revenue</th>
                                        <th className="text-right px-3 py-2 font-medium">COGS</th>
                                        <th className="text-right px-3 py-2 font-medium">Gross Profit</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {hasRows ? month.rows.map(r => (
                                        <tr key={r.batchId} className="border-t border-gray-50">
                                            <td className="px-3 py-2 text-gray-700">Batch {r.batchId}</td>
                                            <td className="px-3 py-2 text-gray-600">{formatDate(r.endDate)}</td>
                                            <td className="px-3 py-2 text-right text-gray-600">{fmtSigned(r.revenue)}</td>
                                            <td className="px-3 py-2 text-right font-medium text-gray-800">{fmtSigned(r.cogs)}</td>
                                            <td
                                                className="px-3 py-2 text-right font-medium"
                                                style={{ color: gpColor(r.grossProfit) }}
                                            >
                                                {fmtSigned(r.grossProfit)}
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr className="border-t border-gray-50">
                                            <td colSpan={5} className="px-3 py-6 text-center text-gray-400">
                                                No batches closed in {month.label}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                                {hasRows && (
                                    <tfoot>
                                        <tr className="border-t-2 border-gray-200 bg-gray-50">
                                            <td colSpan={2} className="px-3 py-2 text-right font-semibold text-gray-600">
                                                Total
                                            </td>
                                            <td className="px-3 py-2 text-right font-bold text-gray-900">{fmtSigned(month.revenue)}</td>
                                            <td className="px-3 py-2 text-right font-bold text-gray-900">{fmtSigned(month.cogs)}</td>
                                            <td
                                                className="px-3 py-2 text-right font-bold"
                                                style={{ color: gpColor(month.grossProfit) }}
                                            >
                                                {fmtSigned(month.grossProfit)}
                                            </td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                    </section>

                    {/* Step 2: Calculation */}
                    <section>
                        <h3 className="text-sm font-semibold text-gray-700 mb-2">
                            Step 2: Calculation
                        </h3>
                        <div className="border border-gray-200 bg-gray-50 rounded-lg p-4 text-xs text-gray-700 space-y-1.5">
                            {hasRows ? (
                                <>
                                    {month.rows.map(r => (
                                        <p key={r.batchId}>
                                            <span className="font-medium">Batch {r.batchId}:</span>{' '}
                                            COGS = Revenue − Gross Profit = {fmtSigned(r.revenue)} − ({fmtSigned(r.grossProfit)}) ={' '}
                                            <span className="font-semibold">{fmtSigned(r.cogs)}</span>
                                        </p>
                                    ))}
                                    <p className="pt-2 border-t border-gray-200 font-semibold text-gray-900">
                                        Total COGS ({month.rows.length} batch{month.rows.length !== 1 ? 'es' : ''}) = {fmtSigned(month.cogs)}
                                    </p>
                                    <p className="text-[11px] text-gray-500 pt-1">
                                        Gross Profit is the stored value from each batch closure (closure revenue − allocated
                                        costs of that batch).
                                    </p>
                                </>
                            ) : (
                                <p className="text-gray-400">No closed batches — COGS is ₹0.00.</p>
                            )}
                        </div>
                    </section>

                    {/* Step 3: Previous month comparison */}
                    <section>
                        <h3 className="text-sm font-semibold text-gray-700 mb-2">
                            Step 3: Previous Month — {previousMonth.label}
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div className="border border-gray-100 rounded-lg p-3">
                                <p className="text-[11px] text-gray-500">Revenue</p>
                                <p className="text-sm font-semibold text-gray-900">{fmtSigned(previousMonth.revenue)}</p>
                            </div>
                            <div className="border border-gray-100 rounded-lg p-3">
                                <p className="text-[11px] text-gray-500">COGS</p>
                                <p className="text-sm font-semibold text-gray-900">{fmtSigned(previousMonth.cogs)}</p>
                            </div>
                            <div className="border border-gray-100 rounded-lg p-3">
                                <p className="text-[11px] text-gray-500">Gross Profit</p>
                                <p className="text-sm font-semibold" style={{ color: gpColor(previousMonth.grossProfit) }}>
                                    {fmtSigned(previousMonth.grossProfit)}
                                </p>
                            </div>
                            <div className="border border-gray-100 rounded-lg p-3">
                                <p className="text-[11px] text-gray-500">Margin</p>
                                <p className="text-sm font-semibold text-gray-900">
                                    {previousMonth.revenue > 0 ? `${previousMonth.marginPct.toFixed(2)}%` : '—'}
                                </p>
                            </div>
                        </div>
                        {previousMonth.rows.length === 0 && (
                            <p className="text-[11px] text-gray-400 mt-2">
                                No batches closed in {previousMonth.label}, so no month-over-month comparison is shown on the card.
                            </p>
                        )}
                    </section>
                </div>
            </div>
        </div>
    );
});

CogsDetailModal.displayName = 'CogsDetailModal';
