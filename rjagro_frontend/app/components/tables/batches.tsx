'use client'
import React, { useMemo, useState } from 'react';
import { Plus, X, Save } from 'lucide-react';
import {
    Batch,
    BatchAllocation,
    BatchPayload,
    BatchRequirement,
    CreateFarmerCommission,
    Farmer,
    FarmerCommissionHistory,
    SupervisorSimplified,
    Item,
    BatchClosurePayload
} from '@/app/types/interfaces';
import { useAuth } from '@/app/hooks/useAuth';
import BatchDetailsModal from './modals/batches';
import { useBatchesSorting } from '@/app/hooks/custom_sorting';
import SortableHeader from './sortable_headers/header';

interface BatchesTableProps {
    batches: Batch[];
    farmers: Farmer[];
    supervisors: SupervisorSimplified[];
    items: Item[];
    batchAllocations: BatchAllocation[];
    requirements: BatchRequirement[];
    loading: boolean;
    showAddForm: boolean;
    newBatch: BatchPayload;
    setShowAddForm: (show: boolean) => void;
    setNewBatch: React.Dispatch<React.SetStateAction<BatchPayload>>;
    commissionHistory?: FarmerCommissionHistory[];
    onAddCommission?: (commission: CreateFarmerCommission) => Promise<void>;
    commissionLoading?: boolean;
    onCloseBatch?: (batchClosure: BatchClosurePayload) => Promise<void>;
    batchClosureLoading?: boolean;
    handleAddBatch: () => void;
}

const BatchesTable: React.FC<BatchesTableProps> = ({
    batches, farmers, supervisors, items,
    loading, showAddForm, newBatch,
    setShowAddForm, setNewBatch,
    handleAddBatch,
    batchAllocations,
    requirements,
    commissionHistory = [],
    onAddCommission,
    commissionLoading = false,
    onCloseBatch,
    batchClosureLoading = false,
}) => {
    const user = useAuth().user;
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);

    newBatch.created_by = user?.user_id ?? "";

    const { sortedData, requestSort, getSortIcon } = useBatchesSorting(batches);

    const calculateMortality = (initial: number, current: number): number => {
        if (initial === 0) return 0;
        return ((initial - current) / initial) * 100;
    };

    const chickItems = useMemo(() => {
        return items.filter(item =>
            item.item_category && item.item_category.toLowerCase().includes('chick')
        );
    }, [items]);

    const handleChickItemToggle = (itemCode: string) => {
        setNewBatch(prev => {
            const currentItems = prev.chick_item_code || [];
            const isSelected = currentItems.includes(itemCode);

            if (isSelected) {
                return {
                    ...prev,
                    chick_item_code: currentItems.filter(code => code !== itemCode)
                };
            } else {
                return {
                    ...prev,
                    chick_item_code: [...currentItems, itemCode]
                };
            }
        });
    };

    const openBatchModal = (batch: Batch) => {
        setSelectedBatch(batch);
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setSelectedBatch(null);
    };

    return (
        <div className="bg-white rounded-lg shadow">
            <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-xl font-semibold text-gray-800">Batches</h2>
                <button
                    onClick={() => setShowAddForm(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                    <Plus size={18} /> Add Batch
                </button>
            </div>

            {/* Add Batch Form */}
            {showAddForm && (
                <div className="p-4 border-b bg-gray-50">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-gray-800">Add New Batch</h3>
                        <button onClick={() => setShowAddForm(false)} className="text-gray-500 hover:text-gray-700">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-black">
                        {/* Supervisor Dropdown */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Supervisor *</label>
                            <select
                                value={newBatch.supervisor_id}
                                onChange={(e) => setNewBatch(prev => ({ ...prev, supervisor_id: Number(e.target.value) }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            >
                                <option value="">Select Supervisor</option>
                                {supervisors.map(s => (
                                    <option key={s.user_id} value={s.user_id}>{s.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Farmer Dropdown */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Farmer *</label>
                            <select
                                value={newBatch.farmer_id}
                                onChange={(e) => setNewBatch(prev => ({ ...prev, farmer_id: Number(e.target.value) }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            >
                                <option value="">Select Farmer</option>
                                {farmers.map(f => (
                                    <option key={f.farmer_id} value={f.farmer_id}>{f.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Line ID *</label>
                            <input
                                type="number"
                                value={newBatch.line_id}
                                onChange={(e) => setNewBatch(prev => ({ ...prev, line_id: Number(e.target.value) }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
                            <input
                                type="date"
                                value={newBatch.start_date}
                                onChange={(e) => setNewBatch(prev => ({
                                    ...prev,
                                    start_date: e.target.value,
                                    end_date: e.target.value
                                }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Initial Bird Count *</label>
                            <input
                                type="number"
                                value={newBatch.initial_bird_count}
                                onChange={(e) => setNewBatch(prev => ({
                                    ...prev,
                                    initial_bird_count: Number(e.target.value),
                                    current_bird_count: Number(e.target.value)
                                }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            />
                        </div>

                        {/* Chick Items Multiple Selection Dropdown */}
                        <div className="md:col-span-2 lg:col-span-3">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Select Chick Items
                            </label>
                            <div className="border border-gray-300 rounded-lg max-h-40 overflow-y-auto bg-white">
                                {chickItems.length === 0 ? (
                                    <div className="p-3 text-gray-500 text-sm">
                                        No chick items available
                                    </div>
                                ) : (
                                    <div className="p-2">
                                        {chickItems.map((item) => (
                                            <label
                                                key={item.item_code}
                                                className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={(newBatch.chick_item_code || []).includes(item.item_code)}
                                                    onChange={() => handleChickItemToggle(item.item_code)}
                                                    className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {item.item_name}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        Code: {item.item_code} | Unit: {item.unit}
                                                    </div>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>
                            {newBatch.chick_item_code && newBatch.chick_item_code.length > 0 && (
                                <div className="mt-2 text-sm text-gray-600">
                                    Selected items: {newBatch.chick_item_code.length}
                                </div>
                            )}
                        </div>

                        <div className="flex items-end md:col-span-2 lg:col-span-3">
                            <button
                                onClick={handleAddBatch}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                            >
                                <Save size={18} /> Save Batch
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <SortableHeader
                                columnKey="batch_id"
                                requestSort={requestSort}
                                getSortIcon={getSortIcon}
                                isSortable={true}
                            >
                                Batch ID
                            </SortableHeader>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Line ID
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Supervisor
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Farmer
                            </th>
                            <SortableHeader
                                columnKey="start_date"
                                requestSort={requestSort}
                                getSortIcon={getSortIcon}
                                isSortable={true}
                            >
                                Start Date
                            </SortableHeader>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Initial Chick Count
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Current Chick Count
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Mortality %
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Created At
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {loading ? (
                            <tr>
                                <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                                    Loading...
                                </td>
                            </tr>
                        ) : batches.length === 0 ? (
                            <tr>
                                <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                                    No batches found
                                </td>
                            </tr>
                        ) : (
                            sortedData.map((batch) => (
                                <tr key={batch.batch_id} className="hover:bg-gray-50" onDoubleClick={() => openBatchModal(batch)}>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {batch.batch_id}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {batch.line_id}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {batch.supervisor_name}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {batch.farmer_name}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {batch.start_date}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {batch.initial_bird_count}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {batch.current_bird_count}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                            calculateMortality(batch.initial_bird_count, batch.current_bird_count) > 10
                                                ? 'bg-red-100 text-red-800'
                                                : calculateMortality(batch.initial_bird_count, batch.current_bird_count) > 5
                                                ? 'bg-yellow-100 text-yellow-800'
                                                : 'bg-green-100 text-green-800'
                                        }`}>
                                            {calculateMortality(batch.initial_bird_count, batch.current_bird_count).toFixed(1)}%
                                        </span>
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${batch.status === 'Closed'
                                            ? 'bg-red-100 text-red-800'
                                            : 'bg-green-100 text-green-800'
                                            }`}>
                                            {batch.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {new Date(batch.created_at).toLocaleString()}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {selectedBatch && (
                <BatchDetailsModal
                    isOpen={modalOpen}
                    onClose={closeModal}
                    batch={selectedBatch}
                    batchAllocations={batchAllocations}
                    requirements={requirements}
                    commissionHistory={commissionHistory}
                    onAddCommission={onAddCommission}
                    commissionLoading={commissionLoading}
                    onCloseBatch={onCloseBatch}
                    batchClosureLoading={batchClosureLoading}
                />
            )}
        </div>
    );
};

export default BatchesTable;
