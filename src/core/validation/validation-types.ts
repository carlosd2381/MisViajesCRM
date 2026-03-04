export interface ValidationSuccess<T> {
  ok: true;
  value: T;
}

export interface ValidationFailure {
  ok: false;
  errors: string[];
}

export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

export function success<T>(value: T): ValidationSuccess<T> {
  return { ok: true, value };
}

export function failure(errors: string[]): ValidationFailure {
  return { ok: false, errors };
}
