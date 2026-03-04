const BASE_URL = process.env.AI_RENDER_SMOKE_BASE_URL ?? 'http://127.0.0.1:3000';
const LOCALE = process.env.AI_RENDER_SMOKE_LOCALE ?? 'es-MX';
const AUTH_MODE = process.env.AI_RENDER_SMOKE_AUTH_MODE ?? 'header';
const AGENT_ID = process.env.AI_RENDER_SMOKE_AGENT_ID ?? 'smoke_agent';
const AGENT_ROLE = process.env.AI_RENDER_SMOKE_AGENT_ROLE ?? 'agent';
const EXTERNAL_ID = process.env.AI_RENDER_SMOKE_EXTERNAL_ID ?? 'smoke_external';
const EXTERNAL_ROLE = process.env.AI_RENDER_SMOKE_EXTERNAL_ROLE ?? 'external_dmc';

function headers(userId, role, contentType = 'application/json') {
  return {
    'content-type': contentType,
    'x-user-id': userId,
    'x-user-role': role,
    'x-locale': LOCALE
  };
}

function expectedMessage(spanish, english) {
  return LOCALE === 'en-US' ? english : spanish;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function isTokenMode() {
  return AUTH_MODE === 'token';
}

async function request(path, options = {}) {
  return fetch(`${BASE_URL}${path}`, options);
}

async function resolveAuthHeaders(userId, role) {
  if (!isTokenMode()) {
    return headers(userId, role);
  }

  const tokenIssueResponse = await request('/auth/token', {
    method: 'POST',
    headers: headers(userId, role)
  });

  assert(tokenIssueResponse.status === 200, `token issue failed for ${role}: expected 200, got ${tokenIssueResponse.status}`);
  const tokenIssuePayload = await tokenIssueResponse.json();
  const accessToken = tokenIssuePayload?.data?.accessToken;
  assert(typeof accessToken === 'string' && accessToken.length > 0, `accessToken missing for ${role}`);

  return {
    authorization: `Bearer ${accessToken}`,
    'content-type': 'application/json',
    'x-locale': LOCALE
  };
}

function validProposalBody() {
  return {
    promptProfile: 'storyteller',
    itinerarySummary: 'Día 1 llegada a Oaxaca, día 2 experiencias locales y cierre cultural con narrativa detallada.',
    destination: 'Oaxaca',
    days: 4
  };
}

async function assertUnauthorizedScenario() {
  const response = await request('/ai/proposal/render/web', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-locale': LOCALE
    },
    body: JSON.stringify(validProposalBody())
  });

  assert(response.status === 401, `unauthorized render/web should return 401, got ${response.status}`);
  const payload = await response.json();
  assert(
    payload?.message === expectedMessage('No autenticado', 'Unauthenticated'),
    'unauthorized render/web message localization mismatch'
  );
}

async function assertMethodNotAllowed(authHeaders) {
  const webGet = await request('/ai/proposal/render/web', {
    method: 'GET',
    headers: authHeaders
  });
  assert(webGet.status === 405, `GET render/web should return 405, got ${webGet.status}`);
  const webPayload = await webGet.json();
  assert(
    webPayload?.message === expectedMessage('Método no permitido', 'Method not allowed'),
    'GET render/web message localization mismatch'
  );

  const pdfGet = await request('/ai/proposal/render/pdf', {
    method: 'GET',
    headers: authHeaders
  });
  assert(pdfGet.status === 405, `GET render/pdf should return 405, got ${pdfGet.status}`);
  const pdfPayload = await pdfGet.json();
  assert(
    pdfPayload?.message === expectedMessage('Método no permitido', 'Method not allowed'),
    'GET render/pdf message localization mismatch'
  );
}

async function assertForbiddenScenario() {
  const externalHeaders = await resolveAuthHeaders(EXTERNAL_ID, EXTERNAL_ROLE);
  const response = await request('/ai/proposal/render/web', {
    method: 'POST',
    headers: externalHeaders,
    body: JSON.stringify(validProposalBody())
  });

  assert(response.status === 403, `external role render/web should return 403, got ${response.status}`);
  const payload = await response.json();
  assert(
    payload?.message === expectedMessage('Acceso denegado', 'Access denied'),
    'external role render/web message localization mismatch'
  );
}

async function assertWebRender(authHeaders) {
  const response = await request('/ai/proposal/render/web', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify(validProposalBody())
  });

  assert(response.status === 200, `render/web should return 200, got ${response.status}`);
  const contentType = response.headers.get('content-type') ?? '';
  assert(contentType.includes('text/html'), `render/web content-type mismatch: ${contentType}`);

  const html = await response.text();
  assert(/<!doctype html>/i.test(html), 'render/web response is not html doctype');
  assert(html.includes('ai-proposal.v1'), 'render/web missing schemaVersion');
  assert(html.includes('Oaxaca'), 'render/web missing destination');
}

async function assertPdfRender(authHeaders) {
  const response = await request('/ai/proposal/render/pdf', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify(validProposalBody())
  });

  assert(response.status === 200, `render/pdf should return 200, got ${response.status}`);
  const contentType = response.headers.get('content-type') ?? '';
  assert(contentType.includes('application/pdf'), `render/pdf content-type mismatch: ${contentType}`);

  const bytes = Buffer.from(await response.arrayBuffer());
  assert(bytes.length > 200, `render/pdf payload too small: ${bytes.length}`);
  assert(bytes.subarray(0, 8).toString('utf8') === '%PDF-1.4', 'render/pdf payload missing PDF header');
}

async function run() {
  console.log(`Running AI render smoke-check against ${BASE_URL} (locale=${LOCALE}, authMode=${AUTH_MODE})`);

  const health = await request('/health');
  assert(health.status === 200, `health failed: expected 200, got ${health.status}`);

  await assertUnauthorizedScenario();

  const authHeaders = await resolveAuthHeaders(AGENT_ID, AGENT_ROLE);
  await assertMethodNotAllowed(authHeaders);
  await assertForbiddenScenario();
  await assertWebRender(authHeaders);
  await assertPdfRender(authHeaders);

  const summary = {
    authMode: AUTH_MODE,
    locale: LOCALE,
    checks: [
      'unauthorized_401',
      'method_not_allowed_405_web',
      'method_not_allowed_405_pdf',
      'forbidden_external_403',
      'web_render_200_html',
      'pdf_render_200_pdf'
    ]
  };

  console.log(`AI_RENDER_SMOKE_SUMMARY ${JSON.stringify(summary)}`);
  console.log('✅ AI render smoke-check passed.');
}

run().catch((error) => {
  console.error(`❌ AI render smoke-check failed: ${error.message}`);
  process.exit(1);
});