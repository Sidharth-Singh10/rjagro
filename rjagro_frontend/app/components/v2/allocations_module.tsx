'use client'
import React, { useEffect, useState } from 'react';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { ClipboardList, Boxes, ListTree } from 'lucide-react';
import { fetchBatchRequirements, handleAddBatchRequirement } from '@/app/api/batch_requirements';
import { fetchBatchAllocations } from '@/app/api/batch_allocations';
import { fetchAllocationLinesPage, handleAddBatchAllocationLine, handleDeleteBatchAllocationLine, ALLOCATION_LINES_PAGE_SIZE } from '@/app/api/batch_allocation_lines';
import { fetchBatches } from '@/app/api/batches';
import { fetchItems } from '@/app/api/items';
import { fetchStockReceiptsPage } from '@/app/api/stock_receipts';
import { BatchAllocationLinePayload, NewBatchAllocationLine, NewBatchRequirement } from '@/app/types/interfaces';
import BatchAllocationsTable from '../tables/batch_allocations';
import BatchAllocationLinesTable from '../tables/batch_allocation_line';
import BatchRequirementsTable from '../tables/batch_requirements/requirements';



const AllocationsModule = () => {
    const queryClient = useQueryClient();
    const [subTab, setSubTab] = useState<'Requirements' | 'Allocations' | 'Lines'>('Requirements');

    const [loading, setLoading] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);

    const { data: requirements = [], isLoading: isRequirementsLoading } = useQuery({
        queryKey: ["batch_requirements"],
        queryFn: fetchBatchRequirements,
        staleTime: 5 * 60 * 1000,
    });

    // Lines are paged; the tab fetches its own page on demand.
    const [linesPage, setLinesPage] = useState(1);

    // The allocations list is small and also feeds the Lines add form.
    const { data: allocations = [] } = useQuery({
        queryKey: ["batch_allocations"],
        queryFn: fetchBatchAllocations,
        staleTime: 5 * 60 * 1000,
    });

    const {
        data: linesData,
        isPending: isLinesPending,
        isFetching: isLinesFetching,
    } = useQuery({
        queryKey: ["batch_allocation_lines", "page", linesPage],
        queryFn: () => fetchAllocationLinesPage(linesPage, ALLOCATION_LINES_PAGE_SIZE),
        placeholderData: keepPreviousData,
        staleTime: 5 * 60 * 1000,
        enabled: subTab === 'Lines',
    });

    const allocationLines = linesData?.items ?? [];

    useEffect(() => {
        if (linesData && linesData.total_pages > 0 && linesPage > linesData.total_pages) {
            setLinesPage(linesData.total_pages);
        }
    }, [linesData, linesPage]);

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

    // ── Lot picker (on-demand, filtered to the allocation's requirement item) ──
    const [lotSearch, setLotSearch] = useState('');

    const selectedAllocation = allocations.find(
        a => a.allocation_id === Number(newAllocationLine.allocation_id)
    );
    const selectedRequirement = requirements.find(
        r => r.requirement_id === selectedAllocation?.requirement_id
    );
    const lotItemFilter = selectedRequirement?.item_code ?? '';

    const { data: lotsData, isFetching: isLotsFetching } = useQuery({
        queryKey: ['stock_receipts', 'picker', lotSearch, lotItemFilter],
        queryFn: () =>
            fetchStockReceiptsPage(1, 50, {
                search: lotSearch || undefined,
                itemCode: lotItemFilter || undefined,
                hasRemaining: true,
            }),
        enabled: subTab === 'Lines' && showAddForm,
        staleTime: 60 * 1000,
    });

    const lotReceipts = lotsData?.items ?? [];

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
                        loading={loading || isRequirementsLoading}
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
                        lots={lotReceipts}
                        lotsLoading={isLotsFetching}
                        onLotSearch={setLotSearch}
                        loading={loading}
                        tableLoading={isLinesPending}
                        refreshing={isLinesFetching && !isLinesPending}
                        page={linesPage}
                        pageSize={ALLOCATION_LINES_PAGE_SIZE}
                        totalCount={linesData?.total_count ?? 0}
                        totalPages={linesData?.total_pages ?? 0}
                        onPageChange={setLinesPage}
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