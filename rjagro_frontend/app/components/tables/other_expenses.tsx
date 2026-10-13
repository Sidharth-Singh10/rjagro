'use client';
import {
    OtherExpense,
    NewOtherExpense,
    OtherExpenseCategory,
    OTHER_EXPENSE_CATEGORY_LABELS,
} from '@/app/types/interfaces';
import { useState } from 'react';
import TableSkeletonRows from '@/app/components/ui/table_skeleton_rows';
import Modal from '@/app/components/ui/modal';
import Pagination from '@/app/components/ui/pagination';
import { Plus, X, Save, IndianRupee, Calendar, Filter, Edit } from 'lucide-react';
import SortableHeader from './sortable_headers/header';

interface OtherExpensesTableProps {
    expenses: OtherExpense[];
    loading: boolean;
    /** True until the first page has loaded — drives the skeleton. */
    tableLoading: boolean;
    /** True while another page is being fetched — dims the table. */
    refreshing: boolean;
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    totalAmount: number;
    onPageChange: (page: number) => void;
    sortKey: string;
    sortDir: 'asc' | 'desc';
    onSortChange: (key: string) => void;
    /** Inclusive month key, YYYY-MM; empty means all months. */
    month: string;
    onMonthChange: (month: string) => void;
    showAddForm: boolean;
    newExpense: NewOtherExpense;
    setShowAddForm: (show: boolean) => void;
    setNewExpense: React.Dispatch<React.SetStateAction<NewOtherExpense>>;
    handleAddExpense: () => void;
    onEditClick: (expense: OtherExpense) => void;
    editingExpense: OtherExpense | null;
    editForm: NewOtherExpense;
    setEditForm: React.Dispatch<React.SetStateAction<NewOtherExpense>>;
    onSaveEdit: () => void;
    onCancelEdit: () => void;
}

interface ExpenseFieldsProps {
    value: NewOtherExpense;
    onChange: (next: NewOtherExpense) => void;
}

const ExpenseFields: React.FC<ExpenseFieldsProps> = ({ value, onChange }) => (
    <div className="grid grid-cols-1 text-gray-900 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
            <select
                value={value.category}
                onChange={(e) =>
                    onChange({ ...value, category: e.target.value as OtherExpenseCategory })
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
                    value={value.amount}
                    onChange={(e) =>
                        onChange({ ...value, amount: e.target.value ? Number(e.target.value) : '' })
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
                    value={value.expense_date}
                    onChange={(e) => onChange({ ...value, expense_date: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
            </div>
        </div>
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input
                type="text"
                value={value.description}
                onChange={(e) => onChange({ ...value, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Optional description"
            />
        </div>
    </div>
);

const OtherExpensesTable: React.FC<OtherExpensesTableProps> = ({
    expenses,
    loading,
    showAddForm,
    newExpense,
    setShowAddForm,
    setNewExpense,
    handleAddExpense,
    tableLoading,
    refreshing,
    page,
    pageSize,
    totalCount,
    totalPages,
    totalAmount,
    onPageChange,
    sortKey,
    sortDir,
    onSortChange,
    month,
    onMonthChange,
    onEditClick,
    editingExpense,
    editForm,
    setEditForm,
    onSaveEdit,
    onCancelEdit,
}) => {
    const [showFilters, setShowFilters] = useState(false);

    // Server-side sorting: the page is already ordered by the API.
    const requestSort = (key: string) => onSortChange(key);
    const getSortIcon = (columnKey: string) => {
        if (sortKey !== columnKey) return 'ArrowUpDown';
        return sortDir === 'asc' ? 'ArrowUp' : 'ArrowDown';
    };

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
                    <button
                        onClick={() => setShowFilters((open) => !open)}
                        className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${showFilters || month
                            ? 'border-green-600 text-green-600 bg-green-50'
                            : 'text-gray-600 border-gray-300 hover:bg-gray-50'
                            }`}
                    >
                        <Filter size={18} />
                        Filters
                        {month && (
                            <span className="px-1.5 py-0.5 text-xs rounded-full bg-green-600 text-white">1</span>
                        )}
                    </button>
                </div>
            </div>

            {/* Filters */}
            {showFilters && (
                <div className="flex items-center gap-3 px-4 py-3 border-b bg-gray-50">
                    <label htmlFor="other-expense-month" className="text-sm font-medium text-gray-700">
                        Month
                    </label>
                    <input
                        id="other-expense-month"
                        type="month"
                        value={month}
                        onChange={(e) => onMonthChange(e.target.value)}
                        className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                    {month && (
                        <button
                            onClick={() => onMonthChange('')}
                            className="text-xs text-gray-500 underline hover:text-gray-700"
                        >
                            Clear
                        </button>
                    )}
                </div>
            )}

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

                    <ExpenseFields value={newExpense} onChange={(next) => setNewExpense(next)} />

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

            <div className={`overflow-x-auto transition-opacity ${refreshing ? 'opacity-60' : ''}`}>
                <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <SortableHeader columnKey="id" requestSort={requestSort} getSortIcon={getSortIcon} isSortable>ID</SortableHeader>
                            <SortableHeader columnKey="category" requestSort={requestSort} getSortIcon={getSortIcon} isSortable>Category</SortableHeader>
                            <SortableHeader columnKey="amount" requestSort={requestSort} getSortIcon={getSortIcon} isSortable align="right">Amount</SortableHeader>
                            <SortableHeader columnKey="expense_date" requestSort={requestSort} getSortIcon={getSortIcon} isSortable>Date</SortableHeader>
                            <SortableHeader columnKey="description" requestSort={requestSort} getSortIcon={getSortIcon} isSortable>Description</SortableHeader>
                            <SortableHeader columnKey="created_at" requestSort={requestSort} getSortIcon={getSortIcon} isSortable>Created At</SortableHeader>
                            <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {tableLoading ? (
                            <TableSkeletonRows cols={7} />
                        ) : expenses.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                                    No other expenses found
                                </td>
                            </tr>
                        ) : (
                            expenses.map((expense) => (
                                <tr key={expense.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3 text-sm text-gray-500">
                                        {expense.id}
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
                                    <td className="px-4 py-3 text-sm text-right">
                                        <button
                                            onClick={() => onEditClick(expense)}
                                            className="p-2 rounded-lg text-gray-500 hover:text-green-600 hover:bg-green-50 transition-colors"
                                            title="Edit expense"
                                            aria-label="Edit expense"
                                        >
                                            <Edit size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {totalPages > 1 && (
                <Pagination
                    page={page}
                    pageCount={totalPages}
                    total={totalCount}
                    pageSize={pageSize}
                    onPageChange={onPageChange}
                />
            )}

            <Modal
                open={editingExpense !== null}
                onClose={onCancelEdit}
                title="Edit Expense"
                description={editingExpense ? `Entry #${editingExpense.id}` : undefined}
                size="lg"
            >
                <ExpenseFields value={editForm} onChange={(next) => setEditForm(next)} />

                <div className="flex justify-end gap-3 mt-6">
                    <button
                        onClick={onCancelEdit}
                        className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onSaveEdit}
                        disabled={loading}
                        className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                        <Save size={18} />
                        {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </Modal>
        </div>
    );
};

export default OtherExpensesTable;
