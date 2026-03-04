import type { SystemRole } from './roles';

export type PermissionAction = 'read' | 'write' | 'delete' | 'approve' | 'reconcile';

export type PermissionResource =
  | 'leads'
  | 'clients'
  | 'suppliers'
  | 'messaging'
  | 'dashboard'
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
    'read:suppliers',
    'write:suppliers',
    'read:messaging',
    'write:messaging',
    'read:dashboard',
    'write:dashboard',
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
    'read:suppliers',
    'write:suppliers',
    'read:messaging',
    'write:messaging',
    'read:dashboard',
    'write:dashboard',
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
    'read:suppliers',
    'read:messaging',
    'read:dashboard',
    'write:messaging',
    'read:itineraries',
    'write:itineraries'
  ],
  accountant: [
    'read:suppliers',
    'read:dashboard',
    'read:financials',
    'write:financials',
    'read:commissions',
    'reconcile:commissions'
  ],
  external_dmc: ['read:clients', 'read:suppliers', 'read:itineraries']
};
