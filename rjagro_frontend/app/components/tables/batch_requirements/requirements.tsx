'use client';
import React, { useState, useMemo } from 'react';
import { Plus } from 'lucide-react';
import { handleApproveRequirement, handleRejectRequirement } from '@/app/api/batch_requirements';
import { useAuth } from '@/app/hooks/useAuth';
import { Batch, BatchRequirement, Item, NewBatchRequirement, ProductionLine, SupervisorSimplified } from '@/app/types/interfaces';
import { useBatchRequirementSorting } from '@/app/hooks/custom_sorting';
import { BatchRequirementForm } from './add_form';
import { BatchRequirementsList } from './list';
import { ApproveRequirementModal } from './approve_modal';
import { RejectRequirementModal } from './reject_modal';



interface BatchRequirementsProps {
    requirements: BatchRequirement[];
    batches: Batch[];
    lines: ProductionLine[];
    supervisors: SupervisorSimplified[];
    items: Item[];
    loading: boolean;
    showAddForm: boolean;
    newRequirement: NewBatchRequirement;
    setShowAddForm: (show: boolean) => void;
    setNewRequirement: React.Dispatch<React.SetStateAction<NewBatchRequirement>>;
    handleAddRequirement: () => void;
}

const BatchRequirementsTable: React.FC<BatchRequirementsProps> = ({
    requirements, batches, lines, supervisors, items, loading,
    showAddForm, newRequirement, setShowAddForm, setNewRequirement, handleAddRequirement,
}) => {
    const [approveModalRequirement, setApproveModalRequirement] = useState<BatchRequirement | null>(null);
    const [rejectModalRequirement, setRejectModalRequirement] = useState<BatchRequirement | null>(null);
    const [processingRequirement, setProcessingRequirement] = useState<number | null>(null);
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const { user } = useAuth();

    const isAdmin = user?.role === 'Admin';

    // --- Filtering Logic ---
    const filteredAndSortedRequirements = useMemo(() => {
        let filtered = requirements;
        if (statusFilter !== 'all') {
            filtered = requirements.filter(r => r.status?.toLowerCase() === statusFilter.toLowerCase());
        }
        return [...filtered].sort((a, b) => {
            const aStatus = a.status?.toLowerCase();
            const bStatus = b.status?.toLowerCase();
            if (aStatus === 'pending' && bStatus !== 'pending') return -1;
            if (bStatus === 'pending' && aStatus !== 'pending') return 1;
            return new Date(b.request_date).getTime() - new Date(a.request_date).getTime();
        });
    }, [requirements, statusFilter]);

    const { sortedData, requestSort, getSortIcon } = useBatchRequirementSorting(filteredAndSortedRequirements);

    const availableStatuses = useMemo(() => {
        return [...new Set(requirements.map(r => r.status?.toLowerCase()).filter(Boolean))].sort();
    }, [requirements]);

    // --- Handlers ---
    const handleApproveConfirm = async (req: BatchRequirement, qty: number) => {
        setProcessingRequirement(req.requirement_id);
        try {
            await handleApproveRequirement(req, qty);
            setApproveModalRequirement(null);
        } finally {
            setProcessingRequirement(null);
        }
    };

    const handleRejectConfirm = async (id: number) => {
        setProcessingRequirement(id);
        try {
            await handleRejectRequirement(id);
            setRejectModalRequirement(null);
        } finally {
            setProcessingRequirement(null);
        }
    };

    return (
        <div className="bg-white rounded-lg shadow">
            {/* Header & Filter Toolbar */}
            <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-semibold text-gray-800">Batch Requirements</h2>
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-medium text-gray-700">Filter by Status:</label>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 bg-white"
                        >
                            <option value="all">All Status</option>
                            {availableStatuses.map(status => (
                                <option key={status} value={status}>
                                    {status.charAt(0).toUpperCase() + status.slice(1)}
                                </option>
                            ))}
                        </select>
                    </div>
                    {statusFilter !== 'all' && (
                        <span className="text-sm text-gray-500">
                            ({filteredAndSortedRequirements.length} of {requirements.length} requirements)
                        </span>
                    )}
                </div>
                <button
                    onClick={() => setShowAddForm(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                    <Plus size={18} /> Add Requirement
                </button>
            </div>

            {/* Add Form */}
            {showAddForm && (
                <BatchRequirementForm
                    batches={batches}
                    lines={lines}
                    supervisors={supervisors}
                    items={items}
                    newRequirement={newRequirement}
                    setNewRequirement={setNewRequirement}
                    onSave={handleAddRequirement}
                    onCancel={() => setShowAddForm(false)}
                />
            )}

            {/* Main Table */}
            <BatchRequirementsList
                data={sortedData}
                loading={loading}
                isAdmin={isAdmin}
                processingId={processingRequirement}
                requestSort={requestSort}
                getSortIcon={getSortIcon}
                onApproveClick={setApproveModalRequirement}
                onRejectClick={setRejectModalRequirement}
            />

            {/* Modals */}
            {approveModalRequirement && (
                <ApproveRequirementModal
                    requirement={approveModalRequirement}
                    onClose={() => setApproveModalRequirement(null)}
                    onConfirm={handleApproveConfirm}
                />
            )}

            {rejectModalRequirement && (
                <RejectRequirementModal
                    requirement={rejectModalRequirement}
                    onClose={() => setRejectModalRequirement(null)}
                    onConfirm={handleRejectConfirm}
                />
            )}
        </div>
    );
};

export default BatchRequirementsTable;