import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { extractLocale, notFound, parsePathSegments, sendJson } from './core/http/http-utils';
import { buildRepositories, type RepositoryBundle } from './core/bootstrap/repositories';
import { authorizeRequest, type AuthMode } from './core/auth/request-auth';
import {
  permissionForCommissions,
  permissionForClients,
  permissionForDashboard,
  permissionForFinancials,
  permissionForItineraries,
  permissionForLeads,
  permissionForManagement,
  permissionForMessaging,
  permissionForSuppliers
} from './core/auth/route-permissions';
import type { PermissionKey } from './core/auth/permissions';
import { buildRefreshTokenService } from './core/auth/refresh-token-bootstrap';
import type { RefreshTokenService } from './core/auth/refresh-token-service';
import { startRefreshPruneJob } from './core/auth/refresh-prune-job';
import { RefreshTokenMetrics } from './core/auth/refresh-token-metrics';
import type { RefreshTokenMetricsSink } from './core/auth/refresh-token-metrics';
import { OpenTelemetryRefreshTokenMetricsSink } from './core/auth/otel-refresh-token-metrics-sink';
import { InstrumentedRefreshTokenService } from './core/auth/instrumented-refresh-token-service';
import { handleLeadsCollection, handleLeadResource } from './modules/leads/api/lead-http-handlers';
import { handleClientResource, handleClientsCollection } from './modules/clients/api/client-http-handlers';
import {
  handleSupplierResource,
  handleSuppliersCollection
} from './modules/suppliers/api/supplier-http-handlers';
import {
  handleCommissionResource,
  handleCommissionsCollection
} from './modules/commissions/api/commission-http-handlers';
import {
  handleFinancialResource,
  handleFinancialsCollection
} from './modules/financials/api/financial-http-handlers';
import {
  handleMessageResource,
  handleMessagingCollection
} from './modules/messaging/api/messaging-http-handlers';
import {
  handleDashboardCollection,
  handleDashboardResource
} from './modules/dashboard/api/dashboard-http-handlers';
import {
  handleManagementCollection,
  handleManagementResource
} from './modules/management/api/management-http-handlers';
import {
  handleItineraryItemsCollection,
  handleItinerariesCollection,
  handleItineraryApprove,
  handleItineraryResource
} from './modules/itinerary/api/itinerary-http-handlers';
import { handleAuthRoutes } from './modules/auth/api/auth-http-handlers';

export interface AppOptions {
  authMode?: AuthMode;
  refreshTokenService?: RefreshTokenService;
  refreshTokenMetrics?: RefreshTokenMetrics;
}

function parseTtl(value: string | undefined, fallback: number): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return fallback;
  return Math.floor(numeric);
}

function tokenServiceOptions() {
  return {
    accessTtlSeconds: parseTtl(process.env.AUTH_ACCESS_TTL_SECONDS, 900),
    refreshTtlSeconds: parseTtl(process.env.AUTH_REFRESH_TTL_SECONDS, 1209600)
  };
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (!value) return fallback;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'true' || normalized === '1' || normalized === 'yes') return true;
  if (normalized === 'false' || normalized === '0' || normalized === 'no') return false;
  return fallback;
}

function pruneJobOptions() {
  return {
    enabled: parseBoolean(process.env.AUTH_PRUNE_ENABLED, false),
    intervalMs: parseTtl(process.env.AUTH_PRUNE_INTERVAL_SECONDS, 900) * 1000
  };
}

function metricsOptions() {
  const sinks: RefreshTokenMetricsSink[] = [];
  if (parseBoolean(process.env.AUTH_OTEL_ENABLED, false)) {
    sinks.push(new OpenTelemetryRefreshTokenMetricsSink({
      meterName: process.env.AUTH_OTEL_METER_NAME ?? 'misviajescrm.auth'
    }));
  }

  return {
    logEnabled: parseBoolean(process.env.AUTH_METRICS_LOG_ENABLED, false),
    sinks
  };
}

function canProceed(
  req: IncomingMessage,
  res: ServerResponse,
  locale: string,
  permission: PermissionKey | null,
  authMode: AuthMode
): boolean {
  if (!permission) return false;
  return authorizeRequest(req, res, locale, permission, authMode);
}

function handleLeadsRoute(
  req: IncomingMessage,
  res: ServerResponse,
  pathSegments: string[],
  locale: string,
  repositories: RepositoryBundle,
  authMode: AuthMode
): Promise<void> | null {
  if (pathSegments[0] !== 'leads') return null;

  const permission = permissionForLeads(req.method);
  if (!canProceed(req, res, locale, permission, authMode)) return Promise.resolve();

  const context = { req, res, pathSegments, locale };
  if (pathSegments.length === 1) return handleLeadsCollection(context, repositories.leads);
  if (pathSegments.length === 2) return handleLeadResource(context, repositories.leads);
  return Promise.resolve();
}

function handleClientsRoute(
  req: IncomingMessage,
  res: ServerResponse,
  pathSegments: string[],
  locale: string,
  repositories: RepositoryBundle,
  authMode: AuthMode
): Promise<void> | null {
  if (pathSegments[0] !== 'clients') return null;

  const permission = permissionForClients(req.method);
  if (!canProceed(req, res, locale, permission, authMode)) return Promise.resolve();

  const context = { req, res, pathSegments, locale };
  if (pathSegments.length === 1) return handleClientsCollection(context, repositories.clients);
  if (pathSegments.length === 2) return handleClientResource(context, repositories.clients);
  return Promise.resolve();
}

function handleItinerariesRoute(
  req: IncomingMessage,
  res: ServerResponse,
  pathSegments: string[],
  locale: string,
  repositories: RepositoryBundle,
  authMode: AuthMode
): Promise<void> | null {
  if (pathSegments[0] !== 'itineraries') return null;

  const permission: PermissionKey | null =
    pathSegments.length === 3 && pathSegments[2] === 'approve' && req.method === 'POST'
      ? 'approve:itineraries'
      : permissionForItineraries(req.method);

  if (!canProceed(req, res, locale, permission, authMode)) return Promise.resolve();

  const context = { req, res, pathSegments, locale };
  if (pathSegments.length === 1) return handleItinerariesCollection(context, repositories.itineraries);
  if (pathSegments.length === 2) return handleItineraryResource(context, repositories.itineraries);
  if (pathSegments.length === 3 && pathSegments[2] === 'items') {
    return handleItineraryItemsCollection(context, repositories.itineraries);
  }
  if (pathSegments.length === 3 && pathSegments[2] === 'approve') {
    return handleItineraryApprove(context, repositories.itineraries);
  }
  return Promise.resolve();
}

function handleSuppliersRoute(
  req: IncomingMessage,
  res: ServerResponse,
  pathSegments: string[],
  locale: string,
  repositories: RepositoryBundle,
  authMode: AuthMode
): Promise<void> | null {
  if (pathSegments[0] !== 'suppliers') return null;

  const permission = permissionForSuppliers(req.method);
  if (!canProceed(req, res, locale, permission, authMode)) return Promise.resolve();

  const context = { req, res, pathSegments, locale };
  if (pathSegments.length === 1) return handleSuppliersCollection(context, repositories.suppliers);
  if (pathSegments.length === 2) return handleSupplierResource(context, repositories.suppliers);
  return Promise.resolve();
}

function handleCommissionsRoute(
  req: IncomingMessage,
  res: ServerResponse,
  pathSegments: string[],
  locale: string,
  repositories: RepositoryBundle,
  authMode: AuthMode
): Promise<void> | null {
  if (pathSegments[0] !== 'commissions') return null;

  const permission = permissionForCommissions(req.method);
  if (!canProceed(req, res, locale, permission, authMode)) return Promise.resolve();

  const context = { req, res, pathSegments, locale };
  if (pathSegments.length === 1) return handleCommissionsCollection(context, repositories.commissions);
  if (pathSegments.length === 2) return handleCommissionResource(context, repositories.commissions);
  return Promise.resolve();
}

function handleFinancialsRoute(
  req: IncomingMessage,
  res: ServerResponse,
  pathSegments: string[],
  locale: string,
  repositories: RepositoryBundle,
  authMode: AuthMode
): Promise<void> | null {
  if (pathSegments[0] !== 'financials') return null;

  const permission = permissionForFinancials(req.method);
  if (!canProceed(req, res, locale, permission, authMode)) return Promise.resolve();

  const context = { req, res, pathSegments, locale };
  if (pathSegments.length === 1) return handleFinancialsCollection(context, repositories.financials);
  if (pathSegments.length === 2) return handleFinancialResource(context, repositories.financials);
  return Promise.resolve();
}

function handleMessagingRoute(
  req: IncomingMessage,
  res: ServerResponse,
  pathSegments: string[],
  locale: string,
  repositories: RepositoryBundle,
  authMode: AuthMode
): Promise<void> | null {
  if (pathSegments[0] !== 'messaging') return null;

  const permission = permissionForMessaging(req.method);
  if (!canProceed(req, res, locale, permission, authMode)) return Promise.resolve();

  const context = { req, res, pathSegments, locale };
  if (pathSegments.length === 1) return handleMessagingCollection(context, repositories.messaging);
  if (pathSegments.length === 2) return handleMessageResource(context, repositories.messaging);
  return Promise.resolve();
}

function handleDashboardRoute(
  req: IncomingMessage,
  res: ServerResponse,
  pathSegments: string[],
  locale: string,
  repositories: RepositoryBundle,
  authMode: AuthMode
): Promise<void> | null {
  if (pathSegments[0] !== 'dashboard') return null;

  const permission = permissionForDashboard(req.method);
  if (!canProceed(req, res, locale, permission, authMode)) return Promise.resolve();

  const context = { req, res, pathSegments, locale };
  if (pathSegments.length === 1) return handleDashboardCollection(context, repositories.dashboard);
  if (pathSegments.length === 2) return handleDashboardResource(context, repositories.dashboard);
  return Promise.resolve();
}

function handleManagementRoute(
  req: IncomingMessage,
  res: ServerResponse,
  pathSegments: string[],
  locale: string,
  repositories: RepositoryBundle,
  authMode: AuthMode
): Promise<void> | null {
  if (pathSegments[0] !== 'management') return null;

  const permission = permissionForManagement(req.method);
  if (!canProceed(req, res, locale, permission, authMode)) return Promise.resolve();

  const context = { req, res, pathSegments, locale };
  if (pathSegments.length === 1) return handleManagementCollection(context, repositories.management);
  if (pathSegments.length === 2) return handleManagementResource(context, repositories.management);
  return Promise.resolve();
}

function handler(repositories: RepositoryBundle, options: AppOptions) {
  const authMode = options.authMode ?? 'header';
  const refreshTokens = options.refreshTokenService ?? buildRefreshTokenService(tokenServiceOptions());
  const metrics = options.refreshTokenMetrics ?? new RefreshTokenMetrics(metricsOptions());
  const authSessions = new InstrumentedRefreshTokenService(refreshTokens, metrics);

  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    try {
      const pathSegments = parsePathSegments(req.url);
      const locale = extractLocale(req);

      if (pathSegments[0] === 'health') {
        sendJson(res, 200, { status: 'ok', localeDefault: 'es-MX' });
        return;
      }

      const authHandled = await handleAuthRoutes({ req, res, pathSegments, locale }, authSessions, metrics);
      if (authHandled) return;

      const leadsRoute = handleLeadsRoute(req, res, pathSegments, locale, repositories, authMode);
      if (leadsRoute) return leadsRoute;

      const clientsRoute = handleClientsRoute(req, res, pathSegments, locale, repositories, authMode);
      if (clientsRoute) return clientsRoute;

      const suppliersRoute = handleSuppliersRoute(req, res, pathSegments, locale, repositories, authMode);
      if (suppliersRoute) return suppliersRoute;

      const commissionsRoute = handleCommissionsRoute(req, res, pathSegments, locale, repositories, authMode);
      if (commissionsRoute) return commissionsRoute;

      const financialsRoute = handleFinancialsRoute(req, res, pathSegments, locale, repositories, authMode);
      if (financialsRoute) return financialsRoute;

      const messagingRoute = handleMessagingRoute(req, res, pathSegments, locale, repositories, authMode);
      if (messagingRoute) return messagingRoute;

      const dashboardRoute = handleDashboardRoute(req, res, pathSegments, locale, repositories, authMode);
      if (dashboardRoute) return dashboardRoute;

      const managementRoute = handleManagementRoute(req, res, pathSegments, locale, repositories, authMode);
      if (managementRoute) return managementRoute;

      const itinerariesRoute = handleItinerariesRoute(req, res, pathSegments, locale, repositories, authMode);
      if (itinerariesRoute) return itinerariesRoute;

      notFound(res, locale);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected error';
      sendJson(res, 500, { message });
    }
  };
}

export function createApiServer(
  repositories: RepositoryBundle = buildRepositories(),
  options: AppOptions = {}
): Server {
  return createServer(handler(repositories, options));
}

export function startApiServer(port: number): Server {
  const authMode = (process.env.AUTH_MODE as AuthMode | undefined) ?? 'header';
  const metrics = new RefreshTokenMetrics(metricsOptions());
  const refreshTokens = buildRefreshTokenService(tokenServiceOptions());
  const authSessions = new InstrumentedRefreshTokenService(refreshTokens, metrics);
  const stopPruneJob = startRefreshPruneJob(authSessions, pruneJobOptions());
  const server = createApiServer(undefined, {
    authMode,
    refreshTokenService: refreshTokens,
    refreshTokenMetrics: metrics
  });

  server.on('close', stopPruneJob);
  server.listen(port, () => {
    const storageMode = process.env.STORAGE_MODE ?? 'memory';
    console.log(`API running at http://localhost:${port} (${storageMode}, auth=${authMode})`);
  });

  return server;
}
