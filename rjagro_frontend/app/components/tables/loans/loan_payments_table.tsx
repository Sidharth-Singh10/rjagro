'use client';
import React, { useState } from 'react';
import { Loan, LoanPayment, NewLoanPayment } from '@/app/types/interfaces';
import { handleDeleteLoanPayment } from '@/app/api/loans';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, X, Save, Trash2 } from 'lucide-react';
import TableActionsDropdown from '../../utils/table_actions';

interface LoanPaymentsTableProps {
    loanPayments: LoanPayment[];
    loans: Loan[];
    loading: boolean;
    showAddForm: boolean;
    setShowAddForm: (show: boolean) => void;
    onAddPayment: (payment: NewLoanPayment) => void;
}

const LoanPaymentsTable: React.FC<LoanPaymentsTableProps> = ({
    loanPayments,
    loans,
    loading,
    showAddForm,
    setShowAddForm,
    onAddPayment,
}) => {
    const queryClient = useQueryClient();
    const [openMenuId, setOpenMenuId] = useState<number | null>(null);

    const [newPayment, setNewPayment] = useState<NewLoanPayment>({
        loan_id: '',
        principal_amount: '',
        interest_amount: '',
        total_amount: '',
        payment_date: new Date().toISOString().slice(0, 10),
        payment_mode: '',
        reference_number: '',
        notes: '',
    });

    const handleChange = (field: keyof NewLoanPayment, value: string) => {
        setNewPayment((prev) => {
            const updated = { ...prev, [field]: value };
            if (field === 'principal_amount' || field === 'interest_amount') {
                const principal = field === 'principal_amount' ? Number(value) || 0 : Number(prev.principal_amount) || 0;
                const interest = field === 'interest_amount' ? Number(value) || 0 : Number(prev.interest_amount) || 0;
                updated.total_amount = principal + interest;
            }
            return updated;
        });
    };

    const getLenderName = (loanId: number) => {
        const loan = loans.find(l => l.loan_id === loanId);
        return loan ? loan.lender_name : `Loan #${loanId}`;
    };

    const activeLoans = loans.filter(l => l.status === 'active');

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
                <h2 className="text-xl font-semibold text-gray-800">Loan Repayments</h2>
                <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow transition-colors text-white ${showAddForm ? 'bg-gray-500 hover:bg-gray-600' : 'bg-green-600 hover:bg-green-700'}`}
                >
                    {showAddForm ? <><X size={16} /> Cancel</> : <><Plus size={16} /> Record Payment</>}
                </button>
            </div>

            {showAddForm && (
                <div className="p-4 border-b bg-gray-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-gray-800">Record Loan Payment</h3>
                        <button onClick={() => setShowAddForm(false)} className="text-gray-500 hover:text-gray-700">
                            <X size={20} />
                        </button>
                    </div>
                    <div className="grid grid-cols-1 text-black md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Loan *</label>
                            <select
                                value={newPayment.loan_id}
                                onChange={(e) => handleChange('loan_id', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            >
                                <option value="">Select Loan</option>
                                {activeLoans.map((loan) => (
                                    <option key={loan.loan_id} value={loan.loan_id}>
                                        {loan.lender_name} (Balance: {Number(loan.outstanding_balance).toLocaleString()})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Principal Amount *</label>
                            <input
                                type="number"
                                value={newPayment.principal_amount}
                                onChange={(e) => handleChange('principal_amount', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                placeholder="0.00"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Interest Amount *</label>
                            <input
                                type="number"
                                value={newPayment.interest_amount}
                                onChange={(e) => handleChange('interest_amount', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                placeholder="0.00"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount</label>
                            <input
                                type="number"
                                value={newPayment.total_amount}
                                readOnly
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-100 text-gray-600"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Date *</label>
                            <input
                                type="date"
                                value={newPayment.payment_date}
                                onChange={(e) => handleChange('payment_date', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Mode</label>
                            <input
                                type="text"
                                value={newPayment.payment_mode}
                                onChange={(e) => handleChange('payment_mode', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                placeholder="Cash / Bank Transfer"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Reference No.</label>
                            <input
                                type="text"
                                value={newPayment.reference_number}
                                onChange={(e) => handleChange('reference_number', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                placeholder="UTR / Cheque No."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                            <input
                                type="text"
                                value={newPayment.notes}
                                onChange={(e) => handleChange('notes', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                placeholder="Optional notes"
                            />
                        </div>
                        <div className="flex items-end">
                            <button
                                onClick={() => onAddPayment(newPayment)}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                            >
                                <Save size={18} />
                                Save Payment
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
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Interest</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mode</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {loading ? (
                            <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
                        ) : loanPayments.length === 0 ? (
                            <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-500">No loan payments recorded yet.</td></tr>
                        ) : (
                            loanPayments.map((payment) => (
                                <tr key={payment.payment_id} className="hover:bg-gray-50">
                                    <td className="px-4 py-4 text-sm text-gray-500">{payment.payment_id}</td>
                                    <td className="px-4 py-4 text-sm font-medium text-gray-900">{getLenderName(payment.loan_id)}</td>
                                    <td className="px-4 py-4 text-sm text-gray-700">{Number(payment.principal_amount).toLocaleString()}</td>
                                    <td className="px-4 py-4 text-sm text-gray-700">{Number(payment.interest_amount).toLocaleString()}</td>
                                    <td className="px-4 py-4 text-sm font-medium text-gray-900">{Number(payment.total_amount).toLocaleString()}</td>
                                    <td className="px-4 py-4 text-sm text-gray-700">{payment.payment_date}</td>
                                    <td className="px-4 py-4 text-sm text-gray-500">{payment.payment_mode || '-'}</td>
                                    <td className="px-4 py-4 text-sm text-gray-500">{payment.reference_number || '-'}</td>
                                    <td className="px-4 py-4 text-sm text-gray-500 relative">
                                        <TableActionsDropdown
                                            rowId={payment.payment_id}
                                            openMenuId={openMenuId}
                                            onMenuToggle={(id) => setOpenMenuId(typeof id === 'number' ? id : null)}
                                            actions={[
                                                {
                                                    label: 'Delete',
                                                    icon: <Trash2 size={14} />,
                                                    variant: 'danger',
                                                    onClick: () => {
                                                        const confirmed = window.confirm(`Delete loan payment #${payment.payment_id}?`);
                                                        if (!confirmed) return;
                                                        handleDeleteLoanPayment(payment.payment_id, queryClient);
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

export default LoanPaymentsTable;
