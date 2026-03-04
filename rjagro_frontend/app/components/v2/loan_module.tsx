'use client'
import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Banknote, Receipt } from 'lucide-react';
import { fetchLoans, fetchLoanPayments, handleAddLoan, handleAddLoanPayment } from '@/app/api/loans';
import { LoanPayload, LoanPaymentPayload, NewLoan, NewLoanPayment } from '@/app/types/interfaces';
import LoanPaymentsTable from '../tables/loans/loan_payments_table';
import LoansTable from '../tables/loans/loans_table';
import { useAuth } from '@/app/hooks/useAuth';

const LoanModule = () => {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const [subTab, setSubTab] = useState<'Repayments' | 'Loans'>('Repayments');
    const [loading, setLoading] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);

    const { data: loans = [] } = useQuery({
        queryKey: ['loans'],
        queryFn: fetchLoans,
        staleTime: 5 * 60 * 1000,
    });

    const { data: loanPayments = [] } = useQuery({
        queryKey: ['loan_payments'],
        queryFn: fetchLoanPayments,
        staleTime: 5 * 60 * 1000,
    });

    const onAddLoan = (newLoan: NewLoan) => {
        if (!newLoan.lender_name || !newLoan.principal_amount || !newLoan.loan_date) return;
        const payload: LoanPayload = {
            lender_name: newLoan.lender_name,
            principal_amount: Number(newLoan.principal_amount),
            interest_rate: newLoan.interest_rate ? Number(newLoan.interest_rate) : undefined,
            loan_date: newLoan.loan_date,
            due_date: newLoan.due_date || undefined,
            notes: newLoan.notes || undefined,
            created_by: user ? user.user_id : 9999,
        };
        handleAddLoan(payload, queryClient, setLoading);
    };

    const onAddLoanPayment = (newPayment: NewLoanPayment) => {
        if (!newPayment.loan_id || !newPayment.total_amount || !newPayment.payment_date) return;
        const payload: LoanPaymentPayload = {
            loan_id: Number(newPayment.loan_id),
            principal_amount: Number(newPayment.principal_amount) || 0,
            interest_amount: Number(newPayment.interest_amount) || 0,
            total_amount: Number(newPayment.total_amount),
            payment_date: newPayment.payment_date,
            payment_mode: newPayment.payment_mode || undefined,
            reference_number: newPayment.reference_number || undefined,
            notes: newPayment.notes || undefined,
            created_by: user ? user.user_id : 9999,
        };
        handleAddLoanPayment(payload, queryClient, setLoading);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-4 border-b border-gray-200 pb-2">
                <button
                    onClick={() => { setSubTab('Repayments'); setShowAddForm(false); }}
                    className={`flex items-center space-x-2 pb-2 px-1 text-sm font-medium transition-colors ${subTab === 'Repayments' ? 'border-b-2 border-green-600 text-green-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <Receipt className="w-4 h-4" />
                    <span>Loan Repayments</span>
                </button>
                <button
                    onClick={() => { setSubTab('Loans'); setShowAddForm(false); }}
                    className={`flex items-center space-x-2 pb-2 px-1 text-sm font-medium transition-colors ${subTab === 'Loans' ? 'border-b-2 border-green-600 text-green-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <Banknote className="w-4 h-4" />
                    <span>Loans</span>
                </button>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-100 min-h-[500px]">
                {subTab === 'Repayments' && (
                    <LoanPaymentsTable
                        loanPayments={loanPayments}
                        loans={loans}
                        loading={loading}
                        showAddForm={showAddForm}
                        setShowAddForm={setShowAddForm}
                        onAddPayment={onAddLoanPayment}
                    />
                )}

                {subTab === 'Loans' && (
                    <LoansTable
                        loans={loans}
                        loading={loading}
                        showAddForm={showAddForm}
                        setShowAddForm={setShowAddForm}
                        onAddLoan={onAddLoan}
                    />
                )}
            </div>
        </div>
    );
};

export default LoanModule;
