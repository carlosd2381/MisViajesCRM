import type { CreateLeadRequest, UpdateLeadRequest } from '../api/lead-contracts';
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
