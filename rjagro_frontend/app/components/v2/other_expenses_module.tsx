'use client';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchOtherExpenses, handleAddOtherExpense } from '@/app/api/other_expenses';
import { useAuth } from '@/app/hooks/useAuth';
import { CreateOtherExpensePayload, NewOtherExpense } from '@/app/types/interfaces';
import OtherExpensesTable from '../tables/other_expenses';

const OtherExpensesModule = () => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [loading, setLoading] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);

    const { data: expenses = [] } = useQuery({
        queryKey: ['other_expenses'],
        queryFn: fetchOtherExpenses,
        staleTime: 5 * 60 * 1000,
    });

    const [newExpense, setNewExpense] = useState<NewOtherExpense>({
        category: '',
        amount: '',
        description: '',
        expense_date: new Date().toISOString().slice(0, 10),
    });

    const onAddExpense = () => {
        if (!newExpense.category || !newExpense.amount) return;

        const payload: CreateOtherExpensePayload = {
            category: newExpense.category as CreateOtherExpensePayload['category'],
            amount: Number(newExpense.amount),
            description: newExpense.description || undefined,
            expense_date: newExpense.expense_date,
            created_by: user?.user_id ?? 1,
        };

        handleAddOtherExpense(payload, queryClient, setLoading, () => {
            setShowAddForm(false);
            setNewExpense({
                category: '',
                amount: '',
                description: '',
                expense_date: new Date().toISOString().slice(0, 10),
            });
        });
    };

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 min-h-[500px]">
                <OtherExpensesTable
                    expenses={expenses}
                    loading={loading}
                    showAddForm={showAddForm}
                    newExpense={newExpense}
                    setShowAddForm={setShowAddForm}
                    setNewExpense={setNewExpense}
                    handleAddExpense={onAddExpense}
                />
            </div>
        </div>
    );
};

export default OtherExpensesModule;
