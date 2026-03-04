import { failure, success, type ValidationResult } from '../../../core/validation/validation-types';
import {
  FINANCIAL_TRANSACTION_STATUS,
  FINANCIAL_TRANSACTION_TYPE,
  type FinancialTransactionStatus,
  type FinancialTransactionType
} from '../domain/financial-transaction';
import type {
  CreateFinancialTransactionRequest,
  UpdateFinancialTransactionRequest
} from './financial-contracts';

type UnknownRecord = Record<string, unknown>;

function asText(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function asEnum<T extends string>(value: unknown, values: readonly T[]): T | undefined {
  return typeof value === 'string' && values.includes(value as T) ? (value as T) : undefined;
}

function asCurrency(value: unknown): 'MXN' | 'USD' | 'EUR' | undefined {
  return asEnum(value, ['MXN', 'USD', 'EUR'] as const);
}

export function validateCreateFinancialTransaction(
  payload: UnknownRecord
): ValidationResult<CreateFinancialTransactionRequest> {
  const errors: string[] = [];

  const itineraryId = asText(payload.itineraryId);
  const type = asEnum<FinancialTransactionType>(payload.type, FINANCIAL_TRANSACTION_TYPE);
  const amountOriginal = asNumber(payload.amountOriginal);
  const currencyOriginal = asCurrency(payload.currencyOriginal);
  const exchangeRate = asNumber(payload.exchangeRate);
  const status = asEnum<FinancialTransactionStatus>(payload.status, FINANCIAL_TRANSACTION_STATUS);
  const transactionDate = asText(payload.transactionDate);

  if (!itineraryId) errors.push('itineraryId es requerido');
  if (!type) errors.push('type inválido');
  if (amountOriginal === undefined || amountOriginal < 0) errors.push('amountOriginal inválido');
  if (!currencyOriginal) errors.push('currencyOriginal inválido');
  if (exchangeRate === undefined || exchangeRate <= 0) errors.push('exchangeRate inválido');
  if ('status' in payload && !status) errors.push('status inválido');
  if (!transactionDate) errors.push('transactionDate es requerido');

  if (errors.length > 0) return failure(errors);

  return success({
    itineraryId: itineraryId as string,
    type: type as FinancialTransactionType,
    amountOriginal: amountOriginal as number,
    currencyOriginal: currencyOriginal as 'MXN' | 'USD' | 'EUR',
    exchangeRate: exchangeRate as number,
    status,
    transactionDate: transactionDate as string
  });
}

export function validateUpdateFinancialTransaction(
  payload: UnknownRecord
): ValidationResult<UpdateFinancialTransactionRequest> {
  const result: UpdateFinancialTransactionRequest = {};
  const errors: string[] = [];

  if ('type' in payload) result.type = asEnum(payload.type, FINANCIAL_TRANSACTION_TYPE);
  if ('amountOriginal' in payload) result.amountOriginal = asNumber(payload.amountOriginal);
  if ('currencyOriginal' in payload) result.currencyOriginal = asCurrency(payload.currencyOriginal);
  if ('exchangeRate' in payload) result.exchangeRate = asNumber(payload.exchangeRate);
  if ('status' in payload) result.status = asEnum(payload.status, FINANCIAL_TRANSACTION_STATUS);
  if ('transactionDate' in payload) result.transactionDate = asText(payload.transactionDate);

  if ('type' in payload && !result.type) errors.push('type inválido');
  if ('amountOriginal' in payload && (result.amountOriginal === undefined || result.amountOriginal < 0)) {
    errors.push('amountOriginal inválido');
  }
  if ('currencyOriginal' in payload && !result.currencyOriginal) errors.push('currencyOriginal inválido');
  if ('exchangeRate' in payload && (result.exchangeRate === undefined || result.exchangeRate <= 0)) {
    errors.push('exchangeRate inválido');
  }
  if ('status' in payload && !result.status) errors.push('status inválido');

  if (errors.length > 0) return failure(errors);
  return success(result);
}
