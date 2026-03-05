import { failure, success, type ValidationResult } from '../../../core/validation/validation-types';
import type {
  CreateManagementSettingRequest,
  ValidateCfdiCancelRequest,
  ValidateCfdiStampRequest,
  UpdateManagementSettingRequest
} from './management-contracts';

type UnknownRecord = Record<string, unknown>;

function asText(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function isLowerSnakeCase(value: string): boolean {
  return /^[a-z0-9_]+$/.test(value);
}

function isIsoDate(value: string): boolean {
  return !Number.isNaN(Date.parse(value));
}

function isIsoCurrency(value: string): boolean {
  return /^[A-Z]{3}$/.test(value);
}

function isRfc(value: string): boolean {
  return /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/.test(value);
}

function isCfdiUuid(value: string): boolean {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(value);
}

export function validateCreateManagementSetting(
  payload: UnknownRecord
): ValidationResult<CreateManagementSettingRequest> {
  const errors: string[] = [];

  const key = asText(payload.key);
  const value = asText(payload.value);
  const description = asText(payload.description);

  if (!key) errors.push('key es requerido');
  if (key && !isLowerSnakeCase(key)) errors.push('key inválido');
  if (!value) errors.push('value es requerido');

  if (errors.length > 0) return failure(errors);

  return success({
    key: key as string,
    value: value as string,
    description
  });
}

export function validateUpdateManagementSetting(
  payload: UnknownRecord
): ValidationResult<UpdateManagementSettingRequest> {
  const errors: string[] = [];
  const result: UpdateManagementSettingRequest = {};

  if ('value' in payload) {
    result.value = asText(payload.value);
    if (!result.value) errors.push('value inválido');
  }

  if ('description' in payload) {
    const parsed = payload.description;
    if (parsed === null) {
      result.description = '';
    } else {
      result.description = asText(parsed);
      if (result.description === undefined) errors.push('description inválido');
    }
  }

  if (Object.keys(result).length === 0) errors.push('body vacío');
  if (errors.length > 0) return failure(errors);
  return success(result);
}

export function validateCfdiStampRequest(
  payload: UnknownRecord
): ValidationResult<ValidateCfdiStampRequest> {
  const errors: string[] = [];

  const invoiceId = asText(payload.invoiceId);
  const satCertificateId = asText(payload.satCertificateId);
  const rfcEmisor = asText(payload.rfcEmisor)?.toUpperCase();
  const rfcReceptor = asText(payload.rfcReceptor)?.toUpperCase();
  const currency = asText(payload.currency)?.toUpperCase();
  const issueDate = asText(payload.issueDate);
  const total = typeof payload.total === 'number' ? payload.total : Number.NaN;

  if (!invoiceId) errors.push('invoiceId es requerido');
  if (!satCertificateId) errors.push('satCertificateId es requerido');
  if (!rfcEmisor) errors.push('rfcEmisor es requerido');
  if (rfcEmisor && !isRfc(rfcEmisor)) errors.push('rfcEmisor inválido');
  if (!rfcReceptor) errors.push('rfcReceptor es requerido');
  if (rfcReceptor && !isRfc(rfcReceptor)) errors.push('rfcReceptor inválido');
  if (!currency) errors.push('currency es requerido');
  if (currency && !isIsoCurrency(currency)) errors.push('currency inválido');
  if (!Number.isFinite(total) || total <= 0) errors.push('total inválido');
  if (!issueDate) errors.push('issueDate es requerido');
  if (issueDate && !isIsoDate(issueDate)) errors.push('issueDate inválido');

  if (errors.length > 0) return failure(errors);

  return success({
    invoiceId: invoiceId as string,
    satCertificateId: satCertificateId as string,
    rfcEmisor: rfcEmisor as string,
    rfcReceptor: rfcReceptor as string,
    currency: currency as string,
    total,
    issueDate: issueDate as string
  });
}

export function validateCfdiCancelRequest(
  payload: UnknownRecord
): ValidationResult<ValidateCfdiCancelRequest> {
  const errors: string[] = [];

  const invoiceId = asText(payload.invoiceId);
  const cfdiUuid = asText(payload.cfdiUuid);
  const cancellationReason = asText(payload.cancellationReason) as ValidateCfdiCancelRequest['cancellationReason'] | undefined;
  const replacementCfdiUuid = asText(payload.replacementCfdiUuid);
  const cancelledAt = asText(payload.cancelledAt);

  if (!invoiceId) errors.push('invoiceId es requerido');
  if (!cfdiUuid) errors.push('cfdiUuid es requerido');
  if (cfdiUuid && !isCfdiUuid(cfdiUuid)) errors.push('cfdiUuid inválido');
  if (!cancellationReason) errors.push('cancellationReason es requerido');
  if (cancellationReason && !['01', '02', '03', '04'].includes(cancellationReason)) {
    errors.push('cancellationReason inválido');
  }
  if (cancellationReason === '01' && !replacementCfdiUuid) {
    errors.push('replacementCfdiUuid es requerido para cancellationReason=01');
  }
  if (replacementCfdiUuid && !isCfdiUuid(replacementCfdiUuid)) {
    errors.push('replacementCfdiUuid inválido');
  }
  if (!cancelledAt) errors.push('cancelledAt es requerido');
  if (cancelledAt && !isIsoDate(cancelledAt)) errors.push('cancelledAt inválido');

  if (errors.length > 0) return failure(errors);

  return success({
    invoiceId: invoiceId as string,
    cfdiUuid: cfdiUuid as string,
    cancellationReason: cancellationReason as ValidateCfdiCancelRequest['cancellationReason'],
    replacementCfdiUuid,
    cancelledAt: cancelledAt as string
  });
}