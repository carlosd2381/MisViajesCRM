import { failure, success, type ValidationResult } from '../../../core/validation/validation-types';
import type { CreateSupplierRequest, UpdateSupplierRequest } from './supplier-contracts';
import {
  COMMISSION_TYPE,
  INTERNAL_RISK_FLAG,
  PAYOUT_TERMS,
  SUPPLIER_STATUS,
  SUPPLIER_TYPE,
  type CommissionType,
  type InternalRiskFlag,
  type PayoutTerms,
  type SupplierStatus,
  type SupplierType
} from '../domain/supplier';

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

export function validateCreateSupplier(payload: UnknownRecord): ValidationResult<CreateSupplierRequest> {
  const errors: string[] = [];

  const name = asText(payload.name);
  const type = asEnum<SupplierType>(payload.type, SUPPLIER_TYPE);
  const status = asEnum<SupplierStatus>(payload.status, SUPPLIER_STATUS);
  const defaultCurrency = asCurrency(payload.defaultCurrency);
  const commissionType = asEnum<CommissionType>(payload.commissionType, COMMISSION_TYPE);
  const commissionRate = asNumber(payload.commissionRate);
  const payoutTerms = asEnum<PayoutTerms>(payload.payoutTerms, PAYOUT_TERMS);
  const internalRiskFlag = asEnum<InternalRiskFlag>(payload.internalRiskFlag, INTERNAL_RISK_FLAG);

  if (!name) errors.push('name es requerido');
  if (!type) errors.push('type inválido');
  if (!status) errors.push('status inválido');
  if (!defaultCurrency) errors.push('defaultCurrency inválido');
  if (!commissionType) errors.push('commissionType inválido');
  if (commissionRate === undefined || commissionRate < 0) errors.push('commissionRate inválido');
  if (!payoutTerms) errors.push('payoutTerms inválido');
  if (!internalRiskFlag) errors.push('internalRiskFlag inválido');

  if (errors.length > 0) return failure(errors);

  return success({
    name: name as string,
    tradeName: asText(payload.tradeName),
    type: type as SupplierType,
    rfc: asText(payload.rfc),
    status: status as SupplierStatus,
    defaultCurrency: defaultCurrency as 'MXN' | 'USD' | 'EUR',
    commissionType: commissionType as CommissionType,
    commissionRate: commissionRate as number,
    payoutTerms: payoutTerms as PayoutTerms,
    internalRiskFlag: internalRiskFlag as InternalRiskFlag
  });
}

export function validateUpdateSupplier(payload: UnknownRecord): ValidationResult<UpdateSupplierRequest> {
  const result: UpdateSupplierRequest = {};
  const errors: string[] = [];

  if ('name' in payload) result.name = asText(payload.name);
  if ('tradeName' in payload) result.tradeName = asText(payload.tradeName);
  if ('type' in payload) result.type = asEnum(payload.type, SUPPLIER_TYPE);
  if ('rfc' in payload) result.rfc = asText(payload.rfc);
  if ('status' in payload) result.status = asEnum(payload.status, SUPPLIER_STATUS);
  if ('defaultCurrency' in payload) result.defaultCurrency = asCurrency(payload.defaultCurrency);
  if ('commissionType' in payload) result.commissionType = asEnum(payload.commissionType, COMMISSION_TYPE);
  if ('commissionRate' in payload) result.commissionRate = asNumber(payload.commissionRate);
  if ('payoutTerms' in payload) result.payoutTerms = asEnum(payload.payoutTerms, PAYOUT_TERMS);
  if ('internalRiskFlag' in payload) result.internalRiskFlag = asEnum(payload.internalRiskFlag, INTERNAL_RISK_FLAG);

  if ('type' in payload && !result.type) errors.push('type inválido');
  if ('status' in payload && !result.status) errors.push('status inválido');
  if ('defaultCurrency' in payload && !result.defaultCurrency) errors.push('defaultCurrency inválido');
  if ('commissionType' in payload && !result.commissionType) errors.push('commissionType inválido');
  if ('commissionRate' in payload && (result.commissionRate === undefined || result.commissionRate < 0)) {
    errors.push('commissionRate inválido');
  }
  if ('payoutTerms' in payload && !result.payoutTerms) errors.push('payoutTerms inválido');
  if ('internalRiskFlag' in payload && !result.internalRiskFlag) errors.push('internalRiskFlag inválido');

  if (errors.length > 0) return failure(errors);
  return success(result);
}
