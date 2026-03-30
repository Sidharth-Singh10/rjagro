import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar, StickyNote, Plus, TrendingDown } from "lucide-react";
import { BirdCountHistory, BirdCountHistoryPayload } from '@/app/types/interfaces';
import { useTableSorting, TableConfigs } from '@/app/hooks/sorting';
import { handleAddBirdCountHistory } from '@/app/api/bird_count_history';
import { useQueryClient } from '@tanstack/react-query';
import SortableHeader from '@/app/components/tables/sortable_headers/header';
import AddBirdCountModal from './add';

interface BirdCountHistoryTableProps {
    historyData: BirdCountHistory[];
    loading: boolean;
    batchId: number;
}

const BirdCountHistoryTable: React.FC<BirdCountHistoryTableProps> = ({
    historyData,
    loading,
    batchId,
}) => {
    const { sortedData, requestSort, getSortIcon } = useTableSorting(
        historyData,
        { key: 'record_date', direction: 'desc' },
        TableConfigs.birdCountHistory.getValueFn
    );

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const queryClient = useQueryClient();

    const handleSaveRecord = async (payload: BirdCountHistoryPayload) => {
        await handleAddBirdCountHistory(
            payload,
            queryClient,
            setIsSubmitting,
            () => setIsModalOpen(false)
        );
    };

    return (
        <div className="bg-white rounded-lg shadow">

            <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50/50 rounded-t-lg">
                <h3 className="font-semibold text-gray-700">Daily Records</h3>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm"
                >
                    <Plus size={16} />
                    Add Record
                </button>
            </div>

            {/* Table Section */}
            <div className="overflow-x-auto">
                <table className="w-full min-w-[600px]">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <SortableHeader
                                columnKey="record_id"
                                requestSort={requestSort}
                                getSortIcon={getSortIcon}
                                isSortable={true}
                            >
                                Record ID
                            </SortableHeader>

                            <SortableHeader
                                columnKey="record_date"
                                requestSort={requestSort}
                                getSortIcon={getSortIcon}
                                isSortable={true}
                            >
                                Date
                            </SortableHeader>

                            <SortableHeader
                                columnKey="deaths"
                                requestSort={requestSort}
                                getSortIcon={getSortIcon}
                                isSortable={true}
                            >
                                Deaths
                            </SortableHeader>

                            <SortableHeader
                                columnKey="notes"
                                requestSort={requestSort}
                                getSortIcon={getSortIcon}
                                isSortable={true}
                            >
                                Notes
                            </SortableHeader>

                            <SortableHeader
                                columnKey="created_at"
                                requestSort={requestSort}
                                getSortIcon={getSortIcon}
                                isSortable={true}
                            >
                                Created At
                            </SortableHeader>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {loading ? (
                            <tr>
                                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                                    <div className="flex justify-center items-center gap-2">
                                        <div className="animate-spin h-4 w-4 border-2 border-blue-500 rounded-full border-t-transparent"></div>
                                        Loading bird count history...
                                    </div>
                                </td>
                            </tr>
                        ) : sortedData.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                                    No bird count history found for this batch.
                                </td>
                            </tr>
                        ) : (
                            sortedData.map((row) => (
                                <tr key={row.record_id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-2 sm:px-4 py-3 sm:py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        #{row.record_id}
                                    </td>

                                    <td className="px-2 sm:px-4 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-700">
                                        <div className="flex items-center gap-2">
                                            <Calendar size={16} className="text-gray-400" />
                                            {new Date(row.record_date).toLocaleDateString()}
                                        </div>
                                    </td>

                                    <td className="px-2 sm:px-4 py-3 sm:py-4 whitespace-nowrap text-sm font-medium text-red-600">
                                        <div className="flex items-center gap-2">
                                            {row.deaths > 0 && <TrendingDown size={14} />}
                                            {row.deaths}
                                        </div>
                                    </td>

                                    <td className="px-2 sm:px-4 py-3 sm:py-4 text-sm text-gray-600 max-w-xs truncate" title={row.notes}>
                                        <div className="flex items-center gap-2">
                                            {row.notes && <StickyNote size={14} className="text-gray-400 flex-shrink-0" />}
                                            <span className="truncate">{row.notes || "-"}</span>
                                        </div>
                                    </td>

                                    <td className="px-2 sm:px-4 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(row.created_at).toLocaleString()}
                                    </td>
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
                    <button className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm">1</button>
                    <button
                        disabled={true}
                        className="flex items-center gap-1 px-3 py-2 text-gray-500 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                        Next
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>

            <AddBirdCountModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleSaveRecord}
                isSubmitting={isSubmitting}
                batchId={batchId}
            />
        </div>
    );
};

export default BirdCountHistoryTable;