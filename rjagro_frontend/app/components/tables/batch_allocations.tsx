import React from 'react';
import { Inbox,  Edit, Filter, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { BatchAllocation } from '@/app/types/interfaces';
import { useBatchAllocationSorting } from '@/app/hooks/custom_sorting';
import SortableHeader from './sortable_headers/header';

interface BatchAllocationsTableProps {
    batchAllocations: BatchAllocation[];
    loading: boolean;
    showAddForm: boolean;
    setShowAddForm: (show: boolean) => void;
}

const BatchAllocationsTable: React.FC<BatchAllocationsTableProps> = ({
    batchAllocations,
    loading,
    // showAddForm,
    setShowAddForm,
}) => {
    const { sortedData, requestSort, getSortIcon } = useBatchAllocationSorting(batchAllocations);

    return (
        <div className="bg-white rounded-lg shadow">
            <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-xl font-semibold text-gray-800">Batch Allocations</h2>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowAddForm(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                        <Plus size={18} />
                        Add Allocation
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                        <Filter size={18} />
                        Filters
                    </button>
                </div>
            </div>



            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <SortableHeader
                                columnKey="alloc_id"
                                requestSort={requestSort}
                                getSortIcon={getSortIcon}
                                isSortable={true}
                            >
                                Allocation ID
                            </SortableHeader>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Requirement ID
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Allocated Quantity
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Allocated Value
                            </th>
                            <SortableHeader
                                columnKey="alloc_date"
                                requestSort={requestSort}
                                getSortIcon={getSortIcon}
                                isSortable={true}
                            >
                                Allocation Date
                            </SortableHeader>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Allocated By
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {loading ? (
                            <tr>
                                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">Loading...</td>
                            </tr>
                        ) : batchAllocations.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-4 py-12 text-center">
                                    <Inbox className="w-8 h-8 text-gray-300 mx-auto mb-2" aria-hidden />
                                    <p className="text-sm text-gray-500">No batch allocations found</p>
                                </td>
                            </tr>
                        ) : (
                            sortedData.map((allocation) => (
                                <tr key={allocation.allocation_id} className="hover:bg-gray-50">
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {allocation.allocation_id}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {allocation.requirement_id}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {allocation.allocated_qty}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {allocation.allocated_value}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {allocation.allocation_date}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {allocation.allocated_by}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <button className="text-green-600 hover:text-green-700">
                                            <Edit size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div className="flex items-center justify-between px-4 py-3 border-t">
                <div className="text-sm text-gray-500">
                    Showing {batchAllocations.length} of {batchAllocations.length} results
                </div>
                <div className="flex items-center gap-2">
                    <button disabled className="flex items-center gap-1 px-3 py-2 text-gray-500 border border-gray-300 rounded-lg cursor-not-allowed opacity-40">
                        <ChevronLeft size={16} />
                        Previous
                    </button>
                    <span className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium" aria-current="page">1</span>
                    <button disabled className="flex items-center gap-1 px-3 py-2 text-gray-500 border border-gray-300 rounded-lg cursor-not-allowed opacity-40">
                        Next
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>
        </div>
    )
};

export default BatchAllocationsTable;