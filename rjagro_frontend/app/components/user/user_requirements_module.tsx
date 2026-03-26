'use client'
import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchBatchRequirements, handleAddBatchRequirement } from '@/app/api/batch_requirements';
import { fetchBatches } from '@/app/api/batches';
import { fetchItems } from '@/app/api/items';
import { NewBatchRequirement } from '@/app/types/interfaces';
import BatchRequirementsTable from '@/app/components/tables/batch_requirements/requirements';

const UserRequirementsModule = () => {
    const queryClient = useQueryClient();
    const [loading, setLoading] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);

    const { data: requirements = [] } = useQuery({
        queryKey: ["batch_requirements"],
        queryFn: fetchBatchRequirements,
        staleTime: 5 * 60 * 1000,
    });

    const { data: batches = [] } = useQuery({
        queryKey: ["batches"],
        queryFn: fetchBatches,
        staleTime: 5 * 60 * 1000,
    });

    const { data: items = [] } = useQuery({
        queryKey: ['items'],
        queryFn: fetchItems,
        staleTime: 5 * 60 * 1000,
    });

    const [newRequirement, setNewRequirement] = useState<NewBatchRequirement>({
        batch_id: '',
        item_code: '',
        quantity: ''
    });

    const onAddRequirement = () => {
        handleAddBatchRequirement(
            { ...newRequirement, line_id: 1, supervisor_id: 2 },
            queryClient, setLoading, () => {
                setShowAddForm(false);
                setNewRequirement({ batch_id: '', item_code: '', quantity: '' });
            }
        );
    };

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 min-h-[500px]">
                <BatchRequirementsTable
                    requirements={requirements}
                    batches={batches}
                    items={items}
                    loading={loading}
                    showAddForm={showAddForm}
                    newRequirement={newRequirement}
                    setShowAddForm={setShowAddForm}
                    setNewRequirement={setNewRequirement}
                    handleAddRequirement={onAddRequirement}
                />
            </div>
        </div>
    );
};

export default UserRequirementsModule;
