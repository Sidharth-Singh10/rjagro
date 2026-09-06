'use client';
import {
    OtherExpense,
    NewOtherExpense,
    OtherExpenseCategory,
    OTHER_EXPENSE_CATEGORY_LABELS,
} from '@/app/types/interfaces';
import TableSkeletonRows from '@/app/components/ui/table_skeleton_rows';
import { Plus, X, Save, IndianRupee, Calendar, Filter } from 'lucide-react';
import { useState } from 'react';

interface OtherExpensesTableProps {
    expenses: OtherExpense[];
    loading: boolean;
    showAddForm: boolean;
    newExpense: NewOtherExpense;
    setShowAddForm: (show: boolean) => void;
    setNewExpense: React.Dispatch<React.SetStateAction<NewOtherExpense>>;
    handleAddExpense: () => void;
}

const OtherExpensesTable: React.FC<OtherExpensesTableProps> = ({
    expenses,
    loading,
    showAddForm,
    newExpense,
    setShowAddForm,
    setNewExpense,
    handleAddExpense,
}) => {
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 15;
    const totalPages = Math.ceil(expenses.length / pageSize);
    const paginatedExpenses = expenses.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize
    );

    const totalAmount = expenses.reduce((sum, e) => {
        const amt = typeof e.amount === 'string' ? parseFloat(e.amount) : e.amount;
        return sum + (amt || 0);
    }, 0);

    return (
        <div className="bg-white rounded-lg shadow">
            <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-semibold text-gray-800">Other Expenses</h2>
                    <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                        Total: ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowAddForm(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                        <Plus size={18} />
                        Add Expense
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                        <Filter size={18} />
                        Filters
                    </button>
                </div>
            </div>

            {showAddForm && (
                <div className="p-4 border-b bg-gray-50">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-gray-800">Add New Expense</h3>
                        <button
                            onClick={() => setShowAddForm(false)}
                            className="text-gray-500 hover:text-gray-700"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 text-gray-900 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                            <select
                                value={newExpense.category}
                                onChange={(e) =>
                                    setNewExpense((prev) => ({
                                        ...prev,
                                        category: e.target.value as OtherExpenseCategory,
                                    }))
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            >
                                <option value="">Select category</option>
                                {Object.values(OtherExpenseCategory).map((cat) => (
                                    <option key={cat} value={cat}>
                                        {OTHER_EXPENSE_CATEGORY_LABELS[cat]}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
                            <div className="relative">
                                <IndianRupee size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="number"
                                    value={newExpense.amount}
                                    onChange={(e) =>
                                        setNewExpense((prev) => ({
                                            ...prev,
                                            amount: e.target.value ? Number(e.target.value) : '',
                                        }))
                                    }
                                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                    placeholder="0.00"
                                    min="0"
                                    step="0.01"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                            <div className="relative">
                                <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="date"
                                    value={newExpense.expense_date}
                                    onChange={(e) =>
                                        setNewExpense((prev) => ({
                                            ...prev,
                                            expense_date: e.target.value,
                                        }))
                                    }
                                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                            <input
                                type="text"
                                value={newExpense.description}
                                onChange={(e) =>
                                    setNewExpense((prev) => ({
                                        ...prev,
                                        description: e.target.value,
                                    }))
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                placeholder="Optional description"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end mt-4">
                        <button
                            onClick={handleAddExpense}
                            disabled={loading}
                            className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                        >
                            <Save size={18} />
                            {loading ? 'Saving...' : 'Save Expense'}
                        </button>
                    </div>
                </div>
            )}

            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">#</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</th>
                            <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Created At</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading ? (
                            <TableSkeletonRows cols={6} />
                        ) : paginatedExpenses.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                                    No other expenses found
                                </td>
                            </tr>
                        ) : (
                            paginatedExpenses.map((expense, idx) => (
                                <tr key={expense.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3 text-sm text-gray-500">
                                        {(currentPage - 1) * pageSize + idx + 1}
                                    </td>
                                    <td className="px-4 py-3 text-sm font-medium text-gray-800">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                            {OTHER_EXPENSE_CATEGORY_LABELS[expense.category] ?? expense.category}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-right font-semibold text-gray-800">
                                        ₹{Number(expense.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-600">
                                        {new Date(expense.expense_date).toLocaleDateString('en-IN')}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                                        {expense.description || '-'}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-400">
                                        {new Date(expense.created_at).toLocaleString('en-IN')}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                    <span className="text-sm text-gray-500">
                        Showing {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, expenses.length)} of {expenses.length}
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1 text-sm border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Previous
                        </button>
                        <span className="text-sm text-gray-600">
                            Page {currentPage} of {totalPages}
                        </span>
                        <button
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1 text-sm border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OtherExpensesTable;
