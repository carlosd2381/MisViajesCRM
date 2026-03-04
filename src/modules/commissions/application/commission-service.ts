import type { CreateCommissionRequest, UpdateCommissionRequest } from '../api/commission-contracts';
import type { Commission } from '../domain/commission';

function nowIsoDate(): string {
  return new Date().toISOString();
}

function createEntityId(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${random}`;
}

export function mapCreateCommissionToEntity(input: CreateCommissionRequest): Commission {
  const timestamp = nowIsoDate();

  return {
    id: createEntityId('commission'),
    itineraryId: input.itineraryId,
    supplierId: input.supplierId,
    expectedAmount: input.expectedAmount,
    actualReceived: input.actualReceived,
    receivedDate: input.receivedDate,
    dueDate: input.dueDate,
    status: input.status ?? 'unclaimed',
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

export function mapUpdateCommissionToEntity(current: Commission, input: UpdateCommissionRequest): Commission {
  return {
    ...current,
    ...input,
    updatedAt: nowIsoDate()
  };
}
