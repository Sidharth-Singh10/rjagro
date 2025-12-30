'use client'
import React, { useState, useEffect } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from "react-toastify";
import { Batch, Item, StockReturnPayload } from '@/app/types/interfaces';
import { fetchStockReturnUnitCost, handleAddStockReturn } from '@/app/api/stock_returns';

interface StockReturnFormProps {
    onClose: () => void;
    onSuccess?: () => void;
    items: Item[];
    batches: Batch[];
}

const StockReturnForm: React.FC<StockReturnFormProps> = ({
    onClose,
    onSuccess,
    items,
    batches
}) => {
    const queryClient = useQueryClient();
    const [loading, setLoading] = useState(false);
    const [fetchingCost, setFetchingCost] = useState(false);


    const [selectedItemCode, setSelectedItemCode] = useState<string>('');

    const [newReturn, setNewReturn] = useState<StockReturnPayload>({
        allocation_line_id: 0,
        batch_id: 0,
        return_qty: 0,
        unit_cost: 0,
        return_value: 0,
        return_date: new Date().toISOString().split('T')[0] // Default to today
    });

    // Effect: Auto-fetch Unit Cost and Allocation Line ID
    useEffect(() => {
        const fetchCostData = async () => {
            if (newReturn.batch_id && selectedItemCode) {
                setFetchingCost(true);
                try {
                    const data = await fetchStockReturnUnitCost(newReturn.batch_id, selectedItemCode);

                    setNewReturn(prev => ({
                        ...prev,
                        allocation_line_id: data.allocation_line_id,
                        unit_cost: data.unit_cost,
                        return_value: Number((prev.return_qty * data.unit_cost).toFixed(2))
                    }));
                } catch (error) {
                    toast.error("Failed to fetch batch cost details");
                    console.error(error);
                    // Reset cost related fields on error
                    setNewReturn(prev => ({ ...prev, allocation_line_id: 0, unit_cost: 0, return_value: 0 }));
                } finally {
                    setFetchingCost(false);
                }
            }
        };

        fetchCostData();
    }, [newReturn.batch_id, selectedItemCode]);

    // Handler for Quantity Change (Recalculates Value)
    const handleQuantityChange = (qty: number) => {
        setNewReturn(prev => ({
            ...prev,
            return_qty: qty,
            return_value: Number((qty * prev.unit_cost).toFixed(2))
        }));
    };

    const handleSubmit = async () => {
        await handleAddStockReturn(
            newReturn,
            queryClient,
            setLoading,
            () => {
                if (onSuccess) onSuccess();
                onClose();
            }
        );
    };

    return (
        <div className="p-4 border-b bg-gray-50 mb-4 rounded-lg shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-800">Add Stock Return</h3>
                <button
                    onClick={onClose}
                    className="text-gray-500 hover:text-gray-700"
                >
                    <X size={20} />
                </button>
            </div>

            <div className="grid grid-cols-1 text-black md:grid-cols-2 lg:grid-cols-3 gap-4">

                {/* Batch Selection */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Batch *
                    </label>
                    <select
                        value={newReturn.batch_id || ''}
                        onChange={(e) => setNewReturn(prev => ({ ...prev, batch_id: Number(e.target.value) }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="">Select Batch</option>
                        {batches.map((batch) => (
                            <option key={batch.batch_id} value={batch.batch_id}>
                                ID: {batch.batch_id} - {batch.farmer_name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Item Selection (Used for fetching cost) */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Item Code *
                    </label>
                    <select
                        value={selectedItemCode}
                        onChange={(e) => setSelectedItemCode(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="">Select Item</option>
                        {items.map((item) => (
                            <option key={item.item_code} value={item.item_code}>
                                {item.item_code} - {item.item_name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Return Date */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Return Date *
                    </label>
                    <input
                        type="date"
                        value={newReturn.return_date}
                        onChange={(e) => setNewReturn(prev => ({ ...prev, return_date: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>

                {/* Unit Cost (Auto-filled) */}
                <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Unit Cost
                        {fetchingCost && <Loader2 size={12} className="inline ml-2 animate-spin text-blue-500" />}
                    </label>
                    <input
                        type="number"
                        value={newReturn.unit_cost || ''}
                        readOnly
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                        placeholder="Auto-fetched"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        Fetched based on Batch & Item
                    </p>
                </div>

                {/* Quantity */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Return Quantity *
                    </label>
                    <input
                        type="number"
                        value={newReturn.return_qty || ''}
                        onChange={(e) => handleQuantityChange(e.target.value ? parseFloat(e.target.value) : 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="0"
                        min="0.01"
                        step="0.01"
                    />
                </div>

                {/* Return Value (Auto-calculated) */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Total Return Value
                    </label>
                    <input
                        type="number"
                        value={newReturn.return_value}
                        readOnly
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-800 font-medium"
                    />
                </div>

                {/* Debug Info / Hidden Field Confirmation (Optional, helps visual debugging) */}
                <div className="lg:col-span-3 flex items-end justify-between border-t pt-4 mt-2">
                    <div className="text-xs text-gray-400">
                        {newReturn.allocation_line_id ?
                            `Linked to Allocation Line ID: ${newReturn.allocation_line_id}` :
                            "Waiting for valid Batch & Item selection..."
                        }
                    </div>

                    <button
                        onClick={handleSubmit}
                        disabled={
                            loading ||
                            !newReturn.batch_id ||
                            !selectedItemCode ||
                            !newReturn.return_qty ||
                            !newReturn.allocation_line_id
                        }
                        className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                        Process Return
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StockReturnForm;