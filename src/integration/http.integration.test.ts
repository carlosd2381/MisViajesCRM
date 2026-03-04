import test from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { createApiServer } from '../app';
import { InMemoryLeadRepository } from '../modules/leads/infrastructure/in-memory-lead-repository';
import { InMemoryClientRepository } from '../modules/clients/infrastructure/in-memory-client-repository';
import { InMemoryItineraryRepository } from '../modules/itinerary/infrastructure/in-memory-itinerary-repository';

function testHeaders(role = 'agent'): Record<string, string> {
  return {
    'content-type': 'application/json',
    'x-user-id': 'user_test',
    'x-user-role': role,
    'x-locale': 'es-MX'
  };
}

async function startServer(): Promise<{ server: Server; baseUrl: string }> {
  const server = createApiServer({
    leads: new InMemoryLeadRepository(),
    clients: new InMemoryClientRepository(),
    itineraries: new InMemoryItineraryRepository()
  }, { authMode: 'header' });

  await new Promise<void>((resolve) => {
    server.listen(0, () => resolve());
  });

  const address = server.address() as AddressInfo;
  return { server, baseUrl: `http://127.0.0.1:${address.port}` };
}

async function stopServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

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

