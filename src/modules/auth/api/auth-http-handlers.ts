import type { IncomingMessage, ServerResponse } from 'node:http';
import { getUserContextFromHeaders } from '../../../core/auth/request-auth';
import type { RefreshTokenService } from '../../../core/auth/refresh-token-service';
import type { RefreshTokenMetrics } from '../../../core/auth/refresh-token-metrics';
import { readJsonBody, sendJson } from '../../../core/http/http-utils';

export interface AuthRouteContext {
  req: IncomingMessage;
  res: ServerResponse;
  locale: string;
  pathSegments: string[];
}

function unauthenticatedMessage(locale: string): string {
  return locale === 'es-MX' ? 'No autenticado' : 'Unauthenticated';
}

function invalidRefreshMessage(locale: string): string {
  return locale === 'es-MX' ? 'Refresh token inválido o expirado' : 'Invalid or expired refresh token';
}

function missingRefreshMessage(locale: string): string {
  return locale === 'es-MX' ? 'refreshToken es requerido' : 'refreshToken is required';
}

function forbiddenMessage(locale: string): string {
  return locale === 'es-MX' ? 'Acceso denegado' : 'Access denied';
}

function hasAuthPath(pathSegments: string[]): boolean {
  return pathSegments[0] === 'auth';
}

function readRefreshToken(payload: Record<string, unknown>): string | null {
  const value = payload.refreshToken;
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function readUserId(payload: Record<string, unknown>): string | null {
  const value = payload.userId;
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function canManageAllSessions(role: string): boolean {
  return role === 'owner' || role === 'manager';
}

async function handleIssue(context: AuthRouteContext, service: RefreshTokenService): Promise<void> {
  const user = getUserContextFromHeaders(context.req);
  if (!user) {
    sendJson(context.res, 401, { message: unauthenticatedMessage(context.locale) });
    return;
  }

  const pair = await service.issue(user);
  sendJson(context.res, 200, { data: pair });
}

async function handleRefresh(context: AuthRouteContext, service: RefreshTokenService): Promise<void> {
  const payload = await readJsonBody(context.req);
  const refreshToken = readRefreshToken(payload);
  if (!refreshToken) {
    sendJson(context.res, 400, { message: missingRefreshMessage(context.locale) });
    return;
  }

  const pair = await service.rotate(refreshToken);
  if (!pair) {
    sendJson(context.res, 401, { message: invalidRefreshMessage(context.locale) });
    return;
  }

  sendJson(context.res, 200, { data: pair });
}

async function handleRevoke(context: AuthRouteContext, service: RefreshTokenService): Promise<void> {
  const payload = await readJsonBody(context.req);
  const refreshToken = readRefreshToken(payload);
  if (!refreshToken) {
    sendJson(context.res, 400, { message: missingRefreshMessage(context.locale) });
    return;
  }

  const revoked = await service.revoke(refreshToken);
  if (!revoked) {
    sendJson(context.res, 401, { message: invalidRefreshMessage(context.locale) });
    return;
  }

  sendJson(context.res, 200, { data: { revoked: true } });
}

async function handleRevokeAll(context: AuthRouteContext, service: RefreshTokenService): Promise<void> {
  const user = getUserContextFromHeaders(context.req);
  if (!user) {
    sendJson(context.res, 401, { message: unauthenticatedMessage(context.locale) });
    return;
  }

  const payload = await readJsonBody(context.req);
  const requestedUserId = readUserId(payload);
  const targetUserId = requestedUserId ?? user.userId;

  if (targetUserId !== user.userId && !canManageAllSessions(user.role)) {
    sendJson(context.res, 403, { message: forbiddenMessage(context.locale) });
    return;
  }

  const revokedCount = await service.revokeAllForUser(targetUserId);
  sendJson(context.res, 200, { data: { userId: targetUserId, revokedCount } });
}

async function handlePrune(context: AuthRouteContext, service: RefreshTokenService): Promise<void> {
  const user = getUserContextFromHeaders(context.req);
  if (!user) {
    sendJson(context.res, 401, { message: unauthenticatedMessage(context.locale) });
    return;
  }

  if (!canManageAllSessions(user.role)) {
    sendJson(context.res, 403, { message: forbiddenMessage(context.locale) });
    return;
  }

  const deletedCount = await service.pruneExpired();
  sendJson(context.res, 200, { data: { deletedCount } });
}

function handleMetrics(
  context: AuthRouteContext,
  metrics: RefreshTokenMetrics
): void {
  const user = getUserContextFromHeaders(context.req);
  if (!user) {
    sendJson(context.res, 401, { message: unauthenticatedMessage(context.locale) });
    return;
  }

  if (!canManageAllSessions(user.role)) {
    sendJson(context.res, 403, { message: forbiddenMessage(context.locale) });
    return;
  }

  sendJson(context.res, 200, { data: metrics.snapshot() });
}

function handlePromMetrics(
  context: AuthRouteContext,
  metrics: RefreshTokenMetrics
): void {
  const user = getUserContextFromHeaders(context.req);
  if (!user) {
    sendJson(context.res, 401, { message: unauthenticatedMessage(context.locale) });
    return;
  }

  if (!canManageAllSessions(user.role)) {
    sendJson(context.res, 403, { message: forbiddenMessage(context.locale) });
    return;
  }

  context.res.statusCode = 200;
  context.res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
  context.res.end(metrics.toPrometheus());
}

export async function handleAuthRoutes(
  context: AuthRouteContext,
  service: RefreshTokenService,
  metrics: RefreshTokenMetrics
): Promise<boolean> {
  const { req, pathSegments } = context;
  if (!hasAuthPath(pathSegments) || (pathSegments.length !== 2 && pathSegments.length !== 3)) return false;

  if (pathSegments[1] === 'metrics' && pathSegments[2] === 'prom' && req.method === 'GET') {
    handlePromMetrics(context, metrics);
    return true;
  }

  if (pathSegments.length !== 2) return false;

  if (pathSegments[1] === 'token' && req.method === 'POST') {
    await handleIssue(context, service);
    return true;
  }

  if (pathSegments[1] === 'refresh' && req.method === 'POST') {
    await handleRefresh(context, service);
    return true;
  }

  if (pathSegments[1] === 'revoke' && req.method === 'POST') {
    await handleRevoke(context, service);
    return true;
  }

  if (pathSegments[1] === 'revoke-all' && req.method === 'POST') {
    await handleRevokeAll(context, service);
    return true;
  }

  if (pathSegments[1] === 'prune' && req.method === 'POST') {
    await handlePrune(context, service);
    return true;
  }

  if (pathSegments[1] === 'metrics' && req.method === 'GET') {
    handleMetrics(context, metrics);
    return true;
  }

  return false;
}
