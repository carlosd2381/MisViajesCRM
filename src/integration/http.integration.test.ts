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

test('lead delete removes record', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const createResponse = await fetch(`${baseUrl}/leads`, {
      method: 'POST',
      headers: testHeaders(),
      body: JSON.stringify({
        status: 'new',
        source: 'whatsapp',
        priority: 'high',
        destination: 'Mazatlan',
        adultsCount: 2,
        childrenCount: 0
      })
    });

    assert.equal(createResponse.status, 201);
    const created = (await createResponse.json()) as { data: { id: string } };

    const deleteResponse = await fetch(`${baseUrl}/leads/${created.data.id}`, {
      method: 'DELETE',
      headers: testHeaders()
    });

    assert.equal(deleteResponse.status, 200);

    const getResponse = await fetch(`${baseUrl}/leads/${created.data.id}`, {
      headers: testHeaders()
    });

    assert.equal(getResponse.status, 404);
  } finally {
    await stopServer(server);
  }
});

test('client delete removes record', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const createResponse = await fetch(`${baseUrl}/clients`, {
      method: 'POST',
      headers: testHeaders(),
      body: JSON.stringify({
        firstName: 'Diego',
        paternalLastName: 'Ramirez',
        contacts: [{ type: 'email', value: 'diego@example.com' }]
      })
    });

    assert.equal(createResponse.status, 201);
    const created = (await createResponse.json()) as { data: { id: string } };

    const deleteResponse = await fetch(`${baseUrl}/clients/${created.data.id}`, {
      method: 'DELETE',
      headers: testHeaders()
    });

    assert.equal(deleteResponse.status, 200);

    const getResponse = await fetch(`${baseUrl}/clients/${created.data.id}`, {
      headers: testHeaders()
    });

    assert.equal(getResponse.status, 404);
  } finally {
    await stopServer(server);
  }
});

test('agent cannot execute lead cascade delete even with valid confirmation', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const createResponse = await fetch(`${baseUrl}/leads`, {
      method: 'POST',
      headers: testHeaders('agent'),
      body: JSON.stringify({
        status: 'new',
        source: 'whatsapp',
        priority: 'high',
        destination: 'Tulum',
        adultsCount: 2,
        childrenCount: 0
      })
    });

    assert.equal(createResponse.status, 201);
    const created = (await createResponse.json()) as { data: { id: string } };

    const cascadeResponse = await fetch(`${baseUrl}/leads/${created.data.id}?cascade=true`, {
      method: 'DELETE',
      headers: testHeaders('agent'),
      body: JSON.stringify({ confirmation: 'Eliminar todo' })
    });

    assert.equal(cascadeResponse.status, 403);

    const getResponse = await fetch(`${baseUrl}/leads/${created.data.id}`, {
      headers: testHeaders('agent')
    });

    assert.equal(getResponse.status, 200);
  } finally {
    await stopServer(server);
  }
});

test('lead cascade forbidden message is localized for en-US', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const createResponse = await fetch(`${baseUrl}/leads`, {
      method: 'POST',
      headers: testHeaders('agent', 'en-US'),
      body: JSON.stringify({
        status: 'new',
        source: 'website',
        priority: 'high',
        destination: 'Bacalar',
        adultsCount: 2,
        childrenCount: 0
      })
    });

    assert.equal(createResponse.status, 201);
    const created = (await createResponse.json()) as { data: { id: string } };

    const cascadeResponse = await fetch(`${baseUrl}/leads/${created.data.id}?cascade=true`, {
      method: 'DELETE',
      headers: testHeaders('agent', 'en-US'),
      body: JSON.stringify({ confirmation: 'Delete all' })
    });

    assert.equal(cascadeResponse.status, 403);
    const cascadePayload = (await cascadeResponse.json()) as { message?: string };
    assert.equal(cascadePayload.message, 'Only owner or manager can execute full delete');
  } finally {
    await stopServer(server);
  }
});

test('agent cannot execute client cascade delete even with valid confirmation', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const createResponse = await fetch(`${baseUrl}/clients`, {
      method: 'POST',
      headers: testHeaders('agent'),
      body: JSON.stringify({
        firstName: 'Lucia',
        paternalLastName: 'Perez',
        contacts: [{ type: 'email', value: 'lucia@example.com' }]
      })
    });

    assert.equal(createResponse.status, 201);
    const created = (await createResponse.json()) as { data: { id: string } };

    const cascadeResponse = await fetch(`${baseUrl}/clients/${created.data.id}?cascade=true`, {
      method: 'DELETE',
      headers: testHeaders('agent'),
      body: JSON.stringify({ confirmation: 'Eliminar todo' })
    });

    assert.equal(cascadeResponse.status, 403);

    const getResponse = await fetch(`${baseUrl}/clients/${created.data.id}`, {
      headers: testHeaders('agent')
    });

    assert.equal(getResponse.status, 200);
  } finally {
    await stopServer(server);
  }
});

test('token mode blocks agent lead cascade delete with 403', async () => {
  const { server, baseUrl } = await startServer('token');

  try {
    const { accessToken } = await issueIntegrationTokenPair(baseUrl, 'agent');

    const createResponse = await fetch(`${baseUrl}/leads`, {
      method: 'POST',
      headers: {
        ...bearerHeaders(accessToken),
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        status: 'new',
        source: 'referral',
        priority: 'high',
        destination: 'Merida',
        adultsCount: 2,
        childrenCount: 0
      })
    });

    assert.equal(createResponse.status, 201);
    const created = (await createResponse.json()) as { data: { id: string } };

    const cascadeResponse = await fetch(`${baseUrl}/leads/${created.data.id}?cascade=true`, {
      method: 'DELETE',
      headers: {
        ...bearerHeaders(accessToken),
        'content-type': 'application/json'
      },
      body: JSON.stringify({ confirmation: 'Eliminar todo' })
    });

    assert.equal(cascadeResponse.status, 403);
  } finally {
    await stopServer(server);
  }
});

test('token mode blocks agent client cascade delete with 403', async () => {
  const { server, baseUrl } = await startServer('token');

  try {
    const { accessToken } = await issueIntegrationTokenPair(baseUrl, 'agent');

    const createResponse = await fetch(`${baseUrl}/clients`, {
      method: 'POST',
      headers: {
        ...bearerHeaders(accessToken),
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        firstName: 'Mario',
        paternalLastName: 'Santos',
        contacts: [{ type: 'email', value: 'mario@example.com' }]
      })
    });

    assert.equal(createResponse.status, 201);
    const created = (await createResponse.json()) as { data: { id: string } };

    const cascadeResponse = await fetch(`${baseUrl}/clients/${created.data.id}?cascade=true`, {
      method: 'DELETE',
      headers: {
        ...bearerHeaders(accessToken),
        'content-type': 'application/json'
      },
      body: JSON.stringify({ confirmation: 'Eliminar todo' })
    });

    assert.equal(cascadeResponse.status, 403);
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

