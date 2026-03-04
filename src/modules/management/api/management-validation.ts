import { failure, success, type ValidationResult } from '../../../core/validation/validation-types';
import type {
  CreateManagementSettingRequest,
  UpdateManagementSettingRequest
} from './management-contracts';

type UnknownRecord = Record<string, unknown>;

function asText(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function isLowerSnakeCase(value: string): boolean {
  return /^[a-z0-9_]+$/.test(value);
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