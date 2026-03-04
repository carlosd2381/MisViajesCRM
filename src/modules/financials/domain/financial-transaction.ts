export const FINANCIAL_TRANSACTION_TYPE = ['supplier_payment', 'client_receipt', 'service_fee'] as const;
export const FINANCIAL_TRANSACTION_STATUS = ['pending', 'cleared', 'cancelled'] as const;

export type FinancialTransactionType = (typeof FINANCIAL_TRANSACTION_TYPE)[number];
export type FinancialTransactionStatus = (typeof FINANCIAL_TRANSACTION_STATUS)[number];

export interface FinancialTransaction {
  id: string;
  itineraryId: string;
  type: FinancialTransactionType;
  amountOriginal: number;
  currencyOriginal: 'MXN' | 'USD' | 'EUR';
  exchangeRate: number;
  amountMxn: number;
  status: FinancialTransactionStatus;
  transactionDate: string;
  createdAt: string;
  updatedAt: string;
}
