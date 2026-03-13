import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { extractLocale, notFound, parsePathSegments, sendJson } from './core/http/http-utils';
import { buildRepositories, type RepositoryBundle } from './core/bootstrap/repositories';
import type { AuthMode } from './core/auth/request-auth';
import { buildRefreshTokenService } from './core/auth/refresh-token-bootstrap';
import type { RefreshTokenService } from './core/auth/refresh-token-service';
import { startRefreshPruneJob } from './core/auth/refresh-prune-job';
import { RefreshTokenMetrics } from './core/auth/refresh-token-metrics';
import type { RefreshTokenMetricsSink } from './core/auth/refresh-token-metrics';
import { OpenTelemetryRefreshTokenMetricsSink } from './core/auth/otel-refresh-token-metrics-sink';
import { InstrumentedRefreshTokenService } from './core/auth/instrumented-refresh-token-service';
import { handleAuthRoutes } from './modules/auth/api/auth-http-handlers';
import { dispatchModuleRoute } from './core/http/module-route-dispatcher';

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

      const moduleRoute = dispatchModuleRoute({ req, res, pathSegments, locale, repositories, authMode });
      if (moduleRoute) return moduleRoute;

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
