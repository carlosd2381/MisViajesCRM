import type { SystemRole } from './roles';

export type PermissionAction = 'read' | 'write' | 'delete' | 'approve' | 'reconcile';

export type PermissionResource =
  | 'leads'
  | 'clients'
  | 'itineraries'
  | 'financials'
  | 'commissions'
  | 'settings';

export type PermissionKey = `${PermissionAction}:${PermissionResource}`;

type RolePermissions = Record<SystemRole, PermissionKey[]>;

export const ROLE_PERMISSIONS: RolePermissions = {
  owner: [
    'read:leads',
    'write:leads',
    'delete:leads',
    'read:clients',
    'write:clients',
    'delete:clients',
    'read:itineraries',
    'write:itineraries',
    'approve:itineraries',
    'read:financials',
    'write:financials',
    'read:commissions',
    'reconcile:commissions',
    'read:settings',
    'write:settings'
  ],
  manager: [
    'read:leads',
    'write:leads',
    'read:clients',
    'write:clients',
    'read:itineraries',
    'write:itineraries',
    'approve:itineraries',
    'read:commissions'
  ],
  agent: [
    'read:leads',
    'write:leads',
    'read:clients',
    'write:clients',
    'read:itineraries',
    'write:itineraries'
  ],
  accountant: [
    'read:financials',
    'write:financials',
    'read:commissions',
    'reconcile:commissions'
  ],
  external_dmc: ['read:clients', 'read:itineraries']
};
