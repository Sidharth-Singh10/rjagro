import React from 'react';
import { X, Save } from 'lucide-react';
import { Batch, Item, NewBatchRequirement } from '@/app/types/interfaces';

interface BatchRequirementFormProps {
    batches: Batch[];
    items: Item[];
    newRequirement: NewBatchRequirement;
    setNewRequirement: React.Dispatch<React.SetStateAction<NewBatchRequirement>>;
    onSave: () => void;
    onCancel: () => void;
}

export const BatchRequirementForm: React.FC<BatchRequirementFormProps> = ({
    batches, items,
    newRequirement, setNewRequirement, onSave, onCancel
}) => {
    const openBatches = batches
        .filter(b => b.status !== "Closed")
        .sort((a, b) => b.batch_id - a.batch_id);

    return (
        <div className="p-4 border-b bg-gray-50">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-800">Add New Requirement</h3>
                <button onClick={onCancel} className="text-gray-500 hover:text-gray-700">
                    <X size={20} />
                </button>
            </div>

            <div className="grid grid-cols-1 text-gray-900 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Batch *</label>
                    <select
                        value={newRequirement.batch_id}
                        onChange={(e) => setNewRequirement(prev => ({ ...prev, batch_id: parseInt(e.target.value) }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    >
                        <option value="">Select Batch</option>
                        {openBatches.map(b => <option key={b.batch_id} value={b.batch_id}>Batch {b.batch_id} - {b.farmer_name}</option>)}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Item *</label>
                    <select
                        value={newRequirement.item_code}
                        onChange={(e) => setNewRequirement(prev => ({ ...prev, item_code: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    >
                        <option value="">Select Item</option>
                        {items.map(i => <option key={i.item_code} value={i.item_code}>{i.item_code} - {i.item_name}</option>)}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
                    <input
                        type="number"
                        value={newRequirement.quantity}
                        onChange={(e) => setNewRequirement(prev => ({ ...prev, quantity: parseInt(e.target.value) }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                </div>

                <div className="flex items-end">
                    <button onClick={onSave} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                        <Save size={18} /> Save Requirement
                    </button>
                </div>
            </div>
        </div>
    );
};
