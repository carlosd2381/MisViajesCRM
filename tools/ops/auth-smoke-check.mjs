import { issueSmokeTokenPair, smokeHeaders } from './smoke-auth-helpers.mjs';
import { formatSmokeSummaryLine } from './smoke-summary-helpers.mjs';
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
let ACTIVE_BASE_URL = BASE_URL;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function expectedMessage(spanish, english) {
  return smokeExpectedMessage(LOCALE, spanish, english);
}

function headers(userId, role, contentType = 'application/json') {
  return smokeHeaders(LOCALE, userId, role, contentType);
}

async function request(path, options = {}) {
  const url = `${ACTIVE_BASE_URL}${path}`;

  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, options);
      return response;
    } catch (error) {
      lastError = error;
      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
    }
  }

  throw new Error(`request failed (${options.method ?? 'GET'} ${path}): ${lastError?.message ?? 'unknown error'}`);
}

async function waitForApiReady(attempts = 30) {
  const candidateBaseUrls = BASE_URL.includes('127.0.0.1')
    ? [BASE_URL, BASE_URL.replace('127.0.0.1', 'localhost')]
    : [BASE_URL];
  let lastDiagnostics = 'no attempts made';

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const diagnostics = [];
    for (const candidateBaseUrl of candidateBaseUrls) {
      try {
        const health = await fetch(`${candidateBaseUrl}/health`);
        diagnostics.push(`${candidateBaseUrl}=>${health.status}`);
        if (health.status === 200) {
          ACTIVE_BASE_URL = candidateBaseUrl;
          return;
        }
      } catch (error) {
        diagnostics.push(`${candidateBaseUrl}=>error:${error?.message ?? 'unknown'}`);
      }
    }

    lastDiagnostics = diagnostics.join(', ');

    await sleep(500);
  }

  throw new Error(`API not ready at ${BASE_URL}; last diagnostics: ${lastDiagnostics}`);
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

async function assertLeadConversionScenario(accessToken) {
  const leadCreateHeaders = VERIFY_TOKEN_MODE
    ? {
      authorization: `Bearer ${accessToken}`,
      'x-locale': LOCALE,
      'content-type': 'application/json'
    }
    : headers(AGENT_ID, AGENT_ROLE);

  const createLead = await request('/leads', {
    method: 'POST',
    headers: leadCreateHeaders,
    body: JSON.stringify({
      status: 'new',
      source: 'website',
      priority: 'high',
      destination: 'Cancún',
      adultsCount: 2,
      childrenCount: 0
    })
  });
  await smokeExpectStatus('lead create for conversion', createLead, 201);
  const createdLeadPayload = await createLead.json();
  const leadId = createdLeadPayload?.data?.id;
  if (!leadId) {
    throw new Error('lead create for conversion failed: lead id missing');
  }

  const convertPayload = {
    firstName: 'Smoke',
    paternalLastName: 'Conversion',
    contacts: [{ type: 'email', value: 'smoke-conversion@example.com' }]
  };

  const invalidConvert = await request(`/leads/${leadId}/convert`, {
    method: 'POST',
    headers: leadCreateHeaders,
    body: JSON.stringify({
      firstName: 'Smoke'
    })
  });
  await smokeExpectStatus('lead convert invalid payload', invalidConvert, 400);
  const invalidConvertPayload = await invalidConvert.json();
  const expectedInvalidMessage = expectedMessage('Solicitud inválida', 'Invalid request');
  if (invalidConvertPayload?.message !== expectedInvalidMessage) {
    throw new Error(
      `lead convert invalid payload message failed: expected "${expectedInvalidMessage}", got "${invalidConvertPayload?.message ?? ''}"`
    );
  }
  if (!Array.isArray(invalidConvertPayload?.errors) || invalidConvertPayload.errors.length < 1) {
    throw new Error('lead convert invalid payload errors failed: expected non-empty errors array');
  }

  const firstConvert = await request(`/leads/${leadId}/convert`, {
    method: 'POST',
    headers: leadCreateHeaders,
    body: JSON.stringify(convertPayload)
  });
  await smokeExpectStatus('lead convert success', firstConvert, 201);

  const duplicateConvert = await request(`/leads/${leadId}/convert`, {
    method: 'POST',
    headers: leadCreateHeaders,
    body: JSON.stringify(convertPayload)
  });
  await smokeExpectStatus('lead convert duplicate conflict', duplicateConvert, 409);
  await smokeExpectLocalizedMessage(
    'lead convert duplicate conflict message',
    duplicateConvert,
    LOCALE,
    'Lead ya convertido a cliente',
    'Lead already converted to client'
  );
}

async function run() {
  console.log(`Running auth smoke-check against ${BASE_URL}`);

  await waitForApiReady();
  if (ACTIVE_BASE_URL !== BASE_URL) {
    console.log(`Auth smoke-check fallback base URL in use: ${ACTIVE_BASE_URL}`);
  }

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

  await assertLeadConversionScenario(accessToken);

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
    ],
    checkedLeadConversion: {
      success201: true,
      duplicateConflict409: true,
      invalidPayload400: true,
      invalidPayloadErrorsArray: true
    }
  };

  console.log(formatSmokeSummaryLine('AUTH_SMOKE_SUMMARY', summary));

  console.log('✅ Auth smoke-check passed.');
}

run().catch((error) => {
  console.error(`❌ Auth smoke-check failed: ${error.message}`);
  process.exit(1);
});
