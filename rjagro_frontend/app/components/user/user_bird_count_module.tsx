'use client'
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchBatches } from '@/app/api/batches';
import { fetchBirdCountHistoryById } from '@/app/api/bird_count_history';
import BirdCountHistoryTable from '@/app/components/batch_details/tabs/bird_count_history/bird_count_history';
import { ChevronDown, Bird } from 'lucide-react';
import { Batch } from '@/app/types/interfaces';

const UserBirdCountModule = () => {
    const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);

    const { data: batches = [] } = useQuery({
        queryKey: ["batches"],
        queryFn: fetchBatches,
        staleTime: 5 * 60 * 1000,
    });

    useEffect(() => {
        if (batches.length > 0 && selectedBatchId === null) {
            const latestBatch = batches.reduce((prev: Batch, current: Batch) =>
                current.batch_id > prev.batch_id ? current : prev
            );
            setSelectedBatchId(latestBatch.batch_id);
        }
    }, [batches, selectedBatchId]);

    const { data: birdCountHistory = [], isLoading: isBirdCountLoading } = useQuery({
        queryKey: ["bird_count_history", selectedBatchId],
        queryFn: () => fetchBirdCountHistoryById(selectedBatchId!),
        enabled: !!selectedBatchId,
    });

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 min-h-[500px]">
                {/* Batch Selector Header */}
                <div className="p-4 border-b border-gray-200 bg-gray-50/50">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 rounded-lg">
                                <Bird size={20} className="text-green-600" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-800">Bird Count History</h3>
                                <p className="text-xs text-gray-500">Select a batch to view and add records</p>
                            </div>
                        </div>

                        <div className="relative">
                            <select
                                value={selectedBatchId || ''}
                                onChange={(e) => setSelectedBatchId(e.target.value ? Number(e.target.value) : null)}
                                className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2.5 pr-10 text-sm font-medium text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500 cursor-pointer min-w-[200px]"
                            >
                                <option value="">Select a batch...</option>
                                {batches.map((batch: Batch) => (
                                    <option key={batch.batch_id} value={batch.batch_id}>
                                        Batch #{batch.batch_id} - {batch.farmer_name} ({batch.status})
                                    </option>
                                ))}
                            </select>
                            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        </div>
                    </div>
                </div>

                <div className="p-0">
                    {!selectedBatchId ? (
                        <div className="flex flex-col items-center justify-center py-16 px-4">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                <Bird size={32} className="text-gray-400" />
                            </div>
                            <h4 className="text-lg font-medium text-gray-700 mb-2">No Batch Selected</h4>
                            <p className="text-sm text-gray-500 text-center max-w-sm">
                                Please select a batch from the dropdown above to view bird count history and add new records.
                            </p>
                        </div>
                    ) : (
                        <BirdCountHistoryTable
                            historyData={birdCountHistory}
                            loading={isBirdCountLoading}
                            batchId={selectedBatchId}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserBirdCountModule;
