'use client'
import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
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

    // Update gross profit when expenses or revenue change
    useEffect(() => {
        setBatchClosureData(prev => ({
            ...prev,
            gross_profit: prev.revenue - totalExpenses
        }));
    }, [totalExpenses, batchClosureData.revenue]);

    const handleCloseBatch = async () => {
        if (!onCloseBatch) return;
        try {
            await onCloseBatch(batchClosureData);
            setShowCloseBatchForm(false);
        } catch (error) {
            console.error('Error closing batch:', error);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="text-center">
                    <h4 className="text-lg font-semibold text-gray-800 mb-2">Allocation Summary</h4>
                    <p className="text-sm text-gray-600">Overview of all allocated values for this batch</p>
                </div>
                {batch.status !== 'Closed' && (
                    <button
                        onClick={() => setShowCloseBatchForm(!showCloseBatchForm)}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                        <Lock size={18} />
                        {showCloseBatchForm ? 'Cancel Close' : 'Close Batch'}
                    </button>
                )}
            </div>

            {/* Individual category totals including farmer commission */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                {(['Feed', 'Chicks', 'Medicine'] as const).map((category) => (
                    <div key={category} className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200">
                        <div className="text-center">
                            <div className="text-xs font-medium text-gray-600 uppercase tracking-wider mb-1">
                                {category}
                            </div>
                            <div className="text-xl font-bold text-gray-900">
                                ₹{byCategory[category].total.toFixed(2)}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                                {byCategory[category].rows.length} items
                            </div>
                        </div>
                    </div>
                ))}

                {/* Farmer Commission Card */}
                <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200">
                    <div className="text-center">
                        <div className="text-xs font-medium text-green-600 uppercase tracking-wider mb-1">
                            Farmer Commission
                        </div>
                        <div className="text-xl font-bold text-green-900">
                            ₹{farmerCommissionData.total.toFixed(2)}
                        </div>
                        <div className="text-xs text-green-600 mt-1">
                            {farmerCommissionData.history.length} payments
                        </div>
                    </div>
                </div>
            </div>

            {/* Grand total including farmer commission */}
            <div className="p-6 bg-gradient-to-r from-green-100 to-blue-100 rounded-xl border-2 border-green-200">
                <div className="text-center">
                    <div className="text-sm font-medium text-gray-700 mb-2">GRAND TOTAL (Including Commission)</div>
                    <div className="text-3xl font-bold text-green-900">
                        ₹{totalExpenses.toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-600 mt-2">
                        Total allocations: {byCategory.Feed.rows.length + byCategory.Chicks.rows.length + byCategory.Medicine.rows.length} |
                        Commission payments: {farmerCommissionData.history.length}
                    </div>
                </div>
            </div>

            {/* Close Batch Form */}
            {showCloseBatchForm && (
                <div className="p-4 bg-red-50 rounded-xl border border-red-200">
                    <h5 className="text-md font-medium text-red-800 mb-4">Close Batch - Final Summary</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Final Available Chicken Count *
                            </label>
                            <input
                                type="number"
                                value={batchClosureData.available_chicken_count}
                                onChange={(e) => setBatchClosureData(prev => ({
                                    ...prev,
                                    available_chicken_count: Number(e.target.value)
                                }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black"
                                placeholder="Final chicken count"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Revenue (₹)
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                value={batchClosureData.revenue}
                                onChange={(e) => setBatchClosureData(prev => ({
                                    ...prev,
                                    revenue: Number(e.target.value)
                                }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black"
                                placeholder="Total revenue from batch"
                            />
                        </div>
                    </div>

                    {/* Calculated Summary */}
                    <div className="mt-4 p-3 bg-white rounded-lg border">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="text-gray-600">Total Expenses:</span>
                                <span className="float-right font-semibold text-red-600">₹{totalExpenses.toFixed(2)}</span>
                            </div>
                            <div>
                                <span className="text-gray-600">Revenue:</span>
                                <span className="float-right font-semibold text-green-600">₹{batchClosureData.revenue.toFixed(2)}</span>
                            </div>
                            <div className="col-span-2 border-t pt-2">
                                <span className="text-gray-800 font-medium">Gross Profit:</span>
                                <span className={`float-right font-bold ${(batchClosureData.revenue - totalExpenses) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    ₹{(batchClosureData.revenue - totalExpenses).toFixed(2)}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3 mt-4">
                        <button
                            onClick={handleCloseBatch}
                            disabled={loading}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                        >
                            <Lock size={16} />
                            {loading ? 'Closing...' : 'Confirm Close Batch'}
                        </button>
                        <button
                            onClick={() => setShowCloseBatchForm(false)}
                            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};