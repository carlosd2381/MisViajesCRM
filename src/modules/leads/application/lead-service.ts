import type { CreateLeadRequest, UpdateLeadRequest } from '../api/lead-contracts';
import type { CreateClientRequest } from '../../clients/api/client-contracts';
import type { Lead } from '../domain/lead';

function nowIsoDate(): string {
  return new Date().toISOString();
}

function createEntityId(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${random}`;
}

export function mapCreateLeadToEntity(input: CreateLeadRequest): Lead {
  const timestamp = nowIsoDate();

  return {
    id: createEntityId('lead'),
    ...input,
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

export function mapUpdateLeadToEntity(current: Lead, input: UpdateLeadRequest): Lead {
  return {
    ...current,
    ...input,
    updatedAt: nowIsoDate()
  };
}

export function mapConvertLeadToClientRequest(lead: Lead, input: CreateClientRequest): CreateClientRequest {
  const leadPreferences: Record<string, string | number | boolean | string[]> = {
    leadDestination: lead.destination,
    leadStatus: lead.status,
    leadSource: lead.source,
    leadPriority: lead.priority,
    leadAdultsCount: lead.adultsCount,
    leadChildrenCount: lead.childrenCount
  };

  if (lead.budgetMin !== undefined) leadPreferences.leadBudgetMin = lead.budgetMin;
  if (lead.budgetMax !== undefined) leadPreferences.leadBudgetMax = lead.budgetMax;
  if (lead.budgetCurrency) leadPreferences.leadBudgetCurrency = lead.budgetCurrency;
  if (lead.tripType) leadPreferences.leadTripType = lead.tripType;

  return {
    ...input,
    leadId: lead.id,
    travelPreferences: {
      ...leadPreferences,
      ...(input.travelPreferences ?? {})
    }
  };
}

export function mapLeadToClosedWon(current: Lead): Lead {
  return {
    ...current,
    status: 'closed_won',
    updatedAt: nowIsoDate()
  };
}
