import { ROLE_PERMISSIONS, type PermissionKey } from './permissions';
import type { SystemRole } from './roles';

export interface UserContext {
  userId: string;
  role: SystemRole;
}

export function hasPermission(user: UserContext, permission: PermissionKey): boolean {
  return ROLE_PERMISSIONS[user.role].includes(permission);
}

export function assertPermission(user: UserContext, permission: PermissionKey): void {
  if (hasPermission(user, permission)) {
    return;
  }

  const errorMessage = `Access denied for ${permission} with role ${user.role}`;
  throw new Error(errorMessage);
}
