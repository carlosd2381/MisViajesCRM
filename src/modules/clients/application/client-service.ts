import type { CreateClientRequest, UpdateClientRequest } from '../api/client-contracts';
import type { Client } from '../domain/client';

function nowIsoDate(): string {
  return new Date().toISOString();
}

function createEntityId(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${random}`;
}

function emptyArray<T>(value?: T[]): T[] {
  return value ?? [];
}

function emptyRecord(value?: Record<string, string | number | boolean | string[]>): Record<string, string | number | boolean | string[]> {
  return value ?? {};
}

export function mapCreateClientToEntity(input: CreateClientRequest): Client {
  const timestamp = nowIsoDate();

  return {
    id: createEntityId('client'),
    ...input,
    contacts: emptyArray(input.contacts),
    addresses: emptyArray(input.addresses),
    travelPreferences: emptyRecord(input.travelPreferences),
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

export function mapUpdateClientToEntity(current: Client, input: UpdateClientRequest): Client {
  return {
    ...current,
    ...input,
    contacts: input.contacts ?? current.contacts,
    addresses: input.addresses ?? current.addresses,
    travelPreferences: input.travelPreferences ?? current.travelPreferences,
    updatedAt: nowIsoDate()
  };
}
