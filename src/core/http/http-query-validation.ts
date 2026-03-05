import { failure, success, type ValidationResult } from '../validation/validation-types';
import { asOptionalText, isIsoDateTime, parseBoundedInt } from './http-query-params';

interface BoundedIntConfig {
  defaultValue: number;
  min: number;
  max: number;
}

export interface CfdiReadQueryValidationOptions {
  limit?: BoundedIntConfig;
  windowDays?: BoundedIntConfig;
}

export interface CfdiReadQueryValidationValue {
  from?: string;
  to?: string;
  limit?: number;
  windowDays?: number;
}

export function validateCfdiReadQueryParams(
  searchParams: URLSearchParams,
  options: CfdiReadQueryValidationOptions = {}
): ValidationResult<CfdiReadQueryValidationValue> {
  const from = asOptionalText(searchParams.get('from'));
  const to = asOptionalText(searchParams.get('to'));

  const errors: string[] = [];
  if (from && !isIsoDateTime(from)) errors.push('from inválido');
  if (to && !isIsoDateTime(to)) errors.push('to inválido');

  if (errors.length > 0) {
    return failure(errors);
  }

  return success({
    from,
    to,
    limit: options.limit
      ? parseBoundedInt(searchParams.get('limit'), options.limit.defaultValue, options.limit.min, options.limit.max)
      : undefined,
    windowDays: options.windowDays
      ? parseBoundedInt(
          searchParams.get('windowDays'),
          options.windowDays.defaultValue,
          options.windowDays.min,
          options.windowDays.max
        )
      : undefined
  });
}
