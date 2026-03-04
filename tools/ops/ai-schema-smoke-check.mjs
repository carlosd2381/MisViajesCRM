import { resolveSmokeAuthHeaders, smokeHeaders } from './smoke-auth-helpers.mjs';
import { smokeAssert, smokeExpectedMessage } from './smoke-common-helpers.mjs';
import { formatSmokeSummaryLine } from './smoke-summary-helpers.mjs';

const BASE_URL = process.env.AI_SCHEMA_SMOKE_BASE_URL ?? 'http://127.0.0.1:3000';
const LOCALE = process.env.AI_SCHEMA_SMOKE_LOCALE ?? 'es-MX';
const AGENT_ID = process.env.AI_SCHEMA_SMOKE_AGENT_ID ?? 'smoke_agent';
const AGENT_ROLE = process.env.AI_SCHEMA_SMOKE_AGENT_ROLE ?? 'agent';
const EXPECTED_SCHEMA_VERSION = process.env.AI_SCHEMA_SMOKE_EXPECTED_SCHEMA_VERSION ?? 'ai-proposal.v1';
const AUTH_MODE = process.env.AI_SCHEMA_SMOKE_AUTH_MODE ?? 'header';

function headers(userId, role, contentType = 'application/json') {
  return smokeHeaders(LOCALE, userId, role, contentType);
}

async function request(path, options = {}) {
  return fetch(`${BASE_URL}${path}`, options);
}

function assert(condition, message) {
  smokeAssert(condition, message);
}

function expectedMessage(spanish, english) {
  return smokeExpectedMessage(LOCALE, spanish, english);
}

function isTokenMode() {
  return AUTH_MODE === 'token';
}

function expectArray(value, name) {
  assert(Array.isArray(value), `${name} should be an array`);
}

function findWarningByCode(warningsCatalog, code) {
  const warning = warningsCatalog.find((candidate) => candidate.code === code);
  assert(Boolean(warning), `${code} warning missing`);
  return warning;
}

function assertLocaleDescription(summaryWarning) {
  if (LOCALE === 'en-US') {
    assert(
      summaryWarning.description.includes('summary'),
      'en-US warning description should include "summary"'
    );
    return;
  }

  assert(summaryWarning.description.includes('resumen'), 'es-MX warning description should include "resumen"');
}

function assertSectionOrder(sectionOrder) {
  const expectedSectionOrder = ['storyteller', 'auditor', 'ghost_writer', 'local_insider'];
  assert(
    sectionOrder.length === expectedSectionOrder.length,
    `sectionOrder length mismatch: expected ${expectedSectionOrder.length}, got ${sectionOrder.length}`
  );

  for (let index = 0; index < expectedSectionOrder.length; index += 1) {
    assert(
      sectionOrder[index] === expectedSectionOrder[index],
      `sectionOrder mismatch at index ${index}: expected ${expectedSectionOrder[index]}, got ${sectionOrder[index]}`
    );
  }
}

async function assertUnauthorizedScenarios() {
  const anonymousResponse = await request(`/ai/schema/proposal?locale=${encodeURIComponent(LOCALE)}`, {
    method: 'GET',
    headers: { 'x-locale': LOCALE }
  });
  assert(
    anonymousResponse.status === 401,
    `anonymous schema request should return 401, got ${anonymousResponse.status}`
  );
  const anonymousPayload = await anonymousResponse.json();
  assert(
    anonymousPayload?.message === expectedMessage('No autenticado', 'Unauthenticated'),
    'anonymous schema request message localization mismatch'
  );

  if (isTokenMode()) {
    const invalidTokenResponse = await request(`/ai/schema/proposal?locale=${encodeURIComponent(LOCALE)}`, {
      method: 'GET',
      headers: {
        authorization: 'Bearer smoke_invalid_token',
        'x-locale': LOCALE
      }
    });

    assert(
      invalidTokenResponse.status === 401,
      `invalid token schema request should return 401, got ${invalidTokenResponse.status}`
    );

    const invalidTokenPayload = await invalidTokenResponse.json();
    assert(
      invalidTokenPayload?.message === expectedMessage('No autenticado', 'Unauthenticated'),
      'invalid token schema request message localization mismatch'
    );

    return;
  }

  const invalidRoleResponse = await request(`/ai/schema/proposal?locale=${encodeURIComponent(LOCALE)}`, {
    method: 'GET',
    headers: headers(AGENT_ID, 'invalid_role')
  });
  assert(
    invalidRoleResponse.status === 401,
    `invalid role schema request should return 401, got ${invalidRoleResponse.status}`
  );

  const invalidRolePayload = await invalidRoleResponse.json();
  assert(
    invalidRolePayload?.message === expectedMessage('No autenticado', 'Unauthenticated'),
    'invalid role schema request message localization mismatch'
  );
}

async function resolveSchemaAuthHeaders() {
  return resolveSmokeAuthHeaders({
    authMode: AUTH_MODE,
    request,
    locale: LOCALE,
    userId: AGENT_ID,
    role: AGENT_ROLE,
    context: 'token issue for schema smoke'
  });
}

async function assertMethodNotAllowedScenario(schemaAuthHeaders) {
  const invalidMethodResponse = await request(`/ai/schema/proposal?locale=${encodeURIComponent(LOCALE)}`, {
    method: 'POST',
    headers: schemaAuthHeaders,
    body: JSON.stringify({})
  });

  assert(
    invalidMethodResponse.status === 405,
    `POST schema request should return 405, got ${invalidMethodResponse.status}`
  );

  const invalidMethodPayload = await invalidMethodResponse.json();
  assert(
    invalidMethodPayload?.message === expectedMessage('Método no permitido', 'Method not allowed'),
    'POST schema request message localization mismatch'
  );
}

async function run() {
  console.log(`Running AI schema smoke-check against ${BASE_URL} (locale=${LOCALE}, authMode=${AUTH_MODE})`);

  const health = await request('/health');
  assert(health.status === 200, `health failed: expected 200, got ${health.status}`);

  await assertUnauthorizedScenarios();

  const schemaAuthHeaders = await resolveSchemaAuthHeaders();
  await assertMethodNotAllowedScenario(schemaAuthHeaders);

  const schemaResponse = await request(`/ai/schema/proposal?locale=${encodeURIComponent(LOCALE)}`, {
    method: 'GET',
    headers: schemaAuthHeaders
  });

  assert(schemaResponse.status === 200, `schema endpoint failed: expected 200, got ${schemaResponse.status}`);
  const payload = await schemaResponse.json();
  const data = payload?.data;
  assert(
    payload?.message === expectedMessage('Esquema AI disponible', 'AI schema available'),
    'schema success message localization mismatch'
  );

  assert(data?.schemaVersion === EXPECTED_SCHEMA_VERSION, 'schemaVersion mismatch');
  assert(data?.endpoint === '/ai/proposal', 'endpoint mismatch');
  assert(data?.method === 'POST', 'method mismatch');
  expectArray(data?.requiredFields, 'requiredFields');
  expectArray(data?.optionalFields, 'optionalFields');
  expectArray(data?.warningsCatalog, 'warningsCatalog');
  expectArray(data?.sectionOrder, 'sectionOrder');

  assert(data.requiredFields.includes('promptProfile'), 'required field promptProfile missing');
  assert(data.requiredFields.includes('itinerarySummary'), 'required field itinerarySummary missing');
  assert(data.optionalFields.includes('enforceQualityGate'), 'optional field enforceQualityGate missing');

  const summaryWarning = findWarningByCode(data.warningsCatalog, 'SUMMARY_TOO_SHORT');
  findWarningByCode(data.warningsCatalog, 'QUALITY_GATE_BLOCKER');
  assertLocaleDescription(summaryWarning);

  assert(data.qualityGate?.blockedStatusCode === 422, 'qualityGate blockedStatusCode mismatch');
  assert(data.qualityGate?.inputField === 'enforceQualityGate', 'qualityGate inputField mismatch');
  assert(data.qualityGate?.blockOnSeverity === 'high', 'qualityGate blockOnSeverity mismatch');

  assertSectionOrder(data.sectionOrder);

  const examples = data.examples;
  assert(examples?.request?.destination === 'Oaxaca', 'examples.request.destination mismatch');
  assert(examples?.request?.promptProfile === 'storyteller', 'examples.request.promptProfile mismatch');
  assert(examples?.request?.enforceQualityGate === false, 'examples.request.enforceQualityGate mismatch');
  assert(examples?.successResponse?.statusCode === 200, 'examples.successResponse.statusCode mismatch');
  assert(examples?.successResponse?.body?.data?.schemaVersion === EXPECTED_SCHEMA_VERSION, 'examples.successResponse schemaVersion mismatch');
  assert(examples?.blockedResponse?.statusCode === 422, 'examples.blockedResponse.statusCode mismatch');
  assert(
    examples?.blockedResponse?.body?.blockingWarningCode === 'QUALITY_GATE_BLOCKER',
    'examples.blockedResponse.blockingWarningCode mismatch'
  );

  const summary = {
    authMode: AUTH_MODE,
    locale: LOCALE,
    schemaVersion: data.schemaVersion,
    warningsCatalogCount: data.warningsCatalog.length,
    sectionOrder: data.sectionOrder
  };

  console.log(formatSmokeSummaryLine('AI_SCHEMA_SMOKE_SUMMARY', summary));

  console.log('✅ AI schema smoke-check passed.');
}

run().catch((error) => {
  console.error(`❌ AI schema smoke-check failed: ${error.message}`);
  process.exit(1);
});
