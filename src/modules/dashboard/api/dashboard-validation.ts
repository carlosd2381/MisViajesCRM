import { failure, success, type ValidationResult } from '../../../core/validation/validation-types';
import type {
  CreateDashboardSnapshotRequest,
  UpdateDashboardSnapshotRequest
} from './dashboard-contracts';

type UnknownRecord = Record<string, unknown>;

function asText(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function requireNonNegative(name: string, value: number | undefined, errors: string[]): void {
  if (value === undefined || value < 0) errors.push(`${name} inválido`);
}

export function validateCreateDashboardSnapshot(
  payload: UnknownRecord
): ValidationResult<CreateDashboardSnapshotRequest> {
  const errors: string[] = [];

  const periodStart = asText(payload.periodStart);
  const periodEnd = asText(payload.periodEnd);
  const leadsTotal = asNumber(payload.leadsTotal);
  const leadsWon = asNumber(payload.leadsWon);
  const itinerariesAccepted = asNumber(payload.itinerariesAccepted);
  const commissionsPending = asNumber(payload.commissionsPending);
  const commissionsPaid = asNumber(payload.commissionsPaid);
  const revenueMxn = asNumber(payload.revenueMxn);
  const profitMxn = asNumber(payload.profitMxn);

  if (!periodStart) errors.push('periodStart es requerido');
  if (!periodEnd) errors.push('periodEnd es requerido');
  requireNonNegative('leadsTotal', leadsTotal, errors);
  requireNonNegative('leadsWon', leadsWon, errors);
  requireNonNegative('itinerariesAccepted', itinerariesAccepted, errors);
  requireNonNegative('commissionsPending', commissionsPending, errors);
  requireNonNegative('commissionsPaid', commissionsPaid, errors);
  requireNonNegative('revenueMxn', revenueMxn, errors);
  requireNonNegative('profitMxn', profitMxn, errors);

  if (errors.length > 0) return failure(errors);

  return success({
    periodStart: periodStart as string,
    periodEnd: periodEnd as string,
    leadsTotal: leadsTotal as number,
    leadsWon: leadsWon as number,
    itinerariesAccepted: itinerariesAccepted as number,
    commissionsPending: commissionsPending as number,
    commissionsPaid: commissionsPaid as number,
    revenueMxn: revenueMxn as number,
    profitMxn: profitMxn as number
  });
}

export function validateUpdateDashboardSnapshot(
  payload: UnknownRecord
): ValidationResult<UpdateDashboardSnapshotRequest> {
  const errors: string[] = [];
  const result: UpdateDashboardSnapshotRequest = {};

  if ('leadsTotal' in payload) result.leadsTotal = asNumber(payload.leadsTotal);
  if ('leadsWon' in payload) result.leadsWon = asNumber(payload.leadsWon);
  if ('itinerariesAccepted' in payload) result.itinerariesAccepted = asNumber(payload.itinerariesAccepted);
  if ('commissionsPending' in payload) result.commissionsPending = asNumber(payload.commissionsPending);
  if ('commissionsPaid' in payload) result.commissionsPaid = asNumber(payload.commissionsPaid);
  if ('revenueMxn' in payload) result.revenueMxn = asNumber(payload.revenueMxn);
  if ('profitMxn' in payload) result.profitMxn = asNumber(payload.profitMxn);

  for (const [key, value] of Object.entries(result)) {
    if (value === undefined || value < 0) errors.push(`${key} inválido`);
  }

  if (errors.length > 0) return failure(errors);
  return success(result);
}
