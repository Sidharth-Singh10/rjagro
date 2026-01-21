import React from 'react';
import { X, Save } from 'lucide-react';
import { Batch, Farmer, Item, NewBatchRequirement, ProductionLine, SupervisorSimplified } from '@/app/types/interfaces';

interface BatchRequirementFormProps {
    batches: Batch[];
    lines: ProductionLine[];
    farmers: Farmer[];
    supervisors: SupervisorSimplified[];
    items: Item[];
    newRequirement: NewBatchRequirement;
    setNewRequirement: React.Dispatch<React.SetStateAction<NewBatchRequirement>>;
    onSave: () => void;
    onCancel: () => void;
}

export const BatchRequirementForm: React.FC<BatchRequirementFormProps> = ({
    batches, lines, farmers, supervisors, items,
    newRequirement, setNewRequirement, onSave, onCancel
}) => {
    return (
        <div className="p-4 border-b bg-gray-50">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-800">Add New Requirement</h3>
                <button onClick={onCancel} className="text-gray-500 hover:text-gray-700">
                    <X size={20} />
                </button>
            </div>

            <div className="grid grid-cols-1 text-black md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Batch *</label>
                    <select
                        value={newRequirement.batch_id}
                        onChange={(e) => setNewRequirement(prev => ({ ...prev, batch_id: parseInt(e.target.value) }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    >
                        <option value="">Select Batch</option>
                        {batches.map(b => <option key={b.batch_id} value={b.batch_id}>Batch {b.batch_id}</option>)}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Line *</label>
                    <select
                        value={newRequirement.line_id}
                        onChange={(e) => setNewRequirement(prev => ({ ...prev, line_id: parseInt(e.target.value) }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    >
                        <option value="">Select Line</option>
                        {lines.map(l => <option key={l.line_id} value={l.line_id}>{l.line_name}</option>)}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Supervisor *</label>
                    <select
                        value={newRequirement.supervisor_id}
                        onChange={(e) => setNewRequirement(prev => ({ ...prev, supervisor_id: parseInt(e.target.value) }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    >
                        <option value="">Select Supervisor</option>
                        {supervisors.map(s => <option key={s.user_id} value={s.user_id}>{s.name}</option>)}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Farmer *</label>
                    <select
                        value={newRequirement.farmer_id}
                        onChange={(e) => setNewRequirement(prev => ({ ...prev, farmer_id: parseInt(e.target.value) }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    >
                        <option value="">Select Farmer</option>
                        {farmers.map(f => <option key={f.farmer_id} value={f.farmer_id}>{f.name}</option>)}
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