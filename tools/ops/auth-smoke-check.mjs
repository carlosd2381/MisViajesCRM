import { issueSmokeTokenPair, smokeHeaders } from './smoke-auth-helpers.mjs';
import {
  smokeExpectedMessage,
  smokeExpectLocalizedMessage,
  smokeExpectStatus
} from './smoke-common-helpers.mjs';

const BASE_URL = process.env.AUTH_SMOKE_BASE_URL ?? 'http://127.0.0.1:3000';
const LOCALE = process.env.AUTH_SMOKE_LOCALE ?? 'es-MX';
const AGENT_ID = process.env.AUTH_SMOKE_AGENT_ID ?? 'smoke_agent';
const AGENT_ROLE = process.env.AUTH_SMOKE_AGENT_ROLE ?? 'agent';
const MANAGER_ID = process.env.AUTH_SMOKE_MANAGER_ID ?? 'smoke_manager';
const MANAGER_ROLE = process.env.AUTH_SMOKE_MANAGER_ROLE ?? 'manager';
const VERIFY_TOKEN_MODE = (process.env.AUTH_SMOKE_VERIFY_TOKEN_MODE ?? 'false').toLowerCase() === 'true';

function expectedMessage(spanish, english) {
  return smokeExpectedMessage(LOCALE, spanish, english);
}

function headers(userId, role, contentType = 'application/json') {
  return smokeHeaders(LOCALE, userId, role, contentType);
}

async function request(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, options);
  return response;
}

async function assertNegativeAuthScenarios() {
  const unauthMetrics = await request('/auth/metrics', {
    method: 'GET',
    headers: { 'x-locale': LOCALE }
  });
  await smokeExpectStatus('unauth metrics', unauthMetrics, 401);
  await smokeExpectLocalizedMessage('unauth metrics message', unauthMetrics, LOCALE, 'No autenticado', 'Unauthenticated');

  const forbiddenMetrics = await request('/auth/metrics', {
    method: 'GET',
    headers: headers(AGENT_ID, AGENT_ROLE)
  });
  await smokeExpectStatus('forbidden metrics', forbiddenMetrics, 403);
  await smokeExpectLocalizedMessage('forbidden metrics message', forbiddenMetrics, LOCALE, 'Acceso denegado', 'Access denied');

  const invalidRefresh = await request('/auth/refresh', {
    method: 'POST',
    headers: headers(AGENT_ID, AGENT_ROLE),
    body: JSON.stringify({ refreshToken: 'smoke_invalid_refresh_token' })
  });
  await smokeExpectStatus('invalid refresh', invalidRefresh, 401);
  await smokeExpectLocalizedMessage(
    'invalid refresh message',
    invalidRefresh,
    LOCALE,
    'Refresh token inválido o expirado',
    'Invalid or expired refresh token'
  );
}

async function assertTokenModeNegativeScenario() {
  const unauthProtectedRoute = await request('/leads', {
    method: 'GET',
    headers: { 'x-locale': LOCALE }
  });

  await smokeExpectStatus('token mode unauth protected route', unauthProtectedRoute, 401);
  await smokeExpectLocalizedMessage(
    'token mode unauth protected route message',
    unauthProtectedRoute,
    LOCALE,
    'No autenticado',
    'Unauthenticated'
  );
}

async function run() {
  console.log(`Running auth smoke-check against ${BASE_URL}`);

  const health = await request('/health');
  await smokeExpectStatus('health', health, 200);

  await assertNegativeAuthScenarios();

  const issuedPair = await issueSmokeTokenPair({
    request,
    locale: LOCALE,
    userId: AGENT_ID,
    role: AGENT_ROLE,
    context: 'issue token'
  });
  const accessToken = issuedPair.accessToken;
  const firstRefreshToken = issuedPair.refreshToken;

  if (VERIFY_TOKEN_MODE) {
    await assertTokenModeNegativeScenario();

    const protectedRoute = await request('/leads', {
      method: 'GET',
      headers: {
        authorization: `Bearer ${accessToken}`,
        'x-locale': LOCALE
      }
    });

    await smokeExpectStatus('token mode protected route', protectedRoute, 200);
  }

  const refresh = await request('/auth/refresh', {
    method: 'POST',
    headers: headers(AGENT_ID, AGENT_ROLE),
    body: JSON.stringify({ refreshToken: firstRefreshToken })
  });
  await smokeExpectStatus('refresh token', refresh, 200);

  const refreshData = await refresh.json();
  const secondRefreshToken = refreshData?.data?.refreshToken;
  if (!secondRefreshToken) {
    throw new Error('refresh token failed: rotated refreshToken missing');
  }

  const revoke = await request('/auth/revoke', {
    method: 'POST',
    headers: headers(AGENT_ID, AGENT_ROLE),
    body: JSON.stringify({ refreshToken: secondRefreshToken })
  });
  await smokeExpectStatus('revoke token', revoke, 200);

  const metrics = await request('/auth/metrics', {
    method: 'GET',
    headers: headers(MANAGER_ID, MANAGER_ROLE, 'application/json')
  });
  await smokeExpectStatus('metrics json', metrics, 200);

  const prom = await request('/auth/metrics/prom', {
    method: 'GET',
    headers: headers(MANAGER_ID, MANAGER_ROLE, 'application/json')
  });
  await smokeExpectStatus('metrics prom', prom, 200);

  const summary = {
    locale: LOCALE,
    verifyTokenMode: VERIFY_TOKEN_MODE,
    checkedNegativeScenarios: [
      'unauth_metrics_401',
      'forbidden_metrics_403',
      'invalid_refresh_401',
      ...(VERIFY_TOKEN_MODE ? ['token_mode_unauth_protected_401'] : [])
    ]
  };

  console.log(`AUTH_SMOKE_SUMMARY ${JSON.stringify(summary)}`);

  console.log('✅ Auth smoke-check passed.');
}

run().catch((error) => {
  console.error(`❌ Auth smoke-check failed: ${error.message}`);
  process.exit(1);
});
