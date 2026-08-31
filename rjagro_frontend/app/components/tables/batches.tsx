'use client'
import React from 'react';
import { ChevronRight } from 'lucide-react';
import { Batch } from '@/app/types/interfaces';
import { useBatchesSorting } from '@/app/hooks/custom_sorting';
import SortableHeader from './sortable_headers/header';
import Link from 'next/link';

interface BatchesTableProps {
    batches: Batch[];
    loading: boolean;
}

const BatchesTable: React.FC<BatchesTableProps> = ({
    batches,
    loading,
}) => {
    const { sortedData, requestSort, getSortIcon } = useBatchesSorting(batches);

    const calculateMortality = (initial: number, current: number): number => {
        if (initial === 0) return 0;
        return ((initial - current) / initial) * 100;
    };

    const calculateDaysRunning = (startDate: string, endDate: string, status: string): number => {
        const start = new Date(startDate);
        const end = status === 'Closed' ? new Date(endDate) : new Date();
        return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    };

    return (
        <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b">
                <h2 className="text-xl font-semibold text-gray-800">Batches</h2>
            </div>

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
                                Days Running
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
                                <tr key={batch.batch_id} className="group relative border-b border-gray-100 hover:bg-green-50/40 hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)] transition-all duration-300 ease-in-out cursor-pointer" >
                                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 relative overflow-hidden">
                                        <div className="flex items-center gap-2 group">
                                            <span>#{batch.batch_id}</span>

                                            {/* Sliding CTA Badge */}
                                            <Link
                                                href={`/dashboard/batches/${batch.batch_id}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="
      opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0
      transition-all duration-300 delay-75 ease-out
      flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-100/80 px-2 py-0.5 rounded-full
                                "
                                            >
                                                View
                                                <ChevronRight size={12} className="text-green-600" />
                                            </Link>
                                        </div>
                                        {/* Subtle green accent bar on the left edge */}
                                        <div className="absolute left-0 top-0 h-full w-1 bg-green-500 transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300"></div>
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
                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${calculateMortality(batch.initial_bird_count, batch.current_bird_count) > 10
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
                                        {calculateDaysRunning(batch.start_date, batch.end_date, batch.status)} days
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default BatchesTable;