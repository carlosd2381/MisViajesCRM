import type {
  FinancialTransaction,
  FinancialTransactionStatus,
  FinancialTransactionType
} from '../domain/financial-transaction';

export interface CreateFinancialTransactionRequest {
  itineraryId: string;
  type: FinancialTransactionType;
  amountOriginal: number;
  currencyOriginal: 'MXN' | 'USD' | 'EUR';
  exchangeRate: number;
  status?: FinancialTransactionStatus;
  transactionDate: string;
}

export interface UpdateFinancialTransactionRequest {
  type?: FinancialTransactionType;
  amountOriginal?: number;
  currencyOriginal?: 'MXN' | 'USD' | 'EUR';
  exchangeRate?: number;
  status?: FinancialTransactionStatus;
  transactionDate?: string;
}

export interface FinancialTransactionResponse {
  data: FinancialTransaction;
}

export interface FinancialTransactionListResponse {
  data: FinancialTransaction[];
}
