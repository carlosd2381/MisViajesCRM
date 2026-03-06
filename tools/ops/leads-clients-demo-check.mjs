import { formatSmokeSummaryLine } from './smoke-summary-helpers.mjs';
import { smokeExpectStatus } from './smoke-common-helpers.mjs';

const BASE_URL = process.env.LEADS_DEMO_BASE_URL ?? 'http://127.0.0.1:3000';
const LOCALE = process.env.LEADS_DEMO_LOCALE ?? 'es-MX';
const USER_ID = process.env.LEADS_DEMO_USER_ID ?? 'demo_agent';
const USER_ROLE = process.env.LEADS_DEMO_USER_ROLE ?? 'agent';

let ACTIVE_BASE_URL = BASE_URL;

function headers(contentType = 'application/json') {
  return {
    'x-user-id': USER_ID,
    'x-user-role': USER_ROLE,
    'x-locale': LOCALE,
    'content-type': contentType
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function request(path, options = {}) {
  const url = `${ACTIVE_BASE_URL}${path}`;

  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await fetch(url, options);
    } catch (error) {
      lastError = error;
      if (attempt < 3) {
        await sleep(250);
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

function getId(payload, contextName) {
  const id = payload?.data?.id;
  if (!id || typeof id !== 'string') {
    throw new Error(`${contextName} failed: response missing data.id`);
  }

  return id;
}

function getConvertedClientId(payload) {
  const id = payload?.data?.client?.id;
  if (!id || typeof id !== 'string') {
    throw new Error('convert lead to client failed: response missing data.client.id');
  }

  return id;
}

async function run() {
  console.log(`Running Leads/Clients demo against ${BASE_URL}`);

  await waitForApiReady();
  if (ACTIVE_BASE_URL !== BASE_URL) {
    console.log(`Leads/Clients demo fallback base URL in use: ${ACTIVE_BASE_URL}`);
  }

  const health = await request('/health');
  await smokeExpectStatus('health', health, 200);

  const createLeadResponse = await request('/leads', {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      status: 'new',
      source: 'website',
      priority: 'high',
      destination: 'Oaxaca',
      adultsCount: 2,
      childrenCount: 0
    })
  });
  await smokeExpectStatus('create lead', createLeadResponse, 201);
  const createdLeadPayload = await createLeadResponse.json();
  const leadId = getId(createdLeadPayload, 'create lead');

  const getLeadResponse = await request(`/leads/${leadId}`, {
    method: 'GET',
    headers: headers('application/json')
  });
  await smokeExpectStatus('get lead', getLeadResponse, 200);

  const convertLeadResponse = await request(`/leads/${leadId}/convert`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      firstName: 'Demo',
      paternalLastName: 'Cliente',
      maternalLastName: 'MisViajes',
      contacts: [
        { type: 'email', value: 'demo-client@example.com' }
      ],
      travelPreferences: {
        preferredDestinationType: 'cultural',
        tripStyle: 'premium'
      }
    })
  });
  await smokeExpectStatus('convert lead to client', convertLeadResponse, 201);
  const convertedPayload = await convertLeadResponse.json();
  const clientId = getConvertedClientId(convertedPayload);

  const getClientResponse = await request(`/clients/${clientId}`, {
    method: 'GET',
    headers: headers('application/json')
  });
  await smokeExpectStatus('get client', getClientResponse, 200);

  const summary = {
    baseUrl: ACTIVE_BASE_URL,
    locale: LOCALE,
    actor: { userId: USER_ID, role: USER_ROLE },
    flow: [
      'health_200',
      'lead_created_201',
      'lead_retrieved_200',
      'lead_converted_to_client_201',
      'client_retrieved_200'
    ],
    entities: {
      leadId,
      clientId
    }
  };

  console.log('✅ Demo flow completed');
  console.log(`   Lead created: ${leadId}`);
  console.log(`   Client created via conversion: ${clientId}`);
  console.log(formatSmokeSummaryLine('LEADS_CLIENTS_DEMO_SUMMARY', summary));
}

run().catch((error) => {
  console.error(`Leads/Clients demo failed: ${error?.message ?? error}`);
  process.exitCode = 1;
});
