import type { PermissionKey } from './permissions';

export function permissionForLeads(method: string | undefined): PermissionKey | null {
  if (method === 'GET') return 'read:leads';
  if (method === 'POST' || method === 'PATCH') return 'write:leads';
  return null;
}

export function permissionForClients(method: string | undefined): PermissionKey | null {
  if (method === 'GET') return 'read:clients';
  if (method === 'POST' || method === 'PATCH') return 'write:clients';
  return null;
}

export function permissionForSuppliers(method: string | undefined): PermissionKey | null {
  if (method === 'GET') return 'read:suppliers';
  if (method === 'POST' || method === 'PATCH') return 'write:suppliers';
  return null;
}

export function permissionForCommissions(method: string | undefined): PermissionKey | null {
  if (method === 'GET') return 'read:commissions';
  if (method === 'POST' || method === 'PATCH') return 'reconcile:commissions';
  return null;
}

export function permissionForFinancials(method: string | undefined): PermissionKey | null {
  if (method === 'GET') return 'read:financials';
  if (method === 'POST' || method === 'PATCH') return 'write:financials';
  return null;
}

export function permissionForMessaging(method: string | undefined): PermissionKey | null {
  if (method === 'GET') return 'read:messaging';
  if (method === 'POST' || method === 'PATCH') return 'write:messaging';
  return null;
}

export function permissionForItineraries(method: string | undefined): PermissionKey | null {
  if (method === 'GET') return 'read:itineraries';
  if (method === 'POST' || method === 'PATCH') return 'write:itineraries';
  return null;
}
