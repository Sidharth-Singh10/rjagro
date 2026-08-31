import api from "../utils/api";
import {
  AppTrader,
  CreateTraderPaymentPayload,
  TraderLedgerEntryView,
  TraderLedgerView,
} from "../types/interfaces";

export const fetchAppTraders = async (): Promise<AppTrader[]> => {
  const response = await api.get("/supervisor/traders");
  return response.data;
};

export const fetchAppTraderLedger = async (traderId: number): Promise<TraderLedgerView> => {
  const response = await api.get(`/ledger/traders/${traderId}`);
  return response.data;
};

export const fetchAppTraderStatement = async (
  traderId: number,
  from?: string,
  to?: string
): Promise<TraderLedgerView> => {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const qs = params.toString();
  const response = await api.get(
    `/ledger/traders/${traderId}/statement${qs ? `?${qs}` : ""}`
  );
  return response.data;
};

export const createAppTraderPayment = async (
  traderId: number,
  payload: CreateTraderPaymentPayload
): Promise<TraderLedgerEntryView> => {
  const response = await api.post(`/ledger/traders/${traderId}/payments`, payload);
  return response.data;
};