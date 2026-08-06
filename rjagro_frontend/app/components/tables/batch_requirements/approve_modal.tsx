import React, { useEffect, useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import { BatchRequirement, StockReceipt } from '@/app/types/interfaces';
import { fetchStockReceipts } from '@/app/api/stock_receipts';

interface ApproveModalProps {
    requirement: BatchRequirement;
    onClose: () => void;
    onConfirm: (req: BatchRequirement, lines: { lot_id: number; qty: number }[]) => Promise<void>;
}

export const ApproveRequirementModal: React.FC<ApproveModalProps> = ({ requirement, onClose, onConfirm }) => {
    const [receipts, setReceipts] = useState<StockReceipt[]>([]);
    const [loading, setLoading] = useState(true);
    const [allocated, setAllocated] = useState<Record<number, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setLoading(true);
        fetchStockReceipts(requirement.item_code)
            .then(setReceipts)
            .catch(() => setError("Failed to load stock receipts"))
            .finally(() => setLoading(false));
    }, [requirement.item_code]);

    const totalAllocated = useMemo(() => {
        return Object.values(allocated).reduce((sum, v) => sum + (Number(v) || 0), 0);
    }, [allocated]);

    const requestedQty = Number(requirement.quantity);

    const handleAllocate = (lotId: number, value: string) => {
        setError(null);
        setAllocated(prev => ({ ...prev, [lotId]: value }));
    };

    const handleConfirm = async () => {
        const lines = Object.entries(allocated)
            .filter(([, qty]) => Number(qty) > 0)
            .map(([lotId, qty]) => ({ lot_id: Number(lotId), qty: Number(qty) }));

        if (lines.length === 0) {
            setError("Select at least one lot to allocate");
            return;
        }

        setIsSubmitting(true);
        await onConfirm(requirement, lines);
        setIsSubmitting(false);
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg transform transition-all max-h-[90vh] flex flex-col">
                <div className="p-6 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                            <Check className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">Approve Requirement</h3>
                            <p className="text-sm text-gray-500">
                                #{requirement.requirement_id} · {requirement.item_code} {requirement.item_name}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="p-6 space-y-4 overflow-y-auto">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Requested:</span>
                        <span className="font-medium text-gray-900">
                            {requestedQty} {requirement.item_unit}
                        </span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Allocated:</span>
                        <span className={`font-medium ${totalAllocated > requestedQty ? 'text-red-600' : 'text-green-600'}`}>
                            {totalAllocated} / {requestedQty}
                        </span>
                    </div>

                    {error && (
                        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2.5">
                            {error}
                        </div>
                    )}

                    {/* Lot selection table */}
                    {loading ? (
                        <div className="text-sm text-gray-500 py-4 text-center">Loading available stock…</div>
                    ) : receipts.length === 0 ? (
                        <div className="text-sm text-gray-500 py-4 text-center">
                            No stock receipts found for {requirement.item_code}
                        </div>
                    ) : (
                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 text-left">
                                    <tr>
                                        <th className="px-3 py-2 text-gray-600 font-medium">Lot</th>
                                        <th className="px-3 py-2 text-gray-600 font-medium">Unit Cost</th>
                                        <th className="px-3 py-2 text-gray-600 font-medium">Available</th>
                                        <th className="px-3 py-2 text-gray-600 font-medium">Allocate</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                        {receipts.filter(r => Number(r.remaining_qty) > 0).map(receipt => (
                        <tr key={receipt.lot_id} className="hover:bg-gray-50">
                            <td className="px-3 py-2 text-gray-900">#{receipt.lot_id}</td>
                            <td className="px-3 py-2 text-gray-900">
                                ₹{Number(receipt.unit_cost).toFixed(2)}
                            </td>
                            <td className="px-3 py-2 text-gray-600">
                                {receipt.remaining_qty}
                            </td>
                            <td className="px-3 py-2">
                                <input
                                    type="number"
                                    min="0"
                                    max={Number(receipt.remaining_qty)}
                                                    value={allocated[receipt.lot_id] ?? ''}
                                                    onChange={(e) => handleAllocate(receipt.lot_id, e.target.value)}
                                                    className="w-20 px-2 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm text-gray-900"
                                                    placeholder="0"
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-gray-100 flex gap-3 justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={totalAllocated <= 0 || totalAllocated > requestedQty || isSubmitting}
                        className="px-4 py-2.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                    >
                        {isSubmitting ? 'Processing...' : <><Check size={16} /> Approve Request</>}
                    </button>
                </div>
            </div>
        </div>
    );
};
