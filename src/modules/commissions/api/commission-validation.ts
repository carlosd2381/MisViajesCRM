import { failure, success, type ValidationResult } from '../../../core/validation/validation-types';
import { COMMISSION_STATUS, type CommissionStatus } from '../domain/commission';
import type { CreateCommissionRequest, UpdateCommissionRequest } from './commission-contracts';

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

export function validateCreateCommission(payload: UnknownRecord): ValidationResult<CreateCommissionRequest> {
  const errors: string[] = [];

  const itineraryId = asText(payload.itineraryId);
  const supplierId = asText(payload.supplierId);
  const expectedAmount = asNumber(payload.expectedAmount);
  const actualReceived = asNumber(payload.actualReceived);
  const receivedDate = asText(payload.receivedDate);
  const dueDate = asText(payload.dueDate);
  const status = asEnum<CommissionStatus>(payload.status, COMMISSION_STATUS);

  if (!itineraryId) errors.push('itineraryId es requerido');
  if (!supplierId) errors.push('supplierId es requerido');
  if (expectedAmount === undefined || expectedAmount < 0) errors.push('expectedAmount inválido');
  if (actualReceived !== undefined && actualReceived < 0) errors.push('actualReceived inválido');
  if (!dueDate) errors.push('dueDate es requerido');
  if ('status' in payload && !status) errors.push('status inválido');

  if (errors.length > 0) return failure(errors);

  return success({
    itineraryId: itineraryId as string,
    supplierId: supplierId as string,
    expectedAmount: expectedAmount as number,
    actualReceived,
    receivedDate,
    dueDate: dueDate as string,
    status
  });
}

export function validateUpdateCommission(payload: UnknownRecord): ValidationResult<UpdateCommissionRequest> {
  const result: UpdateCommissionRequest = {};
  const errors: string[] = [];

  if ('expectedAmount' in payload) result.expectedAmount = asNumber(payload.expectedAmount);
  if ('actualReceived' in payload) result.actualReceived = asNumber(payload.actualReceived);
  if ('receivedDate' in payload) result.receivedDate = asText(payload.receivedDate);
  if ('dueDate' in payload) result.dueDate = asText(payload.dueDate);
  if ('status' in payload) result.status = asEnum(payload.status, COMMISSION_STATUS);

  if ('expectedAmount' in payload && (result.expectedAmount === undefined || result.expectedAmount < 0)) {
    errors.push('expectedAmount inválido');
  }
  if ('actualReceived' in payload && (result.actualReceived === undefined || result.actualReceived < 0)) {
    errors.push('actualReceived inválido');
  }
  if ('status' in payload && !result.status) errors.push('status inválido');

  if (errors.length > 0) return failure(errors);
  return success(result);
}
