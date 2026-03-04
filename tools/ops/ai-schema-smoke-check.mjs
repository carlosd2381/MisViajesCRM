const BASE_URL = process.env.AI_SCHEMA_SMOKE_BASE_URL ?? 'http://127.0.0.1:3000';
const LOCALE = process.env.AI_SCHEMA_SMOKE_LOCALE ?? 'es-MX';
const AGENT_ID = process.env.AI_SCHEMA_SMOKE_AGENT_ID ?? 'smoke_agent';
const AGENT_ROLE = process.env.AI_SCHEMA_SMOKE_AGENT_ROLE ?? 'agent';

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

function expectArray(value, name) {
  assert(Array.isArray(value), `${name} should be an array`);
}

async function run() {
  console.log(`Running AI schema smoke-check against ${BASE_URL}`);

  const health = await request('/health');
  assert(health.status === 200, `health failed: expected 200, got ${health.status}`);

  const schemaResponse = await request('/ai/schema/proposal?locale=en-US', {
    method: 'GET',
    headers: headers(AGENT_ID, AGENT_ROLE)
  });

  assert(schemaResponse.status === 200, `schema endpoint failed: expected 200, got ${schemaResponse.status}`);
  const payload = await schemaResponse.json();
  const data = payload?.data;

  assert(data?.schemaVersion === 'ai-proposal.v1', 'schemaVersion mismatch');
  expectArray(data?.requiredFields, 'requiredFields');
  expectArray(data?.optionalFields, 'optionalFields');
  expectArray(data?.warningsCatalog, 'warningsCatalog');
  expectArray(data?.sectionOrder, 'sectionOrder');

  assert(data.requiredFields.includes('promptProfile'), 'required field promptProfile missing');
  assert(data.requiredFields.includes('itinerarySummary'), 'required field itinerarySummary missing');
  assert(data.optionalFields.includes('enforceQualityGate'), 'optional field enforceQualityGate missing');

  const qualityGateWarning = data.warningsCatalog.find((warning) => warning.code === 'QUALITY_GATE_BLOCKER');
  assert(Boolean(qualityGateWarning), 'QUALITY_GATE_BLOCKER warning missing');
  assert(data.qualityGate?.blockedStatusCode === 422, 'qualityGate blockedStatusCode mismatch');

  const examples = data.examples;
  assert(examples?.request?.promptProfile === 'storyteller', 'examples.request.promptProfile mismatch');
  assert(examples?.successResponse?.statusCode === 200, 'examples.successResponse.statusCode mismatch');
  assert(examples?.blockedResponse?.statusCode === 422, 'examples.blockedResponse.statusCode mismatch');

  console.log('✅ AI schema smoke-check passed.');
}

run().catch((error) => {
  console.error(`❌ AI schema smoke-check failed: ${error.message}`);
  process.exit(1);
});
