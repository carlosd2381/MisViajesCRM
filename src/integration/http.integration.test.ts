import test from 'node:test';
import assert from 'node:assert/strict';
import { integrationTestHeaders, startIntegrationServer, stopIntegrationServer } from './test-harness';

function testHeaders(role = 'agent'): Record<string, string> {
  return integrationTestHeaders(role);
}

const startServer = startIntegrationServer;
const stopServer = stopIntegrationServer;

test('health endpoint responds with 200', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const response = await fetch(`${baseUrl}/health`);
    const data = (await response.json()) as { status: string };

    assert.equal(response.status, 200);
    assert.equal(data.status, 'ok');
  } finally {
    await stopServer(server);
  }
});

test('leads endpoint requires authentication headers', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const response = await fetch(`${baseUrl}/leads`);
    assert.equal(response.status, 401);
  } finally {
    await stopServer(server);
  }
});

test('lead create and fetch flow works', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const createResponse = await fetch(`${baseUrl}/leads`, {
      method: 'POST',
      headers: testHeaders(),
      body: JSON.stringify({
        status: 'new',
        source: 'whatsapp',
        priority: 'high',
        destination: 'Oaxaca',
        adultsCount: 2,
        childrenCount: 0
      })
    });

    assert.equal(createResponse.status, 201);
    const created = (await createResponse.json()) as { data: { id: string } };

    const getResponse = await fetch(`${baseUrl}/leads/${created.data.id}`, {
      headers: testHeaders()
    });

    assert.equal(getResponse.status, 200);
  } finally {
    await stopServer(server);
  }
});

test('client create and fetch flow works', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const createResponse = await fetch(`${baseUrl}/clients`, {
      method: 'POST',
      headers: testHeaders(),
      body: JSON.stringify({
        firstName: 'Ana',
        paternalLastName: 'Lopez',
        contacts: [{ type: 'email', value: 'ana@example.com' }]
      })
    });

    assert.equal(createResponse.status, 201);
    const created = (await createResponse.json()) as { data: { id: string } };

    const getResponse = await fetch(`${baseUrl}/clients/${created.data.id}`, {
      headers: testHeaders()
    });

    assert.equal(getResponse.status, 200);
  } finally {
    await stopServer(server);
  }
});

test('accountant cannot write leads', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const response = await fetch(`${baseUrl}/leads`, {
      method: 'POST',
      headers: testHeaders('accountant'),
      body: JSON.stringify({
        status: 'new',
        source: 'whatsapp',
        priority: 'high',
        destination: 'Oaxaca',
        adultsCount: 2,
        childrenCount: 0
      })
    });

    assert.equal(response.status, 403);
  } finally {
    await stopServer(server);
  }
});

