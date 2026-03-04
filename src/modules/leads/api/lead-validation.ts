import { failure, success, type ValidationResult } from '../../../core/validation/validation-types';
import { LEAD_PRIORITY, LEAD_SOURCE, LEAD_STATUS, type LeadPriority, type LeadSource, type LeadStatus } from '../domain/lead';
import type { CreateLeadRequest, UpdateLeadRequest } from './lead-contracts';

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

function pushError(condition: boolean, errors: string[], message: string): void {
  if (!condition) errors.push(message);
}

export function validateCreateLead(payload: UnknownRecord): ValidationResult<CreateLeadRequest> {
  const errors: string[] = [];

  const status = asEnum<LeadStatus>(payload.status, LEAD_STATUS);
  const source = asEnum<LeadSource>(payload.source, LEAD_SOURCE);
  const priority = asEnum<LeadPriority>(payload.priority, LEAD_PRIORITY);
  const destination = asText(payload.destination);
  const adultsCount = asNumber(payload.adultsCount);
  const childrenCount = asNumber(payload.childrenCount);

  pushError(Boolean(status), errors, 'status inválido');
  pushError(Boolean(source), errors, 'source inválido');
  pushError(Boolean(priority), errors, 'priority inválido');
  pushError(Boolean(destination), errors, 'destination es requerido');
  pushError(typeof adultsCount === 'number' && adultsCount >= 0, errors, 'adultsCount inválido');
  pushError(typeof childrenCount === 'number' && childrenCount >= 0, errors, 'childrenCount inválido');

  if (errors.length > 0) return failure(errors);

  return success({
    status: status!,
    source: source!,
    priority: priority!,
    destination: destination!,
    travelStartDate: asText(payload.travelStartDate),
    travelEndDate: asText(payload.travelEndDate),
    adultsCount: adultsCount!,
    childrenCount: childrenCount!,
    budgetMin: asNumber(payload.budgetMin),
    budgetMax: asNumber(payload.budgetMax),
    budgetCurrency: asEnum(payload.budgetCurrency, ['MXN', 'USD', 'EUR'] as const),
    tripType: asText(payload.tripType),
    notes: asText(payload.notes),
    assignedAgentId: asText(payload.assignedAgentId)
  });
}

export function validateUpdateLead(payload: UnknownRecord): ValidationResult<UpdateLeadRequest> {
  const result: UpdateLeadRequest = {};
  const errors: string[] = [];

  if ('status' in payload) result.status = asEnum(payload.status, LEAD_STATUS);
  if ('source' in payload) result.source = asEnum(payload.source, LEAD_SOURCE);
  if ('priority' in payload) result.priority = asEnum(payload.priority, LEAD_PRIORITY);
  if ('destination' in payload) result.destination = asText(payload.destination);
  if ('travelStartDate' in payload) result.travelStartDate = asText(payload.travelStartDate);
  if ('travelEndDate' in payload) result.travelEndDate = asText(payload.travelEndDate);
  if ('adultsCount' in payload) result.adultsCount = asNumber(payload.adultsCount);
  if ('childrenCount' in payload) result.childrenCount = asNumber(payload.childrenCount);
  if ('budgetMin' in payload) result.budgetMin = asNumber(payload.budgetMin);
  if ('budgetMax' in payload) result.budgetMax = asNumber(payload.budgetMax);
  if ('budgetCurrency' in payload) result.budgetCurrency = asEnum(payload.budgetCurrency, ['MXN', 'USD', 'EUR'] as const);
  if ('tripType' in payload) result.tripType = asText(payload.tripType);
  if ('notes' in payload) result.notes = asText(payload.notes);
  if ('assignedAgentId' in payload) result.assignedAgentId = asText(payload.assignedAgentId);

  if ('adultsCount' in payload && typeof result.adultsCount !== 'number') errors.push('adultsCount inválido');
  if ('childrenCount' in payload && typeof result.childrenCount !== 'number') errors.push('childrenCount inválido');
  if ('status' in payload && !result.status) errors.push('status inválido');

  if (errors.length > 0) return failure(errors);
  return success(result);
}
