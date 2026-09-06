'use client'
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bird, Archive, Store } from 'lucide-react';
import { fetchBatchClosures, fetchBatches } from '@/app/api/batches';
import BatchesTable from '../tables/batches';
import BatchClosureSummaryTable from '../tables/batch_closure_summary/batch_closure';
import LiveSellingModule from './live_selling_module';

const BatchesModule = () => {
    const [subTab, setSubTab] = useState<'Active' | 'LiveSelling' | 'Closures'>('Active');

    // Shared Loading/Form State
    const loading = false;
    const [showAddForm, setShowAddForm] = useState(false);

    // --- Data Fetching ---
    const { data: batches = [], isLoading: isBatchesLoading } = useQuery({
        queryKey: ["batches"],
        queryFn: fetchBatches,
        staleTime: 5 * 60 * 1000,
    });

    const { data: batchClosures = [], isLoading: isClosuresLoading } = useQuery({
        queryKey: ["batch_closures"],
        queryFn: fetchBatchClosures,
        staleTime: 5 * 60 * 1000,
    });

    return (
        <div className="space-y-6">
            {/* Inner Module Navigation */}
            <div className="flex flex-wrap items-center gap-4 border-b border-gray-200 pb-2">
                <button
                    onClick={() => setSubTab('Active')}
                    className={`flex items-center space-x-2 pb-2 px-1 text-sm font-medium transition-colors ${subTab === 'Active' ? 'border-b-2 border-green-600 text-green-600' : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    <Bird className="w-4 h-4" />
                    <span>Active Batches</span>
                </button>
                <button
                    onClick={() => setSubTab('LiveSelling')}
                    className={`flex items-center space-x-2 pb-2 px-1 text-sm font-medium transition-colors ${subTab === 'LiveSelling' ? 'border-b-2 border-green-600 text-green-600' : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    <Store className="w-4 h-4" />
                    <span>Live Selling</span>
                </button>
                <button
                    onClick={() => setSubTab('Closures')}
                    className={`flex items-center space-x-2 pb-2 px-1 text-sm font-medium transition-colors ${subTab === 'Closures' ? 'border-b-2 border-green-600 text-green-600' : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    <Archive className="w-4 h-4" />
                    <span>Batch Closures</span>
                </button>
            </div>

            {/* Content Area */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 min-h-[500px]">
                {subTab === 'Active' && (
                    <BatchesTable
                        batches={batches}
                        loading={loading || isBatchesLoading}
                    />
                )}

                {subTab === 'LiveSelling' && (
                    <LiveSellingModule />
                )}

                {subTab === 'Closures' && (
                    <BatchClosureSummaryTable
                        batchClosures={batchClosures}
                        batches={batches}
                        loading={loading || isClosuresLoading}
                        showAddForm={showAddForm}
                        setShowAddForm={setShowAddForm}
                    />
                )}
            </div>
        </div>
    );
};

export default BatchesModule;
