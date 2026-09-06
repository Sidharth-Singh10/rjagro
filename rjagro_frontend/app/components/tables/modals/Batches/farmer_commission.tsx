'use client'

import { useState } from "react";
import { FarmerCommissionTabProps, parseNumberSafe } from "./utils";
import { CreateFarmerCommission } from "@/app/types/interfaces";
import { IndianRupee, Save } from "lucide-react";

export const FarmerCommissionTab: React.FC<FarmerCommissionTabProps> = ({
    batch,
    commissionHistory,
    totalCommission,
    onAddCommission,
    loading,
    userId
}) => {
    const [showCommissionForm, setShowCommissionForm] = useState(false);
    const [newCommission, setNewCommission] = useState<CreateFarmerCommission>({
        farmer_id: batch.farmer_id,
        commission_amount: '',
        description: '',
        created_by: userId ? Number(userId) : undefined
    });

    const handleAddCommission = async () => {
        if (!onAddCommission) return;

        if (!newCommission.commission_amount || parseNumberSafe(newCommission.commission_amount) <= 0) {
            alert('Please enter a valid commission amount');
            return;
        }

        try {
            await onAddCommission({
                ...newCommission,
                farmer_id: batch.farmer_id,
                commission_amount: parseNumberSafe(newCommission.commission_amount),
                created_by: userId ? Number(userId) : undefined
            });

            // Reset form and hide it
            setNewCommission({
                farmer_id: batch.farmer_id,
                commission_amount: '',
                description: '',
                created_by: userId ? Number(userId) : undefined
            });
            setShowCommissionForm(false);
        } catch (error) {
            console.error('Error adding commission:', error);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h4 className="text-lg font-semibold text-gray-800">Farmer Commission</h4>
                    <p className="text-sm text-gray-600">Manage commission payments for {batch.farmer_name}</p>
                </div>
                <button
                    onClick={() => setShowCommissionForm(!showCommissionForm)}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                    <IndianRupee size={18} />
                    {showCommissionForm ? 'Cancel' : 'Add Commission'}
                </button>
            </div>

            {/* Total Commission Display */}
            <div className="p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-xl border border-green-200">
                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-green-800">
                        Total Commission Paid
                    </span>
                    <span className="text-2xl font-bold text-green-900">
                        ₹{totalCommission.toFixed(2)}
                    </span>
                </div>
            </div>

            {/* Add Commission Form */}
            {showCommissionForm && (
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <h5 className="text-md font-medium text-gray-800 mb-4">Add New Commission Payment</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Commission Amount *
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                value={newCommission.commission_amount}
                                onChange={(e) => setNewCommission(prev => ({
                                    ...prev,
                                    commission_amount: e.target.value === '' ? '' : Number(e.target.value)
                                }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                                placeholder="Enter amount"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Description
                            </label>
                            <input
                                type="text"
                                value={newCommission.description}
                                onChange={(e) => setNewCommission(prev => ({
                                    ...prev,
                                    description: e.target.value
                                }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                                placeholder="Payment description"
                            />
                        </div>
                    </div>
                    <div className="flex gap-3 mt-4">
                        <button
                            onClick={handleAddCommission}
                            disabled={loading}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                        >
                            <Save size={16} />
                            {loading ? 'Saving...' : 'Save Commission'}
                        </button>
                        <button
                            onClick={() => setShowCommissionForm(false)}
                            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Commission History Table */}
            <div>
                <h5 className="text-md font-medium text-gray-800 mb-3">Commission History</h5>
                <div className="max-h-80 overflow-auto rounded-xl border border-gray-200">
                    {commissionHistory.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                                <IndianRupee className="text-xl text-gray-400" />
                            </div>
                            <p className="text-sm font-medium">No commission payments</p>
                            <p className="text-xs text-gray-400">No commission history available</p>
                        </div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 sticky top-0">
                                <tr className="text-left">
                                    <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                        Date
                                    </th>
                                    <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                        Amount
                                    </th>
                                    <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                        Description
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {commissionHistory
                                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                                    .map((commission) => (
                                        <tr key={commission.id} className="hover:bg-gray-50 transition-colors duration-150">
                                            <td className="px-4 py-4 text-gray-900">
                                                {new Date(commission.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-4 py-4 text-green-600 font-semibold">
                                                ₹{parseNumberSafe(commission.commission_amount).toFixed(2)}
                                            </td>
                                            <td className="px-4 py-4 text-gray-700">
                                                {commission.description || 'No description'}
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};