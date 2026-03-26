'use client'
import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ClipboardList, Boxes, ListTree } from 'lucide-react';
import { fetchBatchRequirements, handleAddBatchRequirement } from '@/app/api/batch_requirements';
import { fetchBatchAllocations } from '@/app/api/batch_allocations';
import { fetchBatchAllocationLines, handleAddBatchAllocationLine, handleDeleteBatchAllocationLine } from '@/app/api/batch_allocation_lines';
import { fetchBatches } from '@/app/api/batches';
import { fetchItems } from '@/app/api/items';
import { fetchStockReceipts } from '@/app/api/stock_receipts';
import { BatchAllocationLinePayload, NewBatchAllocationLine, NewBatchRequirement } from '@/app/types/interfaces';
import BatchAllocationsTable from '../tables/batch_allocations';
import BatchAllocationLinesTable from '../tables/batch_allocation_line';
import BatchRequirementsTable from '../tables/batch_requirements/requirements';



const AllocationsModule = () => {
    const queryClient = useQueryClient();
    const [subTab, setSubTab] = useState<'Requirements' | 'Allocations' | 'Lines'>('Requirements');

    const [loading, setLoading] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);

    const { data: requirements = [] } = useQuery({
        queryKey: ["batch_requirements"],
        queryFn: fetchBatchRequirements,
        staleTime: 5 * 60 * 1000,
    });

    const { data: allocations = [] } = useQuery({
        queryKey: ["batch_allocations"],
        queryFn: fetchBatchAllocations,
        staleTime: 5 * 60 * 1000,
    });

    const { data: allocationLines = [] } = useQuery({
        queryKey: ["batch_allocation_lines"],
        queryFn: fetchBatchAllocationLines,
        staleTime: 5 * 60 * 1000,
    });

    const { data: batches = [] } = useQuery({
        queryKey: ["batches"],
        queryFn: fetchBatches,
        staleTime: 5 * 60 * 1000,
    });

    const { data: items = [] } = useQuery({
        queryKey: ['items'],
        queryFn: fetchItems,
        staleTime: 5 * 60 * 1000,
    });

    const { data: stockReceipts = [] } = useQuery({
        queryKey: ['stock_receipts'],
        queryFn: fetchStockReceipts,
        staleTime: 5 * 60 * 1000,
    });

    const [newRequirement, setNewRequirement] = useState<NewBatchRequirement>({
        batch_id: '',
        item_code: '',
        quantity: ''
    });

    const onAddRequirement = () => {
        handleAddBatchRequirement(
            { ...newRequirement, line_id: 1, supervisor_id: 2 },
            queryClient, setLoading
        );
    };

    const [newAllocationLine, setNewAllocationLine] = useState<NewBatchAllocationLine>({
        allocation_id: '',
        lot_id: '',
        qty: '',
        unit_cost: ''
    });

    const onAddAllocationLine = () => {
        const finalAllocationLine: BatchAllocationLinePayload = {
            allocation_id: Number(newAllocationLine.allocation_id),
            lot_id: Number(newAllocationLine.lot_id),
            qty: Number(newAllocationLine.qty),
            unit_cost: Number(newAllocationLine.unit_cost),
            line_value: Number(newAllocationLine.qty) * Number(newAllocationLine.unit_cost)
        };
        handleAddBatchAllocationLine(finalAllocationLine, queryClient, setLoading);
    };

    const onDeleteAllocationLine = (id: number) => {
        handleDeleteBatchAllocationLine(id, queryClient);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-4 border-b border-gray-200 pb-2">
                <button
                    onClick={() => { setSubTab('Requirements'); setShowAddForm(false); }}
                    className={`flex items-center space-x-2 pb-2 px-1 text-sm font-medium transition-colors ${subTab === 'Requirements' ? 'border-b-2 border-green-600 text-green-600' : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    <ClipboardList className="w-4 h-4" />
                    <span>Requirements</span>
                </button>
                <button
                    onClick={() => { setSubTab('Allocations'); setShowAddForm(false); }}
                    className={`flex items-center space-x-2 pb-2 px-1 text-sm font-medium transition-colors ${subTab === 'Allocations' ? 'border-b-2 border-green-600 text-green-600' : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    <Boxes className="w-4 h-4" />
                    <span>Allocations</span>
                </button>
                <button
                    onClick={() => { setSubTab('Lines'); setShowAddForm(false); }}
                    className={`flex items-center space-x-2 pb-2 px-1 text-sm font-medium transition-colors ${subTab === 'Lines' ? 'border-b-2 border-green-600 text-green-600' : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    <ListTree className="w-4 h-4" />
                    <span>Allocation Lines</span>
                </button>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-100 min-h-[500px]">
                {subTab === 'Requirements' && (
                    <BatchRequirementsTable
                        requirements={requirements}
                        batches={batches}
                        items={items}
                        loading={loading}
                        showAddForm={showAddForm}
                        newRequirement={newRequirement}
                        setShowAddForm={setShowAddForm}
                        setNewRequirement={setNewRequirement}
                        handleAddRequirement={onAddRequirement}
                    />
                )}

                {subTab === 'Allocations' && (
                    <BatchAllocationsTable
                        batchAllocations={allocations}
                        loading={loading}
                        showAddForm={showAddForm}
                        setShowAddForm={setShowAddForm}
                    />
                )}

                {subTab === 'Lines' && (
                    <BatchAllocationLinesTable
                        allocationLines={allocationLines}
                        batchAllocations={allocations}
                        stockReceipts={stockReceipts}
                        loading={loading}
                        showAddForm={showAddForm}
                        newAllocationLine={newAllocationLine}
                        setShowAddForm={setShowAddForm}
                        setNewAllocationLine={setNewAllocationLine}
                        handleAddAllocationLine={onAddAllocationLine}
                        handleDeleteAllocationLine={onDeleteAllocationLine}
                    />
                )}
            </div>
        </div>
    );
};

export default AllocationsModule;