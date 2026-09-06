'use client'
import React, { useState } from 'react';
import TableSkeletonRows from '@/app/components/ui/table_skeleton_rows';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Inbox,  ArrowLeft, Banknote, BookOpen, CreditCard, Save, Users } from 'lucide-react';
import {
    createAppTraderPayment,
    fetchAppTraderLedger,
    fetchAppTraderStatement,
    fetchAppTraders,
} from '@/app/api/app_traders';
import {
    AppTrader,
    CreateTraderPaymentPayload,
    TraderLedgerEntryView,
    TraderLedgerView,
} from '@/app/types/interfaces';

const fmtMoney = (value?: string | null): string => {
    if (!value) return "0.00";
    return Number(value).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

const fmtDate = (iso: string): string => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
};

const SummaryCard = ({ label, value, tone }: { label: string; value: string; tone: "debit" | "payment" | "balance" }) => (
    <div className={`bg-white rounded-xl border p-5 shadow-sm ${
        tone === "debit" ? "border-gray-200" : tone === "payment" ? "border-green-100" : "border-gray-200"
    }`}>
        <p className="text-xs font-medium uppercase tracking-wider text-gray-500">{label}</p>
        <p className={`mt-2 text-2xl font-bold ${
            tone === "debit" ? "text-gray-900" : tone === "payment" ? "text-green-600" : "text-gray-900"
        }`}>₹{value}</p>
    </div>
);

const AppTradersModule: React.FC = () => {
    const queryClient = useQueryClient();
    const [selected, setSelected] = useState<AppTrader | null>(null);
    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");
    const [filtered, setFiltered] = useState(false);
    const [showPayment, setShowPayment] = useState(false);
    const [amount, setAmount] = useState("");
    const [mode, setMode] = useState("cash");
    const [screenshotUrl, setScreenshotUrl] = useState("");
    const [busy, setBusy] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);
    const [actionSuccess, setActionSuccess] = useState<string | null>(null);

    const { data: traders = [], isLoading: tradersLoading } = useQuery({
        queryKey: ['app-traders'],
        queryFn: fetchAppTraders,
        staleTime: 5 * 60 * 1000,
    });

    const ledgerQueryKey = filtered
        ? ['app-trader-ledger', selected?.id, from, to]
        : ['app-trader-ledger', selected?.id];

    const { data: ledger, isLoading: ledgerLoading } = useQuery<TraderLedgerView>({
        queryKey: ledgerQueryKey,
        queryFn: () => {
            if (!selected) return Promise.reject(new Error("No trader selected"));
            if (filtered) return fetchAppTraderStatement(selected.id, from || undefined, to || undefined);
            return fetchAppTraderLedger(selected.id);
        },
        enabled: !!selected,
        staleTime: 30 * 1000,
    });

    const resetPayment = () => {
        setAmount("");
        setMode("cash");
        setScreenshotUrl("");
        setActionError(null);
        setActionSuccess(null);
    };

    const submitPayment = async () => {
        if (!selected) return;
        const amt = Number(amount);
        if (!amt || amt <= 0) {
            setActionError("Enter a valid payment amount");
            return;
        }
        setBusy(true);
        setActionError(null);
        setActionSuccess(null);
        try {
            const payload: CreateTraderPaymentPayload = {
                amount: amt,
                payment_mode: mode,
                screenshot_url: screenshotUrl.trim() || undefined,
            };
            await createAppTraderPayment(selected.id, payload);
            queryClient.invalidateQueries({ queryKey: ['app-trader-ledger', selected.id] });
            setShowPayment(false);
            resetPayment();
            setActionSuccess(`Payment of ₹${fmtMoney(String(amt))} recorded for ${selected.name}`);
        } catch (e) {
            setActionError(e instanceof Error ? e.message : "Failed to record payment");
        } finally {
            setBusy(false);
        }
    };

    const applyFilter = () => {
        setFiltered(true);
    };

    const clearFilter = () => {
        setFrom("");
        setTo("");
        setFiltered(false);
    };

    return (
        <div className="space-y-6">
            {actionSuccess && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
                    {actionSuccess}
                </div>
            )}

            {!selected ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between p-5 border-b border-gray-100">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">App Traders</h2>
                            <p className="text-sm text-gray-500 mt-0.5">
                                Mobile-app traders registered on the live-selling platform
                            </p>
                        </div>
                        <Users className="text-green-600" size={22} />
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 text-gray-500 font-medium border-b">
                                <tr>
                                    <th className="px-5 py-3 text-left">Trader</th>
                                    <th className="px-5 py-3 text-left">Phone</th>
                                    <th className="px-5 py-3 text-left">Email</th>
                                    <th className="px-5 py-3 text-right">Credit Limit (₹)</th>
                                    <th className="px-5 py-3 text-right">Terms (days)</th>
                                    <th className="px-5 py-3 text-left">Linked Legacy Trader</th>
                                    <th className="px-5 py-3 text-right">Ledger</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {tradersLoading ? (
                                    <TableSkeletonRows cols={7} />
                                ) : traders.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-12 text-center">
                                    <Inbox className="w-8 h-8 text-gray-300 mx-auto mb-2" aria-hidden />
                                    <p className="text-sm text-gray-500">No app traders found</p>
                                </td>
                                    </tr>
                                ) : (
                                    traders.map((trader) => (
                                        <tr key={trader.id} className="hover:bg-green-50/40 transition-colors cursor-pointer" onClick={() => { setSelected(trader); setFiltered(false); setFrom(""); setTo(""); }}>
                                            <td className="px-5 py-4">
                                                <div className="font-medium text-gray-900">{trader.name}</div>
                                                <div className="text-xs text-gray-400">ID #{trader.id}</div>
                                            </td>
                                            <td className="px-5 py-4 text-gray-600">{trader.phone}</td>
                                            <td className="px-5 py-4 text-gray-600">{trader.email}</td>
                                            <td className="px-5 py-4 text-right font-medium text-gray-900">{fmtMoney(trader.credit_limit)}</td>
                                            <td className="px-5 py-4 text-right text-gray-600">{trader.credit_terms_days ?? "—"}</td>
                                            <td className="px-5 py-4 text-gray-600">
                                                {trader.linked_trader_id ? (
                                                    <span className="inline-flex items-center gap-1 text-xs bg-green-50 text-green-700 border border-green-100 rounded-full px-2 py-0.5">
                                                        #{trader.linked_trader_id}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-amber-600">No link — sales to this trader are disabled</span>
                                                )}
                                            </td>
                                            <td className="px-5 py-4 text-right">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setSelected(trader); setFiltered(false); setFrom(""); setTo(""); }}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-colors"
                                                >
                                                    <BookOpen size={14} /> View
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="space-y-5">
                    <div className="flex items-center justify-between">
                        <button
                            onClick={() => { setSelected(null); setFiltered(false); resetPayment(); }}
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            <ArrowLeft size={16} /> All App Traders
                        </button>
                        <div className="text-right">
                            <h2 className="text-lg font-semibold text-gray-900">{selected.name}</h2>
                            <p className="text-sm text-gray-500">{selected.phone} · {selected.email}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <SummaryCard label="Total Dues (Debits)" value={fmtMoney(ledger?.total_debits)} tone="debit" />
                        <SummaryCard label="Total Payments" value={fmtMoney(ledger?.total_payments)} tone="payment" />
                        <SummaryCard label="Balance Outstanding" value={fmtMoney(ledger?.balance)} tone="balance" />
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                        <div className="flex flex-wrap items-center justify-between gap-3 p-5 border-b border-gray-100">
                            <div className="flex items-center gap-3">
                                <label className="text-sm font-medium text-gray-700">From</label>
                                <input
                                    type="date"
                                    value={from}
                                    onChange={(e) => setFrom(e.target.value)}
                                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500/30 outline-none"
                                />
                                <label className="text-sm font-medium text-gray-700">To</label>
                                <input
                                    type="date"
                                    value={to}
                                    onChange={(e) => setTo(e.target.value)}
                                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500/30 outline-none"
                                />
                                <button
                                    onClick={applyFilter}
                                    className="px-3 py-1.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
                                >
                                    Apply
                                </button>
                                {filtered && (
                                    <button
                                        onClick={clearFilter}
                                        className="px-3 py-1.5 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                {!showPayment ? (
                                    <button
                                        onClick={() => { setShowPayment(true); setActionError(null); }}
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                                    >
                                        <CreditCard size={16} /> Record Payment
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => { setShowPayment(false); setActionError(null); }}
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
                                    >
                                        <ArrowLeft size={16} /> Cancel
                                    </button>
                                )}
                            </div>
                        </div>

                        {showPayment && (
                            <div className="p-5 border-b border-gray-100 bg-green-50/30">
                                <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                    <Banknote size={16} className="text-green-600" /> Record Payment from {selected.name}
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Amount (₹)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                            placeholder="0.00"
                                            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-green-500/40 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Payment Mode</label>
                                        <select
                                            value={mode}
                                            onChange={(e) => setMode(e.target.value)}
                                            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg shadow-sm bg-white focus:ring-2 focus:ring-green-500/40 outline-none"
                                        >
                                            <option value="cash">Cash</option>
                                            <option value="bank">Bank</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Screenshot URL (optional)</label>
                                        <input
                                            type="text"
                                            value={screenshotUrl}
                                            onChange={(e) => setScreenshotUrl(e.target.value)}
                                            placeholder="https://..."
                                            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-green-500/40 outline-none"
                                        />
                                    </div>
                                </div>
                                {actionError && (
                                    <p className="mt-3 text-sm text-red-600">{actionError}</p>
                                )}
                                <div className="mt-4 flex justify-end gap-3">
                                    <button
                                        onClick={() => { setShowPayment(false); setActionError(null); }}
                                        disabled={busy}
                                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-60"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={submitPayment}
                                        disabled={busy}
                                        className="inline-flex items-center gap-2 px-5 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                                    >
                                        {busy ? (
                                            <span className="animate-spin h-4 w-4 border-2 border-white/80 border-t-transparent rounded-full"></span>
                                        ) : (
                                            <Save size={16} />
                                        )}
                                        {busy ? "Saving..." : "Confirm Payment"}
                                    </button>
                                </div>
                            </div>
                        )}

                        {ledgerLoading ? (
                            <div className="flex justify-center items-center h-40">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                            </div>
                        ) : ledger && ledger.entries.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-40 text-gray-400 bg-white">
                                <BookOpen size={32} className="mb-2 opacity-50" />
                                <p>No ledger entries{filtered ? " in this date range" : ""}</p>
                            </div>
                        ) : ledger ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 text-gray-500 font-medium border-b">
                                        <tr>
                                            <th className="px-5 py-3 text-left">Date</th>
                                            <th className="px-5 py-3 text-left">Description</th>
                                            <th className="px-5 py-3 text-left">Reference</th>
                                            <th className="px-5 py-3 text-left">Type</th>
                                            <th className="px-5 py-3 text-right">Debit (₹)</th>
                                            <th className="px-5 py-3 text-right">Payment (₹)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {ledger.entries.map((entry: TraderLedgerEntryView) => {
                                            const isDebit = entry.entry_type === "debit";
                                            const isPayment = entry.entry_type === "payment";
                                            return (
                                                <tr key={entry.id ?? `${entry.entry_type}-${entry.created_at}`} className="hover:bg-gray-50">
                                                    <td className="px-5 py-4 whitespace-nowrap text-gray-600">{fmtDate(entry.created_at)}</td>
                                                    <td className="px-5 py-4 font-medium text-gray-900">
                                                        {isDebit
                                                            ? entry.inquiry_number
                                                                ? `Order debit · ${entry.inquiry_number}`
                                                                : "Batch sale debit"
                                                            : `Payment${entry.payment_mode ? ` (${entry.payment_mode})` : ""}`}
                                                    </td>
                                                    <td className="px-5 py-4 text-gray-500 font-mono text-xs">
                                                        {entry.inquiry_number ?? (entry.id ? `#${entry.id}` : "—")}
                                                    </td>
                                                    <td className="px-5 py-4">
                                                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium border ${
                                                            isPayment
                                                                ? "bg-green-50 text-green-700 border-green-200"
                                                                : "bg-green-50 text-green-700 border-green-200"
                                                        }`}>
                                                            {isDebit ? "Debit" : isPayment ? "Payment" : entry.entry_type}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-4 text-right font-medium text-gray-900">
                                                        {isDebit ? `₹${fmtMoney(entry.amount)}` : "—"}
                                                    </td>
                                                    <td className="px-5 py-4 text-right font-medium text-green-600">
                                                        {isPayment ? `₹${fmtMoney(entry.amount)}` : "—"}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        ) : null}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AppTradersModule;