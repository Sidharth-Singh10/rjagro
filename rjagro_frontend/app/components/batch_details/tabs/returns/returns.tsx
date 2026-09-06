import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Package, Plus, FileText } from "lucide-react";
import { Item, StockReturn, StockReturnPayload } from '@/app/types/interfaces';
import { useTableSorting } from '@/app/hooks/sorting';
import { handleAddStockReturn } from '@/app/api/stock_returns';
import { useQueryClient } from '@tanstack/react-query';
import SortableHeader from '@/app/components/tables/sortable_headers/header';
import AddStockReturnModal from './add';

interface StockReturnsTableProps {
    stockReturns: StockReturn[];
    items: Item[];
    loading: boolean;
    batchId: number;
    isAdmin?: boolean;
}

const StockReturnsTable: React.FC<StockReturnsTableProps> = ({
    stockReturns,
    items,
    loading,
    batchId,
    isAdmin = false,
}) => {
    const { sortedData, requestSort, getSortIcon } = useTableSorting(
        stockReturns,
        { key: 'return_date', direction: 'desc' },
        (item: any, key: string) => item[key]
    );

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const queryClient = useQueryClient();

    const handleSaveRecord = async (payload: StockReturnPayload) => {
        await handleAddStockReturn(
            payload,
            queryClient,
            setIsSubmitting,
            () => setIsModalOpen(false)
        );
    };

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);

    return (
        <div className="bg-white rounded-lg shadow">

            <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50/50 rounded-t-lg">
                <h3 className="font-semibold text-gray-700">Stock Returns</h3>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium shadow-sm"
                >
                    <Plus size={16} />
                    Add Return
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full min-w-[500px]">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <SortableHeader columnKey="return_id" requestSort={requestSort} getSortIcon={getSortIcon} isSortable={true}>
                                ID
                            </SortableHeader>

                            <SortableHeader columnKey="return_date" requestSort={requestSort} getSortIcon={getSortIcon} isSortable={true}>
                                Date
                            </SortableHeader>

                            <SortableHeader columnKey="allocation_line_id" requestSort={requestSort} getSortIcon={getSortIcon} isSortable={true}>
                                Allocation Ref
                            </SortableHeader>

                            <SortableHeader columnKey="return_qty" requestSort={requestSort} getSortIcon={getSortIcon} isSortable={true}>
                                Qty
                            </SortableHeader>

                            {isAdmin && (
                                <SortableHeader columnKey="unit_cost" requestSort={requestSort} getSortIcon={getSortIcon} isSortable={true}>
                                    Unit Cost
                                </SortableHeader>
                            )}

                            {isAdmin && (
                                <SortableHeader columnKey="return_value" requestSort={requestSort} getSortIcon={getSortIcon} isSortable={true}>
                                    Total Value
                                </SortableHeader>
                            )}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {loading ? (
                            <tr>
                                <td colSpan={isAdmin ? 6 : 4} className="px-4 py-8 text-center text-gray-500">
                                    <div className="flex justify-center items-center gap-2">
                                        <div className="animate-spin h-4 w-4 border-2 border-green-600 rounded-full border-t-transparent"></div>
                                        Loading stock returns...
                                    </div>
                                </td>
                            </tr>
                        ) : sortedData.length === 0 ? (
                            <tr>
                                <td colSpan={isAdmin ? 6 : 4} className="px-4 py-8 text-center text-gray-500">
                                    No stock returns found for this batch.
                                </td>
                            </tr>
                        ) : (
                            sortedData.map((row) => (
                                <tr key={row.return_id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-2 sm:px-4 py-3 sm:py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        #{row.return_id}
                                    </td>

                                    <td className="px-2 sm:px-4 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-700">
                                        <div className="flex items-center gap-2">
                                            <Calendar size={16} className="text-gray-400" />
                                            {new Date(row.return_date).toLocaleDateString()}
                                        </div>
                                    </td>

                                    <td className="px-2 sm:px-4 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-600">
                                        <div className="flex items-center gap-2">
                                            <FileText size={16} className="text-gray-400" />
                                            #{row.allocation_line_id}
                                        </div>
                                    </td>

                                    <td className="px-2 sm:px-4 py-3 sm:py-4 whitespace-nowrap text-sm font-medium text-gray-700">
                                        <div className="flex items-center gap-2">
                                            <Package size={16} className="text-gray-400" />
                                            {row.return_qty}
                                        </div>
                                    </td>

                                    {isAdmin && (
                                        <td className="px-2 sm:px-4 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-600">
                                            {formatCurrency(Number(row.unit_cost))}
                                        </td>
                                    )}

                                    {isAdmin && (
                                        <td className="px-2 sm:px-4 py-3 sm:py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                                            {formatCurrency(Number(row.return_value))}
                                        </td>
                                    )}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-4 py-3 border-t">
                <div className="text-sm text-gray-500">
                    Showing {sortedData.length} results
                </div>
                <div className="flex items-center gap-2">
                    <button
                        disabled={true}
                        className="flex items-center gap-1 px-3 py-2 text-gray-500 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                        <ChevronLeft size={16} />
                        Previous
                    </button>
                    <span className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium" aria-current="page">1</span>
                    <button
                        disabled={true}
                        className="flex items-center gap-1 px-3 py-2 text-gray-500 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                        Next
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>

            <AddStockReturnModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleSaveRecord}
                isSubmitting={isSubmitting}
                batchId={batchId}
                items={items}
            />
        </div>
    );
};

export default StockReturnsTable;