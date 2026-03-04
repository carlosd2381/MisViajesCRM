const BASE_URL = process.env.AI_SCHEMA_SMOKE_BASE_URL ?? 'http://127.0.0.1:3000';
const LOCALE = process.env.AI_SCHEMA_SMOKE_LOCALE ?? 'es-MX';
const AGENT_ID = process.env.AI_SCHEMA_SMOKE_AGENT_ID ?? 'smoke_agent';
const AGENT_ROLE = process.env.AI_SCHEMA_SMOKE_AGENT_ROLE ?? 'agent';
const EXPECTED_SCHEMA_VERSION = process.env.AI_SCHEMA_SMOKE_EXPECTED_SCHEMA_VERSION ?? 'ai-proposal.v1';

function headers(userId, role, contentType = 'application/json') {
  return {
    'content-type': contentType,
    'x-user-id': userId,
    'x-user-role': role,
    'x-locale': LOCALE
  };
}

async function request(path, options = {}) {
  return fetch(`${BASE_URL}${path}`, options);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function expectedMessage(spanish, english) {
  return LOCALE === 'en-US' ? english : spanish;
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
    method: 'GET'
  });
  assert(
    anonymousResponse.status === 401,
    `anonymous schema request should return 401, got ${anonymousResponse.status}`
  );

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

async function assertMethodNotAllowedScenario() {
  const invalidMethodResponse = await request(`/ai/schema/proposal?locale=${encodeURIComponent(LOCALE)}`, {
    method: 'POST',
    headers: headers(AGENT_ID, AGENT_ROLE),
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
  console.log(`Running AI schema smoke-check against ${BASE_URL} (locale=${LOCALE})`);

  const health = await request('/health');
  assert(health.status === 200, `health failed: expected 200, got ${health.status}`);

  await assertUnauthorizedScenarios();
  await assertMethodNotAllowedScenario();

  const schemaResponse = await request(`/ai/schema/proposal?locale=${encodeURIComponent(LOCALE)}`, {
    method: 'GET',
    headers: headers(AGENT_ID, AGENT_ROLE)
  });

  assert(schemaResponse.status === 200, `schema endpoint failed: expected 200, got ${schemaResponse.status}`);
  const payload = await schemaResponse.json();
  const data = payload?.data;

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
    locale: LOCALE,
    schemaVersion: data.schemaVersion,
    warningsCatalogCount: data.warningsCatalog.length,
    sectionOrder: data.sectionOrder
  };

  console.log(`AI_SCHEMA_SMOKE_SUMMARY ${JSON.stringify(summary)}`);

  console.log('✅ AI schema smoke-check passed.');
}

run().catch((error) => {
  console.error(`❌ AI schema smoke-check failed: ${error.message}`);
  process.exit(1);
});
