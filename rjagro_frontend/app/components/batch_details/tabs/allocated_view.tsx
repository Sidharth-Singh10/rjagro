import React from 'react';
import { ChevronLeft, ChevronRight, Filter, Calendar, Package } from "lucide-react";
import { AllocatedRequirement } from '@/app/types/interfaces';
import { formatINR } from '@/app/utils/helper';

interface AllocatedRequirementTableProps {
    allocations: AllocatedRequirement[];
    loading: boolean;
    isAdmin?: boolean;
}

const AllocatedRequirementTable: React.FC<AllocatedRequirementTableProps> = ({
    allocations,
    loading,
    isAdmin = false,
}) => {

    return (
        <div className="bg-white rounded-lg shadow">


            {/* Table Section */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Req ID
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Item Code
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Requested Qty
                            </th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                                {/* Visual separator arrow */}

                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Alloc ID
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Allocated Qty
                            </th>
                            {isAdmin && (
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Alloc Value
                                </th>
                            )}
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Alloc Date
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {loading ? (
                            <tr>
                                <td colSpan={isAdmin ? 8 : 7} className="px-4 py-8 text-center text-gray-500">
                                    <div className="flex justify-center items-center gap-2">
                                        <div className="animate-spin h-4 w-4 border-2 border-blue-500 rounded-full border-t-transparent"></div>
                                        Loading allocations...
                                    </div>
                                </td>
                            </tr>
                        ) : allocations.length === 0 ? (
                            <tr>
                                <td colSpan={isAdmin ? 8 : 7} className="px-4 py-8 text-center text-gray-500">
                                    No allocated requirements found for this batch.
                                </td>
                            </tr>
                        ) : (
                            allocations.map((row, index) => (
                                <tr key={`${row.requirement_id}-${row.allocation_id}`} className="hover:bg-gray-50 transition-colors">
                                    {/* Requirement Data */}
                                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        #{row.requirement_id}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                                        <div className="flex items-center gap-2">
                                            <Package size={16} className="text-gray-400" />
                                            {row.item_code}
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                                        {formatINR(row.requested_qty)}
                                    </td>

                                    {/* Visual Separator */}
                                    <td className="px-1 py-4 whitespace-nowrap text-center">
                                        <div className="border-l h-4 mx-auto border-gray-300"></div>
                                    </td>

                                    {/* Allocation Data */}
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                        #{row.allocation_id}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                                        {formatINR(row.allocated_qty)}
                                    </td>
                                    {isAdmin && (
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                                            {formatINR(row.allocated_value)}
                                        </td>
                                    )}
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <div className="flex items-center gap-2">
                                            <Calendar size={14} />
                                            {new Date(row.allocation_date).toLocaleDateString()}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Footer */}
            <div className="flex items-center justify-between px-4 py-3 border-t">
                <div className="text-sm text-gray-500">
                    Showing {allocations.length} results
                </div>
                <div className="flex items-center gap-2">
                    <button
                        disabled={true} // Add logic if you implement backend pagination
                        className="flex items-center gap-1 px-3 py-2 text-gray-500 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <ChevronLeft size={16} />
                        Previous
                    </button>
                    <button className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm">1</button>
                    <button
                        disabled={true}
                        className="flex items-center gap-1 px-3 py-2 text-gray-500 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Next
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AllocatedRequirementTable;