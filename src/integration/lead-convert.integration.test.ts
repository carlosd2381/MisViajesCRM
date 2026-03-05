import test from 'node:test';
import assert from 'node:assert/strict';
import {
  bearerHeaders,
  integrationTestHeaders,
  issueIntegrationTokenPair,
  startIntegrationServer,
  stopIntegrationServer
} from './test-harness';

function testHeaders(role = 'agent', locale = 'es-MX'): Record<string, string> {
  return integrationTestHeaders(role, locale);
}

const startServer = startIntegrationServer;
const stopServer = stopIntegrationServer;

function tokenJsonHeaders(accessToken: string, locale = 'es-MX'): Record<string, string> {
  return {
    ...bearerHeaders(accessToken, locale),
    'content-type': 'application/json'
  };
}

test('lead convert flow creates client and closes lead', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const createLeadResponse = await fetch(`${baseUrl}/leads`, {
      method: 'POST',
      headers: testHeaders(),
      body: JSON.stringify({
        status: 'new',
        source: 'whatsapp',
        priority: 'vip',
        destination: 'Tulum',
        adultsCount: 2,
        childrenCount: 1,
        budgetMin: 30000,
        budgetMax: 50000,
        budgetCurrency: 'MXN'
      })
    });

    assert.equal(createLeadResponse.status, 201);
    const createdLead = (await createLeadResponse.json()) as { data: { id: string } };

    const convertResponse = await fetch(`${baseUrl}/leads/${createdLead.data.id}/convert`, {
      method: 'POST',
      headers: testHeaders(),
      body: JSON.stringify({
        firstName: 'María',
        paternalLastName: 'Pérez',
        contacts: [{ type: 'email', value: 'maria@example.com' }]
      })
    });

    assert.equal(convertResponse.status, 201);
    const converted = (await convertResponse.json()) as {
      data: { lead: { status: string }; client: { id: string; leadId?: string; travelPreferences: Record<string, unknown> } };
    };

    assert.equal(converted.data.lead.status, 'closed_won');
    assert.equal(converted.data.client.leadId, createdLead.data.id);
    assert.equal(converted.data.client.travelPreferences.leadDestination, 'Tulum');

    const getClientResponse = await fetch(`${baseUrl}/clients/${converted.data.client.id}`, {
      headers: testHeaders()
    });
    assert.equal(getClientResponse.status, 200);
  } finally {
    await stopServer(server);
  }
});

test('lead convert returns conflict when already converted', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const createLeadResponse = await fetch(`${baseUrl}/leads`, {
      method: 'POST',
      headers: testHeaders(),
      body: JSON.stringify({
        status: 'new',
        source: 'referral',
        priority: 'high',
        destination: 'Madrid',
        adultsCount: 1,
        childrenCount: 0
      })
    });

    assert.equal(createLeadResponse.status, 201);
    const createdLead = (await createLeadResponse.json()) as { data: { id: string } };

    const firstConvertResponse = await fetch(`${baseUrl}/leads/${createdLead.data.id}/convert`, {
      method: 'POST',
      headers: testHeaders(),
      body: JSON.stringify({
        firstName: 'Juan',
        paternalLastName: 'Ramírez',
        contacts: [{ type: 'email', value: 'juan@example.com' }]
      })
    });

    assert.equal(firstConvertResponse.status, 201);
    const firstConverted = (await firstConvertResponse.json()) as { data: { client: { id: string } } };

    const secondConvertResponse = await fetch(`${baseUrl}/leads/${createdLead.data.id}/convert`, {
      method: 'POST',
      headers: testHeaders(),
      body: JSON.stringify({
        firstName: 'Juan',
        paternalLastName: 'Ramírez',
        contacts: [{ type: 'email', value: 'juan+dup@example.com' }]
      })
    });

    assert.equal(secondConvertResponse.status, 409);
    const secondConverted = (await secondConvertResponse.json()) as {
      message: string;
      data: { client: { id: string }; lead: { id: string } };
    };

    assert.equal(secondConverted.message, 'Lead ya convertido a cliente');
    assert.equal(secondConverted.data.client.id, firstConverted.data.client.id);
    assert.equal(secondConverted.data.lead.id, createdLead.data.id);
  } finally {
    await stopServer(server);
  }
});

test('lead convert conflict message is localized for en-US', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const createLeadResponse = await fetch(`${baseUrl}/leads`, {
      method: 'POST',
      headers: testHeaders('agent', 'en-US'),
      body: JSON.stringify({
        status: 'new',
        source: 'website',
        priority: 'high',
        destination: 'Lisbon',
        adultsCount: 2,
        childrenCount: 0
      })
    });

    assert.equal(createLeadResponse.status, 201);
    const createdLead = (await createLeadResponse.json()) as { data: { id: string } };

    const firstConvertResponse = await fetch(`${baseUrl}/leads/${createdLead.data.id}/convert`, {
      method: 'POST',
      headers: testHeaders('agent', 'en-US'),
      body: JSON.stringify({
        firstName: 'Lia',
        paternalLastName: 'Stone',
        contacts: [{ type: 'email', value: 'lia@example.com' }]
      })
    });

    assert.equal(firstConvertResponse.status, 201);

    const secondConvertResponse = await fetch(`${baseUrl}/leads/${createdLead.data.id}/convert`, {
      method: 'POST',
      headers: testHeaders('agent', 'en-US'),
      body: JSON.stringify({
        firstName: 'Lia',
        paternalLastName: 'Stone',
        contacts: [{ type: 'email', value: 'lia+dup@example.com' }]
      })
    });

    assert.equal(secondConvertResponse.status, 409);
    const secondConverted = (await secondConvertResponse.json()) as { message: string };
    assert.equal(secondConverted.message, 'Lead already converted to client');
  } finally {
    await stopServer(server);
  }
});

test('lead convert flow works in token mode including duplicate conflict', async () => {
  const { server, baseUrl } = await startServer('token');

  try {
    const tokens = await issueIntegrationTokenPair(baseUrl, 'agent', 'es-MX', 'agent_token_convert');

    const createLeadResponse = await fetch(`${baseUrl}/leads`, {
      method: 'POST',
      headers: tokenJsonHeaders(tokens.accessToken),
      body: JSON.stringify({
        status: 'new',
        source: 'instagram',
        priority: 'high',
        destination: 'Roma',
        adultsCount: 2,
        childrenCount: 0
      })
    });

    assert.equal(createLeadResponse.status, 201);
    const createdLead = (await createLeadResponse.json()) as { data: { id: string } };

    const firstConvertResponse = await fetch(`${baseUrl}/leads/${createdLead.data.id}/convert`, {
      method: 'POST',
      headers: tokenJsonHeaders(tokens.accessToken),
      body: JSON.stringify({
        firstName: 'Marco',
        paternalLastName: 'Rossi',
        contacts: [{ type: 'email', value: 'marco@example.com' }]
      })
    });

    assert.equal(firstConvertResponse.status, 201);

    const secondConvertResponse = await fetch(`${baseUrl}/leads/${createdLead.data.id}/convert`, {
      method: 'POST',
      headers: tokenJsonHeaders(tokens.accessToken),
      body: JSON.stringify({
        firstName: 'Marco',
        paternalLastName: 'Rossi',
        contacts: [{ type: 'email', value: 'marco+dup@example.com' }]
      })
    });

    assert.equal(secondConvertResponse.status, 409);
    const secondConverted = (await secondConvertResponse.json()) as {
      message: string;
      data: { lead: { id: string }; client: { leadId?: string } };
    };

    assert.equal(secondConverted.message, 'Lead ya convertido a cliente');
    assert.equal(secondConverted.data.lead.id, createdLead.data.id);
    assert.equal(secondConverted.data.client.leadId, createdLead.data.id);
  } finally {
    await stopServer(server);
  }
});

test('lead convert invalid payload returns 400 with validation errors', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const createLeadResponse = await fetch(`${baseUrl}/leads`, {
      method: 'POST',
      headers: testHeaders(),
      body: JSON.stringify({
        status: 'new',
        source: 'website',
        priority: 'medium',
        destination: 'Bogotá',
        adultsCount: 2,
        childrenCount: 0
      })
    });

    assert.equal(createLeadResponse.status, 201);
    const createdLead = (await createLeadResponse.json()) as { data: { id: string } };

    const invalidConvertResponse = await fetch(`${baseUrl}/leads/${createdLead.data.id}/convert`, {
      method: 'POST',
      headers: testHeaders(),
      body: JSON.stringify({
        firstName: 'ClienteSinApellido'
      })
    });

    assert.equal(invalidConvertResponse.status, 400);
    const invalidPayload = (await invalidConvertResponse.json()) as {
      message: string;
      errors?: string[];
    };

    assert.equal(invalidPayload.message, 'Solicitud inválida');
    assert.ok(Array.isArray(invalidPayload.errors));
    assert.ok((invalidPayload.errors?.length ?? 0) > 0);
  } finally {
    await stopServer(server);
  }
});

test('lead convert invalid payload returns 400 with validation errors in token mode', async () => {
  const { server, baseUrl } = await startServer('token');

  try {
    const tokens = await issueIntegrationTokenPair(baseUrl, 'agent', 'es-MX', 'agent_token_invalid_convert');

    const createLeadResponse = await fetch(`${baseUrl}/leads`, {
      method: 'POST',
      headers: tokenJsonHeaders(tokens.accessToken),
      body: JSON.stringify({
        status: 'new',
        source: 'instagram',
        priority: 'medium',
        destination: 'Quito',
        adultsCount: 2,
        childrenCount: 0
      })
    });

    assert.equal(createLeadResponse.status, 201);
    const createdLead = (await createLeadResponse.json()) as { data: { id: string } };

    const invalidConvertResponse = await fetch(`${baseUrl}/leads/${createdLead.data.id}/convert`, {
      method: 'POST',
      headers: tokenJsonHeaders(tokens.accessToken),
      body: JSON.stringify({
        firstName: 'ClienteTokenSinApellido'
      })
    });

    assert.equal(invalidConvertResponse.status, 400);
    const invalidPayload = (await invalidConvertResponse.json()) as {
      message: string;
      errors?: string[];
    };

    assert.equal(invalidPayload.message, 'Solicitud inválida');
    assert.ok(Array.isArray(invalidPayload.errors));
    assert.ok((invalidPayload.errors?.length ?? 0) > 0);
  } finally {
    await stopServer(server);
  }
});

test('lead convert invalid payload is localized for en-US in token mode', async () => {
  const { server, baseUrl } = await startServer('token');

  try {
    const tokens = await issueIntegrationTokenPair(baseUrl, 'agent', 'en-US', 'agent_token_invalid_convert_en');

    const createLeadResponse = await fetch(`${baseUrl}/leads`, {
      method: 'POST',
      headers: tokenJsonHeaders(tokens.accessToken, 'en-US'),
      body: JSON.stringify({
        status: 'new',
        source: 'website',
        priority: 'medium',
        destination: 'Seville',
        adultsCount: 2,
        childrenCount: 0
      })
    });

    assert.equal(createLeadResponse.status, 201);
    const createdLead = (await createLeadResponse.json()) as { data: { id: string } };

    const invalidConvertResponse = await fetch(`${baseUrl}/leads/${createdLead.data.id}/convert`, {
      method: 'POST',
      headers: tokenJsonHeaders(tokens.accessToken, 'en-US'),
      body: JSON.stringify({
        firstName: 'TokenClientMissingLastName'
      })
    });

    assert.equal(invalidConvertResponse.status, 400);
    const invalidPayload = (await invalidConvertResponse.json()) as {
      message: string;
      errors?: string[];
    };

    assert.equal(invalidPayload.message, 'Invalid request');
    assert.ok(Array.isArray(invalidPayload.errors));
    assert.ok((invalidPayload.errors?.length ?? 0) > 0);
  } finally {
    await stopServer(server);
  }
});

