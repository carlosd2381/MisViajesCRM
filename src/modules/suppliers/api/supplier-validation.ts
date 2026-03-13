import { failure, success, type ValidationResult } from '../../../core/validation/validation-types';
import type { CreateSupplierRequest, UpdateSupplierRequest } from './supplier-contracts';
import {
  COMMISSION_TYPE,
  INTERNAL_RISK_FLAG,
  PAYOUT_TERMS,
  SUPPLIER_SERVICE_MODEL,
  SUPPLIER_STATUS,
  SUPPLIER_TIER_LEVEL,
  SUPPLIER_TYPE,
  type CommissionType,
  type InternalRiskFlag,
  type PayoutTerms,
  type SupplierServiceModel,
  type SupplierStatus,
  type SupplierTierLevel,
  type SupplierType
} from '../domain/supplier';

type UnknownRecord = Record<string, unknown>;

function asText(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function asDate(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  const parsed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(parsed)) return undefined;
  return parsed;
}

function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const result = value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter((item) => item.length > 0);
  return result;
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
  const serviceModel = asEnum<SupplierServiceModel>(payload.serviceModel, SUPPLIER_SERVICE_MODEL);
  const tierLevel = asEnum<SupplierTierLevel>(payload.tierLevel, SUPPLIER_TIER_LEVEL);
  const marketFocusTags = asStringArray(payload.marketFocusTags);
  const status = asEnum<SupplierStatus>(payload.status, SUPPLIER_STATUS);
  const defaultCurrency = asCurrency(payload.defaultCurrency);
  const commissionType = asEnum<CommissionType>(payload.commissionType, COMMISSION_TYPE);
  const commissionRate = asNumber(payload.commissionRate);
  const payoutTerms = asEnum<PayoutTerms>(payload.payoutTerms, PAYOUT_TERMS);
  const contractExpiryDate = asDate(payload.contractExpiryDate);
  const internalRating = asNumber(payload.internalRating);
  const responseTimeScore = asNumber(payload.responseTimeScore);
  const internalRiskFlag = asEnum<InternalRiskFlag>(payload.internalRiskFlag, INTERNAL_RISK_FLAG);

  if (!name) errors.push('name es requerido');
  if (!type) errors.push('type inválido');
  if (!status) errors.push('status inválido');
  if (!defaultCurrency) errors.push('defaultCurrency inválido');
  if (!commissionType) errors.push('commissionType inválido');
  if (commissionRate === undefined || commissionRate < 0) errors.push('commissionRate inválido');
  if (!payoutTerms) errors.push('payoutTerms inválido');
  if ('serviceModel' in payload && !serviceModel) errors.push('serviceModel inválido');
  if ('tierLevel' in payload && !tierLevel) errors.push('tierLevel inválido');
  if ('marketFocusTags' in payload && !marketFocusTags) errors.push('marketFocusTags inválido');
  if ('contractExpiryDate' in payload && !contractExpiryDate) errors.push('contractExpiryDate inválido');
  if ('internalRating' in payload && (internalRating === undefined || internalRating < 1 || internalRating > 5)) errors.push('internalRating inválido');
  if ('responseTimeScore' in payload && (responseTimeScore === undefined || responseTimeScore < 0 || responseTimeScore > 100)) {
    errors.push('responseTimeScore inválido');
  }
  if (!internalRiskFlag) errors.push('internalRiskFlag inválido');

  if (errors.length > 0) return failure(errors);

  return success({
    name: name as string,
    tradeName: asText(payload.tradeName),
    type: type as SupplierType,
    serviceModel,
    marketFocusTags: marketFocusTags ?? [],
    tierLevel,
    rfc: asText(payload.rfc),
    billingAddress: asText(payload.billingAddress),
    status: status as SupplierStatus,
    defaultCurrency: defaultCurrency as 'MXN' | 'USD' | 'EUR',
    commissionType: commissionType as CommissionType,
    commissionRate: commissionRate as number,
    payoutTerms: payoutTerms as PayoutTerms,
    contractExpiryDate,
    blackoutDates: asText(payload.blackoutDates),
    emergencyContactName: asText(payload.emergencyContactName),
    emergencyContactPhone: asText(payload.emergencyContactPhone),
    internalRating,
    responseTimeScore,
    internalRiskFlag: internalRiskFlag as InternalRiskFlag
  });
}

export function validateUpdateSupplier(payload: UnknownRecord): ValidationResult<UpdateSupplierRequest> {
  const result: UpdateSupplierRequest = {};
  const errors: string[] = [];

  if ('name' in payload) result.name = asText(payload.name);
  if ('tradeName' in payload) result.tradeName = asText(payload.tradeName);
  if ('type' in payload) result.type = asEnum(payload.type, SUPPLIER_TYPE);
  if ('serviceModel' in payload) result.serviceModel = asEnum(payload.serviceModel, SUPPLIER_SERVICE_MODEL);
  if ('marketFocusTags' in payload) result.marketFocusTags = asStringArray(payload.marketFocusTags);
  if ('tierLevel' in payload) result.tierLevel = asEnum(payload.tierLevel, SUPPLIER_TIER_LEVEL);
  if ('rfc' in payload) result.rfc = asText(payload.rfc);
  if ('billingAddress' in payload) result.billingAddress = asText(payload.billingAddress);
  if ('status' in payload) result.status = asEnum(payload.status, SUPPLIER_STATUS);
  if ('defaultCurrency' in payload) result.defaultCurrency = asCurrency(payload.defaultCurrency);
  if ('commissionType' in payload) result.commissionType = asEnum(payload.commissionType, COMMISSION_TYPE);
  if ('commissionRate' in payload) result.commissionRate = asNumber(payload.commissionRate);
  if ('payoutTerms' in payload) result.payoutTerms = asEnum(payload.payoutTerms, PAYOUT_TERMS);
  if ('contractExpiryDate' in payload) result.contractExpiryDate = asDate(payload.contractExpiryDate);
  if ('blackoutDates' in payload) result.blackoutDates = asText(payload.blackoutDates);
  if ('emergencyContactName' in payload) result.emergencyContactName = asText(payload.emergencyContactName);
  if ('emergencyContactPhone' in payload) result.emergencyContactPhone = asText(payload.emergencyContactPhone);
  if ('internalRating' in payload) result.internalRating = asNumber(payload.internalRating);
  if ('responseTimeScore' in payload) result.responseTimeScore = asNumber(payload.responseTimeScore);
  if ('internalRiskFlag' in payload) result.internalRiskFlag = asEnum(payload.internalRiskFlag, INTERNAL_RISK_FLAG);

  if ('type' in payload && !result.type) errors.push('type inválido');
  if ('serviceModel' in payload && !result.serviceModel) errors.push('serviceModel inválido');
  if ('marketFocusTags' in payload && !result.marketFocusTags) errors.push('marketFocusTags inválido');
  if ('tierLevel' in payload && !result.tierLevel) errors.push('tierLevel inválido');
  if ('status' in payload && !result.status) errors.push('status inválido');
  if ('defaultCurrency' in payload && !result.defaultCurrency) errors.push('defaultCurrency inválido');
  if ('commissionType' in payload && !result.commissionType) errors.push('commissionType inválido');
  if ('commissionRate' in payload && (result.commissionRate === undefined || result.commissionRate < 0)) {
    errors.push('commissionRate inválido');
  }
  if ('payoutTerms' in payload && !result.payoutTerms) errors.push('payoutTerms inválido');
  if ('contractExpiryDate' in payload && !result.contractExpiryDate) errors.push('contractExpiryDate inválido');
  if ('internalRating' in payload && (result.internalRating === undefined || result.internalRating < 1 || result.internalRating > 5)) {
    errors.push('internalRating inválido');
  }
  if ('responseTimeScore' in payload && (result.responseTimeScore === undefined || result.responseTimeScore < 0 || result.responseTimeScore > 100)) {
    errors.push('responseTimeScore inválido');
  }
  if ('internalRiskFlag' in payload && !result.internalRiskFlag) errors.push('internalRiskFlag inválido');

  if (errors.length > 0) return failure(errors);
  return success(result);
}
