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

export function permissionForItineraries(method: string | undefined): PermissionKey | null {
  if (method === 'GET') return 'read:itineraries';
  if (method === 'POST' || method === 'PATCH') return 'write:itineraries';
  return null;
}
