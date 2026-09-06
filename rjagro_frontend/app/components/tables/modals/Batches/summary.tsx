'use client'
import { useEffect, useState } from "react";
import { Lock, ArrowDownRight } from "lucide-react";
import { SummaryTabProps } from "./utils";
import { BatchClosurePayload } from "@/app/types/interfaces";

export const SummaryTab: React.FC<SummaryTabProps> = ({
    batch,
    byCategory,
    farmerCommissionData,
    totalExpenses,
    onCloseBatch,
    loading
}) => {
    const [showCloseBatchForm, setShowCloseBatchForm] = useState(false);
    const [batchClosureData, setBatchClosureData] = useState<BatchClosurePayload>({
        batch_id: batch.batch_id,
        start_date: batch.start_date,
        end_date: new Date().toISOString().slice(0, 10),
        initial_chicken_count: batch.initial_bird_count,
        available_chicken_count: batch.current_bird_count,
        revenue: 0,
        gross_profit: 0
    });

    useEffect(() => {
        setBatchClosureData(prev => ({
            ...prev,
            gross_profit: prev.revenue - totalExpenses
        }));
    }, [totalExpenses, batchClosureData.revenue]);

    const handleCloseBatch = async () => {
        if (!onCloseBatch) return;
        await onCloseBatch(batchClosureData);
        setShowCloseBatchForm(false);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h4 className="text-lg font-bold text-gray-800">Net Cost Summary</h4>
                {batch.status !== 'Closed' && (
                    <button
                        onClick={() => setShowCloseBatchForm(!showCloseBatchForm)}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                        <Lock size={16} /> {showCloseBatchForm ? 'Cancel' : 'Close Batch'}
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {(['Feed', 'Chicks', 'Medicine'] as const).map((cat) => {
                    const data = byCategory[cat];
                    return (
                        <div key={cat} className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
                            <div className="text-center">
                                <div className="text-xs font-bold text-gray-500 uppercase">{cat} (Net)</div>
                                <div className="text-xl font-bold text-gray-900 mt-1">₹{data.netTotal.toFixed(2)}</div>
                            </div>
                            <div className="mt-3 pt-3 border-t border-gray-100 text-xs space-y-1">
                                <div className="flex justify-between text-gray-600">
                                    <span>Allocated:</span>
                                    <span>₹{data.allocatedTotal.toFixed(2)}</span>
                                </div>
                                {data.returnedTotal > 0 && (
                                    <div className="flex justify-between text-red-600 font-medium">
                                        <span className="flex items-center gap-1"><ArrowDownRight size={10} /> Returned:</span>
                                        <span>- ₹{data.returnedTotal.toFixed(2)}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}

                {/* Commission Card */}
                <div className="p-4 bg-green-50 border border-green-200 rounded-xl shadow-sm">
                    <div className="text-center">
                        <div className="text-xs font-bold text-green-600 uppercase">Commission</div>
                        <div className="text-xl font-bold text-green-900 mt-1">₹{farmerCommissionData.total.toFixed(2)}</div>
                        <div className="text-xs text-green-600 mt-3 pt-3 border-t border-green-200">
                            {farmerCommissionData.history.length} Payments
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-6 bg-gray-900 text-white rounded-xl flex justify-between items-center">
                <div>
                    <div className="text-sm text-gray-400">TOTAL BATCH COST</div>
                    <div className="text-3xl font-bold">₹{totalExpenses.toFixed(2)}</div>
                </div>
                <div className="text-right text-sm text-gray-400">
                    Calculated as:<br />(Allocations - Returns) + Commission
                </div>
            </div>

            {/* Close Batch Form */}
            {showCloseBatchForm && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl animate-in fade-in slide-in-from-top-2">
                    <h3 className="font-bold text-red-800 mb-4">Finalize Batch Closure</h3>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Available Birds</label>
                            <input
                                type="number"
                                className="w-full p-2 border rounded text-gray-900"
                                value={batchClosureData.available_chicken_count}
                                onChange={e => setBatchClosureData({ ...batchClosureData, available_chicken_count: Number(e.target.value) })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Total Revenue (₹)</label>
                            <input
                                type="number"
                                className="w-full p-2 border rounded text-gray-900"
                                value={batchClosureData.revenue}
                                onChange={e => setBatchClosureData({ ...batchClosureData, revenue: Number(e.target.value) })}
                            />
                        </div>
                    </div>

                    <div className="bg-white p-3 rounded border mb-4 text-sm">
                        <div className="flex justify-between mb-1">
                            <span>Revenue:</span>
                            <span className="text-green-600 font-bold">₹{batchClosureData.revenue.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between mb-1 border-b pb-1">
                            <span>Total Cost:</span>
                            <span className="text-red-600 font-bold">- ₹{totalExpenses.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between mt-2 text-base font-bold">
                            <span>Gross Profit:</span>
                            <span className={(batchClosureData.revenue - totalExpenses) >= 0 ? "text-green-600" : "text-red-600"}>
                                ₹{(batchClosureData.revenue - totalExpenses).toFixed(2)}
                            </span>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2">
                        <button onClick={() => setShowCloseBatchForm(false)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded">Cancel</button>
                        <button
                            onClick={handleCloseBatch}
                            disabled={loading}
                            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                        >
                            {loading ? 'Closing...' : 'Confirm Close'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};