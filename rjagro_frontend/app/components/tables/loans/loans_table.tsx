'use client';
import React, { useState } from 'react';
import TableSkeletonRows from '@/app/components/ui/table_skeleton_rows';
import { Loan, NewLoan } from '@/app/types/interfaces';
import { useQueryClient } from '@tanstack/react-query';
import { handleDeleteLoan } from '@/app/api/loans';
import { Plus, X, Save, Trash2 } from 'lucide-react';
import TableActionsDropdown from '../../utils/table_actions';

interface LoansTableProps {
    loans: Loan[];
    loading: boolean;
    showAddForm: boolean;
    setShowAddForm: (show: boolean) => void;
    onAddLoan: (loan: NewLoan) => void;
}

const LoansTable: React.FC<LoansTableProps> = ({
    loans,
    loading,
    showAddForm,
    setShowAddForm,
    onAddLoan,
}) => {
    const queryClient = useQueryClient();
    const [openMenuId, setOpenMenuId] = useState<number | null>(null);

    const [newLoan, setNewLoan] = useState<NewLoan>({
        lender_name: '',
        principal_amount: '',
        interest_rate: '',
        loan_date: new Date().toISOString().slice(0, 10),
        due_date: '',
        notes: '',
    });

    const handleChange = (field: keyof NewLoan, value: string) => {
        setNewLoan((prev) => ({ ...prev, [field]: value }));
    };

    const statusBadge = (status: string) => {
        const colors = status === 'active'
            ? 'bg-green-100 text-green-800'
            : 'bg-gray-100 text-gray-600';
        return (
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors}`}>
                {status}
            </span>
        );
    };

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
                <h2 className="text-xl font-semibold text-gray-800">Loans</h2>
                <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow transition-colors text-white ${showAddForm ? 'bg-gray-500 hover:bg-gray-600' : 'bg-green-600 hover:bg-green-700'}`}
                >
                    {showAddForm ? <><X size={16} /> Cancel</> : <><Plus size={16} /> Add Loan</>}
                </button>
            </div>

            {showAddForm && (
                <div className="p-4 border-b bg-gray-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-gray-800">Add New Loan</h3>
                        <button onClick={() => setShowAddForm(false)} className="text-gray-500 hover:text-gray-700">
                            <X size={20} />
                        </button>
                    </div>
                    <div className="grid grid-cols-1 text-gray-900 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Lender Name *</label>
                            <input
                                type="text"
                                value={newLoan.lender_name}
                                onChange={(e) => handleChange('lender_name', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                placeholder="Lender name"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Principal Amount *</label>
                            <input
                                type="number"
                                value={newLoan.principal_amount}
                                onChange={(e) => handleChange('principal_amount', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                placeholder="0.00"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Interest Rate (%)</label>
                            <input
                                type="number"
                                step="0.01"
                                value={newLoan.interest_rate}
                                onChange={(e) => handleChange('interest_rate', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                placeholder="e.g. 12.5"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Loan Date *</label>
                            <input
                                type="date"
                                value={newLoan.loan_date}
                                onChange={(e) => handleChange('loan_date', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                            <input
                                type="date"
                                value={newLoan.due_date}
                                onChange={(e) => handleChange('due_date', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                            <input
                                type="text"
                                value={newLoan.notes}
                                onChange={(e) => handleChange('notes', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                placeholder="Optional notes"
                            />
                        </div>
                        <div className="flex items-end">
                            <button
                                onClick={() => onAddLoan(newLoan)}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                            >
                                <Save size={18} />
                                Save Loan
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lender</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Principal</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Outstanding</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rate %</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Loan Date</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {loading ? (
                            <TableSkeletonRows cols={9} />
                        ) : loans.length === 0 ? (
                            <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-500">No loans recorded yet.</td></tr>
                        ) : (
                            loans.map((loan) => (
                                <tr key={loan.loan_id} className="hover:bg-gray-50">
                                    <td className="px-4 py-4 text-sm text-gray-500">{loan.loan_id}</td>
                                    <td className="px-4 py-4 text-sm font-medium text-gray-900">{loan.lender_name}</td>
                                    <td className="px-4 py-4 text-sm text-gray-700">{Number(loan.principal_amount).toLocaleString()}</td>
                                    <td className="px-4 py-4 text-sm font-medium text-gray-900">{Number(loan.outstanding_balance).toLocaleString()}</td>
                                    <td className="px-4 py-4 text-sm text-gray-700">{loan.interest_rate ?? '-'}</td>
                                    <td className="px-4 py-4 text-sm text-gray-700">{loan.loan_date}</td>
                                    <td className="px-4 py-4 text-sm text-gray-700">{loan.due_date || '-'}</td>
                                    <td className="px-4 py-4 text-sm">{statusBadge(loan.status)}</td>
                                    <td className="px-4 py-4 text-sm text-gray-500 relative">
                                        <TableActionsDropdown
                                            rowId={loan.loan_id}
                                            openMenuId={openMenuId}
                                            onMenuToggle={(id) => setOpenMenuId(typeof id === 'number' ? id : null)}
                                            actions={[
                                                {
                                                    label: 'Delete',
                                                    icon: <Trash2 size={14} />,
                                                    variant: 'danger',
                                                    onClick: () => {
                                                        const confirmed = window.confirm(`Delete loan #${loan.loan_id} from ${loan.lender_name}? This will reverse all ledger entries.`);
                                                        if (!confirmed) return;
                                                        handleDeleteLoan(loan.loan_id, queryClient);
                                                    }
                                                }
                                            ]}
                                        />
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default LoansTable;
