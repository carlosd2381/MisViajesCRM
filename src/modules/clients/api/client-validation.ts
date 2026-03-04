import { failure, success, type ValidationResult } from '../../../core/validation/validation-types';
import type { ClientAddress, ClientContact } from '../domain/client';
import type { CreateClientRequest, UpdateClientRequest } from './client-contracts';

type UnknownRecord = Record<string, unknown>;
type PreferenceValue = string | number | boolean | string[];

function asText(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function isObject(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null;
}

function normalizePreferenceValue(value: unknown): PreferenceValue | undefined {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (Array.isArray(value) && value.every((item) => typeof item === 'string')) {
    return value as string[];
  }

  return undefined;
}

function parseTravelPreferences(value: unknown): Record<string, PreferenceValue> | undefined {
  if (!isObject(value)) return undefined;

  const output: Record<string, PreferenceValue> = {};
  for (const [key, item] of Object.entries(value)) {
    const normalized = normalizePreferenceValue(item);
    if (normalized !== undefined) {
      output[key] = normalized;
    }
  }

  return output;
}

function parseContacts(value: unknown): ClientContact[] | undefined {
  if (!Array.isArray(value)) return undefined;

  return value
    .filter(isObject)
    .map((item) => ({
      type: (item.type as ClientContact['type']) ?? 'email',
      value: asText(item.value) ?? ''
    }))
    .filter((item) => item.value.length > 0);
}

function parseAddresses(value: unknown): ClientAddress[] | undefined {
  if (!Array.isArray(value)) return undefined;

  return value
    .filter(isObject)
    .map((item) => ({
      type: (item.type as ClientAddress['type']) ?? 'personal',
      street1: asText(item.street1) ?? '',
      street2: asText(item.street2),
      city: asText(item.city) ?? '',
      state: asText(item.state) ?? '',
      zipCode: asText(item.zipCode) ?? '',
      country: asText(item.country) ?? ''
    }))
    .filter((item) => item.street1 && item.city && item.state && item.zipCode && item.country);
}

export function validateCreateClient(payload: UnknownRecord): ValidationResult<CreateClientRequest> {
  const firstName = asText(payload.firstName);
  const paternalLastName = asText(payload.paternalLastName);

  if (!firstName || !paternalLastName) {
    return failure(['firstName y paternalLastName son requeridos']);
  }

  return success({
    leadId: asText(payload.leadId),
    firstName,
    middleName: asText(payload.middleName),
    paternalLastName,
    maternalLastName: asText(payload.maternalLastName),
    gender: asText(payload.gender),
    birthDate: asText(payload.birthDate),
    anniversaryDate: asText(payload.anniversaryDate),
    companyName: asText(payload.companyName),
    jobTitle: asText(payload.jobTitle),
    website: asText(payload.website),
    contacts: parseContacts(payload.contacts),
    addresses: parseAddresses(payload.addresses),
    travelPreferences: parseTravelPreferences(payload.travelPreferences)
  });
}

export function validateUpdateClient(payload: UnknownRecord): ValidationResult<UpdateClientRequest> {
  return success({
    firstName: asText(payload.firstName),
    middleName: asText(payload.middleName),
    paternalLastName: asText(payload.paternalLastName),
    maternalLastName: asText(payload.maternalLastName),
    gender: asText(payload.gender),
    birthDate: asText(payload.birthDate),
    anniversaryDate: asText(payload.anniversaryDate),
    companyName: asText(payload.companyName),
    jobTitle: asText(payload.jobTitle),
    website: asText(payload.website),
    contacts: parseContacts(payload.contacts),
    addresses: parseAddresses(payload.addresses),
    travelPreferences: parseTravelPreferences(payload.travelPreferences)
  });
}
