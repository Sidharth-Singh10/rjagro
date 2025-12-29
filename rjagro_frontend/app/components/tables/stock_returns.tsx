'use client'
import React, { useState } from 'react';
import { Filter, ChevronLeft, ChevronRight, Plus, X, Save, ArrowUp, ArrowDown, ArrowUpDown, Trash2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { TableConfigs, useTableSorting } from '@/app/hooks/sorting';
import TableActionsDropdown from '../utils/table_actions';
import { Batch, BatchAllocation, BatchAllocationLine, StockReturn } from '@/app/types/interfaces';

interface StockReturnsTableProps {
    stockReturns: StockReturn[];
    loading: boolean;
}
const StockReturnsTable: React.FC<StockReturnsTableProps> = ({
    stockReturns,
    loading,
}) => {

    const { sortedData, requestSort, getSortIcon } = useTableSorting(
        stockReturns,
        { key: 'return_date', direction: 'desc' },
        TableConfigs.stockReturns?.getValueFn || ((item: any, key: string) => item[key])
    );

    const queryClient = useQueryClient();
    const [openMenuId, setOpenMenuId] = useState<number | null>(null);

    const SortableHeader: React.FC<{
        columnKey: string;
        children: React.ReactNode;
        className?: string;
    }> = ({ columnKey, children, className = "" }) => {
        const IconComponent = getSortIcon(columnKey) === 'ArrowUp' ? ArrowUp :
            getSortIcon(columnKey) === 'ArrowDown' ? ArrowDown : ArrowUpDown;

        return (
            <th
                className={`px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors ${className}`}
                onClick={() => requestSort(columnKey)}
            >
                <div className="flex items-center justify-between group">
                    <span>{children}</span>
                    <IconComponent size={14} className="ml-1 text-gray-400 group-hover:text-gray-600 transition-colors" />
                </div>
            </th>
        );
    };

    return (
        <div className="bg-white rounded-lg shadow">
            <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-xl font-semibold text-gray-800">Stock Returns</h2>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <SortableHeader columnKey="return_id">Return ID</SortableHeader>
                            <SortableHeader columnKey="allocation_line_id">Line ID</SortableHeader>
                            <SortableHeader columnKey="batch_id">Batch ID</SortableHeader>
                            <SortableHeader columnKey="return_qty">Return Qty</SortableHeader>
                            <SortableHeader columnKey="unit_cost">Unit Cost</SortableHeader>
                            <SortableHeader columnKey="return_value">Return Value</SortableHeader>
                            <SortableHeader columnKey="return_date">Return Date</SortableHeader>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {loading ? (
                            <tr>
                                <td colSpan={12} className="px-4 py-8 text-center text-gray-500">
                                    Loading...
                                </td>
                            </tr>
                        ) : sortedData.length === 0 ? (
                            <tr>
                                <td colSpan={12} className="px-4 py-8 text-center text-gray-500">
                                    No stock returns found
                                </td>
                            </tr>
                        ) : (
                            sortedData.map((stockReturn) => (
                                <tr key={stockReturn.return_id} className="hover:bg-gray-50">
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {stockReturn.return_id}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {stockReturn.allocation_line_id}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {stockReturn.batch_id}
                                    </td>

                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {stockReturn.return_qty}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {stockReturn.unit_cost.toFixed(2)}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {stockReturn.return_value.toFixed(2)}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {stockReturn.return_date}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 relative">
                                        <TableActionsDropdown
                                            rowId={stockReturn.return_id}
                                            openMenuId={openMenuId}
                                            onMenuToggle={(id) => setOpenMenuId(typeof id === 'number' ? id : null)}
                                            actions={[
                                                {
                                                    label: 'Delete',
                                                    icon: <Trash2 size={14} />,
                                                    variant: 'danger',
                                                    onClick: () => {
                                                        const confirmed = window.confirm(`Delete stock return #${stockReturn.return_id}?`);
                                                        if (confirmed) {
                                                            console.log('Delete return:', stockReturn.return_id);
                                                        }
                                                    }
                                                }
                                            ]}
                                        />
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div className="flex items-center justify-between px-4 py-3 border-t">
                <div className="text-sm text-gray-500">
                    Showing {stockReturns.length} of {stockReturns.length} results
                </div>
                <div className="flex items-center gap-2">
                    <button className="flex items-center gap-1 px-3 py-2 text-gray-500 border border-gray-300 rounded-lg hover:bg-gray-50">
                        <ChevronLeft size={16} />
                        Previous
                    </button>
                    <button className="px-3 py-2 bg-blue-600 text-white rounded-lg">1</button>
                    <button className="flex items-center gap-1 px-3 py-2 text-gray-500 border border-gray-300 rounded-lg hover:bg-gray-50">
                        Next
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StockReturnsTable;