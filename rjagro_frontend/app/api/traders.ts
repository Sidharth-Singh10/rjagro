import { Trader, TraderPayment, TraderPaymentPayload, TraderReceivable } from '../types/interfaces';
import api from '../utils/api';
import { toast } from 'react-toastify';

export const fetchTraders = async (): Promise<Trader[]> => {
  const response = await api.get('/getall/traders');
  return response.data;
};

export const handleAddTrader = async (
  payload: TraderPayload,
  queryClient: any,
  setLoading: (loading: boolean) => void
) => {
  if (
    !payload.name ||
    !payload.phone_number ||
    !payload.address ||
    !payload.bank_account_no ||
    !payload.bank_name ||
    !payload.ifsc_code) {
    toast.error('Please fill in all required fields');
    return;
  }

  setLoading(true);
  toast.info('Adding trader...');

  try {
    await api.post('/insert/traders', payload);

    // Invalidate cache so traders list refetches automatically
    queryClient.invalidateQueries(['traders']);

    toast.success('Trader added successfully!');
  } catch (error) {
    console.error('Error adding trader:', error);
    toast.error('Error adding trader');
  } finally {
    setLoading(false);
  }
};

export const fetchTraderReceivable = async (traderId: number): Promise<TraderReceivable[]> => {
  const response = await api.get(`/getbyid/trader_receivables/${traderId}`);
  return response.data;
};


export const fetchTraderPayments = async (traderId: number): Promise<TraderPayment[]> => {
  const response = await api.get(`/getbyid/trader_payments/${traderId}`);
  return response.data;
}

// fix `any` later
export const fetchTraderLedger = async (traderId: number): Promise<any[]> => {
  const response = await api.get(`/getbyid/trader_ledger/${traderId}`);
  return response.data;
}

export const handleAddTraderPayment = async (
  payload: TraderPaymentPayload,
  setLoading: (loading: boolean) => void,
  onSuccess?: () => void
) => {
  if (!payload.trader_id || !payload.amount || !payload.payment_date) {
    toast.error("Please fill in all required payment fields");
    return;
  }

  // forgot to invalidate cache here?
  setLoading(true);

  try {
    await api.post('/insert/trader_payment', payload);
    toast.success("Payment recorded successfully!");

    if (onSuccess) onSuccess();

  } catch (error) {
    console.error("Error recording payment:", error);
    toast.error("Error recording payment");
  } finally {
    setLoading(false);
  }
};


export interface TraderPayload {
  name: string;
  phone_number: string;
  address: string;
  bank_account_no: string;
  bank_name: string;
  ifsc_code: string;
}
