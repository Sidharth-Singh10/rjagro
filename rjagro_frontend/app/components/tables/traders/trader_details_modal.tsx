'use client';

import React, { useEffect, useState } from 'react';
import { X, CreditCard, Receipt, Plus, ArrowLeft, Save, BookOpen, TrendingUp, TrendingDown } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { formatINR } from '@/app/utils/helper';
import { EntryType } from '@/app/types/enums';
import { TraderLedgerEntry, TraderPayment, TraderReceivable } from '@/app/types/interfaces';
import { fetchTraderLedger, fetchTraderPayments, fetchTraderReceivable, handleAddTraderPayment } from '@/app/api/traders';

interface TraderDetailsModalProps {
    traderId: number | null;
    isOpen: boolean;
    onClose: () => void;
}

type TabType = 'receivable' | 'received' | 'ledger';
type ViewMode = 'list' | 'form';

export const TraderDetailsModal: React.FC<TraderDetailsModalProps> = ({ traderId, isOpen, onClose }) => {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<TabType>('receivable');
    const [viewMode, setViewMode] = useState<ViewMode>('list');

    const [receivables, setReceivables] = useState<TraderReceivable[]>([]);
    const [payments, setPayments] = useState<TraderPayment[]>([]);
    const [ledger, setLedger] = useState<TraderLedgerEntry[]>([]);
    const [loading, setLoading] = useState(false);

    // Refresh data function
    const refreshData = async () => {
        if (!traderId) return;
        setLoading(true);
        try {
            const [receivablesData, paymentsData, ledgerData] = await Promise.all([
                fetchTraderReceivable(traderId),
                fetchTraderPayments(traderId),
                fetchTraderLedger(traderId)
            ]);
            setReceivables(receivablesData);
            setPayments(paymentsData);
            setLedger(ledgerData);
        } catch (err) {
            console.error("Failed to fetch trader details", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!isOpen || !traderId) return;
        refreshData();
        setViewMode('list');
        setActiveTab('receivable');
    }, [traderId, isOpen]);

    if (!isOpen || !traderId) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">

                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b bg-white z-10">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">
                            {viewMode === 'list' ? 'Trader Details' : 'Record Payment Receipt'}
                        </h2>
                        <p className="text-sm text-gray-500">ID: #{traderId}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {viewMode === 'list' ? (
                            <button
                                onClick={() => setViewMode('form')}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                            >
                                <Plus size={18} />
                                Receive Payment
                            </button>
                        ) : (
                            <button
                                onClick={() => setViewMode('list')}
                                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                            >
                                <ArrowLeft size={18} />
                                Back to List
                            </button>
                        )}
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors ml-2">
                            <X size={24} className="text-gray-500" />
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto bg-gray-50/50">

                    {viewMode === 'form' ? (
                        <div className="p-8 max-w-2xl mx-auto">
                            <PaymentForm
                                traderId={traderId}
                                queryClient={queryClient}
                                onSuccess={() => {
                                    refreshData();
                                    setViewMode('list');
                                    setActiveTab('received');
                                }}
                                onCancel={() => setViewMode('list')}
                            />
                        </div>
                    ) : (
                        <>
                            {/* Tabs Navigation */}
                            <div className="flex border-b bg-white sticky top-0 z-10">
                                <button
                                    onClick={() => setActiveTab('receivable')}
                                    className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors border-b-2 ${activeTab === 'receivable'
                                        ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                        }`}
                                >
                                    <TrendingUp size={18} />
                                    Receivables (Sales)
                                </button>
                                <button
                                    onClick={() => setActiveTab('received')}
                                    className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors border-b-2 ${activeTab === 'received'
                                        ? 'border-green-600 text-green-600 bg-green-50/50'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                        }`}
                                >
                                    <CreditCard size={18} />
                                    Payments Received
                                </button>
                                <button
                                    onClick={() => setActiveTab('ledger')}
                                    className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors border-b-2 ${activeTab === 'ledger'
                                        ? 'border-purple-600 text-purple-600 bg-purple-50/50'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                        }`}
                                >
                                    <BookOpen size={18} />
                                    History
                                </button>
                            </div>

                            <div className="p-6">
                                {loading ? (
                                    <div className="flex justify-center items-center h-48">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                    </div>
                                ) : (
                                    <>
                                        {activeTab === 'receivable' && <ReceivablesTable data={receivables} />}
                                        {activeTab === 'received' && <PaymentsTable data={payments} />}
                                        {activeTab === 'ledger' && <LedgerTable data={ledger} />}
                                    </>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- Sub Components ---
const PaymentForm = ({ traderId, queryClient, onSuccess, onCancel }: {
    traderId: number,
    queryClient: any,
    onSuccess: () => void,
    onCancel: () => void
}) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        amount: '',
        payment_date: new Date().toISOString().split('T')[0],
        payment_mode: 'Bank Transfer',
        reference_number: '',
        notes: ''
    });

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value.replace(/,/g, '');
        if (!isNaN(Number(rawValue))) {
            setFormData({ ...formData, amount: rawValue });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const payload = {
            trader_id: traderId,
            amount: Number(formData.amount),
            payment_date: formData.payment_date,
            payment_mode: formData.payment_mode,
            reference_number: formData.reference_number,
            notes: formData.notes,
            created_by: 1 // Adjust based on your auth context
        };
        await handleAddTraderPayment(payload, setLoading, onSuccess);
    };

    return (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Record Payment from Trader</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-2 md:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Amount Received</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="text-gray-500 sm:text-sm">₹</span>
                        </div>
                        <input
                            type="text"
                            inputMode="decimal"
                            required
                            className="pl-7 block w-full text-black rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm p-2 border"
                            value={formatINR(formData.amount)}
                            onChange={handleAmountChange}
                            placeholder="0.00"
                        />
                    </div>
                </div>
                <div className="col-span-2 md:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Receipt Date</label>
                    <input
                        type="date"
                        required
                        className="block w-full text-black rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm p-2 border"
                        value={formData.payment_date}
                        onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                    />
                </div>
                <div className="col-span-2 md:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Payment Mode</label>
                    <select
                        className="block w-full rounded-md text-black border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm p-2 border"
                        value={formData.payment_mode}
                        onChange={(e) => setFormData({ ...formData, payment_mode: e.target.value })}
                    >
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="Cash">Cash</option>
                        <option value="Cheque">Cheque</option>
                        <option value="UPI">UPI</option>
                    </select>
                </div>
                <div className="col-span-2 md:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Reference No / ID</label>
                    <input
                        type="text"
                        className="block w-full rounded-md text-black border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm p-2 border"
                        placeholder="e.g. TXN-12345"
                        value={formData.reference_number}
                        onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                    />
                </div>
                <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                    <textarea
                        rows={3}
                        className="block w-full rounded-md text-black border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm p-2 border"
                        placeholder="Additional details..."
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    />
                </div>
            </div>
            <div className="mt-8 flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={onCancel} disabled={loading} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={loading} className="inline-flex justify-center items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed">
                    {loading ? <>Processing...</> : <><Save size={16} /> Save Receipt</>}
                </button>
            </div>
        </form>
    );
};

const ReceivablesTable = ({ data }: { data: TraderReceivable[] }) => (
    data.length === 0 ? <EmptyState message="No receivable transactions (sales) found." /> :
        <div className="bg-white border rounded-lg overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
            <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-500 font-medium border-b">
                    <tr>
                        <th className="px-4 py-3">Sale ID</th>
                        <th className="px-4 py-3">Date</th>
                        {/* Assuming TraderReceivable has similar fields to SupplierPayable */}
                        <th className="px-4 py-3">Item Code</th>
                        <th className="px-4 py-3 text-right">Qty</th>
                        <th className="px-4 py-3 text-right">Total Amount</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {data.map((row, idx) => (
                        // Using index as fallback key if sale_id is missing, adjust based on actual interface
                        <tr key={row.id || idx} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium text-gray-900">#{row.id}</td>
                            <td className="px-4 py-3 text-gray-600">{new Date(row.sale_date).toLocaleDateString()}</td>
                            <td className="px-4 py-3 text-gray-600">{row.item_code}</td>
                            <td className="px-4 py-3 text-gray-900 text-right">{row.quantity}</td>
                            <td className="px-4 py-3 text-blue-600 font-medium text-right">{row.total_cost}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
);

const PaymentsTable = ({ data }: { data: TraderPayment[] }) => (
    data.length === 0 ? <EmptyState message="No payments received found." /> :
        <div className="bg-white border rounded-lg overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
            <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-500 font-medium border-b">
                    <tr>
                        <th className="px-4 py-3">Receipt ID</th>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Mode</th>
                        <th className="px-4 py-3">Ref No</th>
                        <th className="px-4 py-3">Notes</th>
                        <th className="px-4 py-3 text-right">Amount</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {data.map((row) => (
                        <tr key={row.payment_id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium text-gray-900">#{row.payment_id}</td>
                            <td className="px-4 py-3 text-gray-600">{new Date(row.payment_date).toLocaleDateString()}</td>
                            <td className="px-4 py-3"><span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 capitalize">{row.payment_mode}</span></td>
                            <td className="px-4 py-3 text-gray-600 font-mono text-xs">{row.reference_number || '-'}</td>
                            <td className="px-4 py-3 text-gray-600 max-w-xs truncate" title={row.notes}>{row.notes || '-'}</td>
                            <td className="px-4 py-3 text-green-600 font-medium text-right">{row.amount}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
);

const LedgerTable = ({ data }: { data: TraderLedgerEntry[] }) => (
    data.length === 0 ? <EmptyState message="No ledger entries found." /> :
        <div className="bg-white border rounded-lg overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
            <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-500 font-medium border-b">
                    <tr>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Description</th>
                        <th className="px-4 py-3">Ref</th>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3 text-right">Billed (Dr)</th>
                        <th className="px-4 py-3 text-right">Received (Cr)</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {data.map((row, index) => {

                        const isReceivable = row.entry_type === EntryType.Receivable || row.entry_type === 'SALE';
                        const isPayment = row.entry_type === EntryType.Cash || row.entry_type === EntryType.Settlement;

                        return (
                            <tr key={index} className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                                    {new Date(row.date).toLocaleDateString()}
                                </td>
                                <td className="px-4 py-3 font-medium text-gray-900">{row.description}</td>
                                <td className="px-4 py-3 text-gray-500 font-mono text-xs">{row.reference || '-'}</td>
                                <td className="px-4 py-3">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${isPayment
                                        ? 'bg-green-50 text-green-700 border-green-200'
                                        : 'bg-blue-50 text-blue-700 border-blue-200'
                                        }`}>
                                        {row.entry_type || ''}
                                    </span>
                                </td>

                                {/* Billed Column (Debits) */}
                                <td className="px-4 py-3 font-medium text-right text-blue-600">
                                    {isReceivable ? row.amount : '-'}
                                </td>

                                {/* Received Column (Credits) */}
                                <td className="px-4 py-3 font-medium text-right text-green-600">
                                    {isPayment ? row.amount : '-'}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
);

const EmptyState = ({ message }: { message: string }) => (
    <div className="flex flex-col items-center justify-center h-40 text-gray-400 bg-white border border-dashed rounded-lg">
        <Receipt size={32} className="mb-2 opacity-50" />
        <p>{message}</p>
    </div>
);