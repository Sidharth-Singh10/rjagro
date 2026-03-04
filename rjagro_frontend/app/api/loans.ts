import { Loan, LoanPayload, LoanPayment, LoanPaymentPayload } from '../types/interfaces';
import api from '../utils/api';
import { toast } from 'react-toastify';

export const fetchLoans = async (): Promise<Loan[]> => {
    const response = await api.get('/getall/loans');
    return response.data;
};

export const handleAddLoan = async (
    payload: LoanPayload,
    queryClient: any,
    setLoading: (loading: boolean) => void
) => {
    if (!payload.lender_name || !payload.principal_amount || !payload.loan_date) {
        toast.error('Please fill in all required fields');
        return;
    }

    setLoading(true);
    toast.info('Adding loan...');

    try {
        await api.post('/insert/loan', payload);
        queryClient.invalidateQueries(['loans']);
        toast.success('Loan added successfully!');
    } catch (error) {
        console.error('Error adding loan:', error);
        toast.error('Error adding loan');
    } finally {
        setLoading(false);
    }
};

export const handleDeleteLoan = async (
    loanId: number,
    queryClient?: any
) => {
    try {
        await api.delete(`/delete/loans/${loanId}`);
        toast.success(`Loan #${loanId} deleted!`);
        queryClient?.invalidateQueries(['loans']);
    } catch (error) {
        console.error('Error deleting loan:', error);
        toast.error('Error deleting loan');
    }
};

export const fetchLoanPayments = async (): Promise<LoanPayment[]> => {
    const response = await api.get('/getall/loan_payments');
    return response.data;
};

export const handleAddLoanPayment = async (
    payload: LoanPaymentPayload,
    queryClient: any,
    setLoading: (loading: boolean) => void
) => {
    if (!payload.loan_id || !payload.total_amount || !payload.payment_date) {
        toast.error('Please fill in all required fields');
        return;
    }

    setLoading(true);
    toast.info('Recording loan payment...');

    try {
        await api.post('/insert/loan_payment', payload);
        queryClient.invalidateQueries(['loan_payments']);
        queryClient.invalidateQueries(['loans']);
        toast.success('Loan payment recorded successfully!');
    } catch (error) {
        console.error('Error recording loan payment:', error);
        toast.error('Error recording loan payment');
    } finally {
        setLoading(false);
    }
};

export const handleDeleteLoanPayment = async (
    paymentId: number,
    queryClient?: any
) => {
    try {
        await api.delete(`/delete/loan_payments/${paymentId}`);
        toast.success(`Loan payment #${paymentId} deleted!`);
        queryClient?.invalidateQueries(['loan_payments']);
        queryClient?.invalidateQueries(['loans']);
    } catch (error) {
        console.error('Error deleting loan payment:', error);
        toast.error('Error deleting loan payment');
    }
};
