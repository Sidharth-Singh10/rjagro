'use client';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchOtherExpenses, handleAddOtherExpense, handleUpdateOtherExpense } from '@/app/api/other_expenses';
import { useAuth } from '@/app/hooks/useAuth';
import {
    CreateOtherExpensePayload,
    NewOtherExpense,
    OtherExpense,
    UpdateOtherExpensePayload,
} from '@/app/types/interfaces';
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

    const [editingExpense, setEditingExpense] = useState<OtherExpense | null>(null);
    const [editForm, setEditForm] = useState<NewOtherExpense>({
        category: '',
        amount: '',
        description: '',
        expense_date: new Date().toISOString().slice(0, 10),
    });

    const openEditExpense = (expense: OtherExpense) => {
        setEditingExpense(expense);
        setEditForm({
            category: expense.category,
            amount: Number(expense.amount),
            description: expense.description ?? '',
            expense_date: expense.expense_date.slice(0, 10),
        });
    };

    const onCancelEdit = () => {
        setEditingExpense(null);
    };

    const onSaveEdit = () => {
        if (!editingExpense || !editForm.category || !editForm.amount) return;

        const payload: UpdateOtherExpensePayload = {
            category: editForm.category,
            amount: Number(editForm.amount),
            description: editForm.description || undefined,
            expense_date: editForm.expense_date,
        };

        handleUpdateOtherExpense(editingExpense.id, payload, queryClient, setLoading, () => {
            setEditingExpense(null);
        });
    };

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
                    onEditClick={openEditExpense}
                    editingExpense={editingExpense}
                    editForm={editForm}
                    setEditForm={setEditForm}
                    onSaveEdit={onSaveEdit}
                    onCancelEdit={onCancelEdit}
                />
            </div>
        </div>
    );
};

export default OtherExpensesModule;
