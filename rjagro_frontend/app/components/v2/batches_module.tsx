'use client'
import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bird, Archive } from 'lucide-react';
import { fetchBatchClosures, fetchBatches, handleAddBatch} from '@/app/api/batches';
import { fetchFarmers } from '@/app/api/farmers';
import { fetchSupervisors } from '@/app/api/supervisors';
import { fetchItems } from '@/app/api/items';
import { BatchPayload } from '@/app/types/interfaces';
import BatchesTable from '../tables/batches';
import BatchClosureSummaryTable from '../tables/batch_closure_summary/batch_closure';

const BatchesModule = () => {
    const queryClient = useQueryClient();
    const [subTab, setSubTab] = useState<'Active' | 'Closures'>('Active');

    // Shared Loading/Form State
    const [loading, setLoading] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);

    // --- Data Fetching ---
    const { data: batches = [] } = useQuery({
        queryKey: ["batches"],
        queryFn: fetchBatches,
        staleTime: 5 * 60 * 1000,
    });

    const { data: batchClosures = [] } = useQuery({
        queryKey: ["batch_closures"],
        queryFn: fetchBatchClosures,
        staleTime: 5 * 60 * 1000,
    });

    // Dependencies for Batches Table
    const { data: farmers = [] } = useQuery({
        queryKey: ["farmers"],
        queryFn: fetchFarmers,
        staleTime: 5 * 60 * 1000,
    });

    const { data: supervisors = [] } = useQuery({
        queryKey: ['supervisors'],
        queryFn: fetchSupervisors,
        staleTime: 5 * 60 * 1000,
    });

    const { data: items = [] } = useQuery({
        queryKey: ['items'],
        queryFn: fetchItems,
        staleTime: 5 * 60 * 1000,
    });

    // --- STATE: New Batch ---
    const [newBatch, setNewBatch] = useState<BatchPayload>({
        line_id: '',
        supervisor_id: '',
        farmer_id: '',
        start_date: new Date().toISOString().slice(0, 10),
        end_date: new Date().toISOString().slice(0, 10),
        initial_bird_count: '',
        current_bird_count: '',
        chick_item_code: [],
        created_by: '',
    });

    // --- Handlers ---
    const onAddBatch = () => {
        handleAddBatch(newBatch, queryClient, setLoading);
    };

    return (
        <div className="space-y-6">
            {/* Inner Module Navigation */}
            <div className="flex flex-wrap items-center gap-4 border-b border-gray-200 pb-2">
                <button
                    onClick={() => { setSubTab('Active'); setShowAddForm(false); }}
                    className={`flex items-center space-x-2 pb-2 px-1 text-sm font-medium transition-colors ${subTab === 'Active' ? 'border-b-2 border-green-600 text-green-600' : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    <Bird className="w-4 h-4" />
                    <span>Active Batches</span>
                </button>
                <button
                    onClick={() => { setSubTab('Closures'); setShowAddForm(false); }}
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
                        farmers={farmers}
                        supervisors={supervisors}
                        items={items}
                        loading={loading}
                        showAddForm={showAddForm}
                        newBatch={newBatch}
                        setShowAddForm={setShowAddForm}
                        setNewBatch={setNewBatch}
                        handleAddBatch={onAddBatch}
                    />
                )}

                {subTab === 'Closures' && (
                    <BatchClosureSummaryTable
                        batchClosures={batchClosures}
                        batches={batches}
                        loading={loading}
                        showAddForm={showAddForm}
                        setShowAddForm={setShowAddForm}
                    />
                )}
            </div>
        </div>
    );
};

export default BatchesModule;
