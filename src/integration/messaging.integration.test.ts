import test from 'node:test';
import assert from 'node:assert/strict';
import { integrationTestHeaders, startIntegrationServer, stopIntegrationServer } from './test-harness';

function testHeaders(role = 'agent'): Record<string, string> {
  return integrationTestHeaders(role);
}

const startServer = startIntegrationServer;
const stopServer = stopIntegrationServer;

test('agent can create and update message log', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const createResponse = await fetch(`${baseUrl}/messaging`, {
      method: 'POST',
      headers: testHeaders('agent'),
      body: JSON.stringify({
        clientId: 'client_1',
        channel: 'whatsapp',
        direction: 'outbound',
        content: 'Hola, te comparto opciones',
        threadId: 'thread_1'
      })
    });

    assert.equal(createResponse.status, 201);
    const created = (await createResponse.json()) as { data: { id: string } };

    const patchResponse = await fetch(`${baseUrl}/messaging/${created.data.id}`, {
      method: 'PATCH',
      headers: testHeaders('agent'),
      body: JSON.stringify({ status: 'delivered' })
    });

    assert.equal(patchResponse.status, 200);
  } finally {
    await stopServer(server);
  }
});

test('external_dmc cannot write messaging', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const response = await fetch(`${baseUrl}/messaging`, {
      method: 'POST',
      headers: testHeaders('external_dmc'),
      body: JSON.stringify({
        clientId: 'client_1',
        channel: 'email',
        direction: 'outbound',
        content: 'Mensaje bloqueado',
        threadId: 'thread_2'
      })
    });

    assert.equal(response.status, 403);
  } finally {
    await stopServer(server);
  }
});
