import type {
  CreateFinancialTransactionRequest,
  UpdateFinancialTransactionRequest
} from '../api/financial-contracts';
import type { FinancialTransaction } from '../domain/financial-transaction';

function nowIsoDate(): string {
  return new Date().toISOString();
}

function createEntityId(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${random}`;
}

function computeAmountMxn(amountOriginal: number, exchangeRate: number): number {
  return Number((amountOriginal * exchangeRate).toFixed(2));
}

export function mapCreateFinancialTransactionToEntity(
  input: CreateFinancialTransactionRequest
): FinancialTransaction {
  const timestamp = nowIsoDate();

  return {
    id: createEntityId('fin_tx'),
    itineraryId: input.itineraryId,
    type: input.type,
    amountOriginal: input.amountOriginal,
    currencyOriginal: input.currencyOriginal,
    exchangeRate: input.exchangeRate,
    amountMxn: computeAmountMxn(input.amountOriginal, input.exchangeRate),
    status: input.status ?? 'pending',
    transactionDate: input.transactionDate,
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

export function mapUpdateFinancialTransactionToEntity(
  current: FinancialTransaction,
  input: UpdateFinancialTransactionRequest
): FinancialTransaction {
  const amountOriginal = input.amountOriginal ?? current.amountOriginal;
  const exchangeRate = input.exchangeRate ?? current.exchangeRate;

  return {
    ...current,
    ...input,
    amountOriginal,
    exchangeRate,
    amountMxn: computeAmountMxn(amountOriginal, exchangeRate),
    updatedAt: nowIsoDate()
  };
}
