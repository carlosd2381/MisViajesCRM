import type { IncomingMessage, ServerResponse } from 'node:http';
import { assertPermission, type UserContext } from './rbac-service';
import { isSystemRole } from './roles';
import type { PermissionKey } from './permissions';
import { sendJson } from '../http/http-utils';
import { verifyAuthToken } from './token-service';

export type AuthMode = 'header' | 'token';

function getHeader(req: IncomingMessage, name: string): string | undefined {
  const value = req.headers[name];
  if (!value) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

export function getUserContextFromHeaders(req: IncomingMessage): UserContext | null {
  const userId = getHeader(req, 'x-user-id');
  const role = getHeader(req, 'x-user-role');

  if (!userId || !role || !isSystemRole(role)) {
    return null;
  }

  return { userId, role };
}

function getBearerToken(req: IncomingMessage): string | null {
  const header = getHeader(req, 'authorization');
  if (!header) return null;

  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  return token;
}

function getUserContextFromToken(req: IncomingMessage): UserContext | null {
  const token = getBearerToken(req);
  if (!token) return null;
  return verifyAuthToken(token);
}

function getUserContext(req: IncomingMessage, authMode: AuthMode): UserContext | null {
  if (authMode === 'token') return getUserContextFromToken(req);
  return getUserContextFromHeaders(req);
}

function authMessage(locale: string): string {
  return locale === 'es-MX' ? 'No autenticado' : 'Unauthenticated';
}

function forbiddenMessage(locale: string): string {
  return locale === 'es-MX' ? 'Acceso denegado' : 'Access denied';
}

export function authorizeRequest(
  req: IncomingMessage,
  res: ServerResponse,
  locale: string,
  permission: PermissionKey,
  authMode: AuthMode
): boolean {
  const user = getUserContext(req, authMode);

  if (!user) {
    sendJson(res, 401, { message: authMessage(locale) });
    return false;
  }

  try {
    assertPermission(user, permission);
    return true;
  } catch {
    sendJson(res, 403, { message: forbiddenMessage(locale), permission });
    return false;
  }
}
