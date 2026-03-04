import test from 'node:test';
import assert from 'node:assert/strict';
import { integrationTestHeaders, startIntegrationServer, stopIntegrationServer } from './test-harness';

function testHeaders(role = 'owner'): Record<string, string> {
  return integrationTestHeaders(role);
}

const startServer = startIntegrationServer;
const stopServer = stopIntegrationServer;

test('owner can create and update management setting', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const createResponse = await fetch(`${baseUrl}/management`, {
      method: 'POST',
      headers: testHeaders('owner'),
      body: JSON.stringify({
        key: 'booking_window_days',
        value: '45',
        description: 'Ventana de reserva recomendada'
      })
    });

    assert.equal(createResponse.status, 201);
    const created = (await createResponse.json()) as { data: { id: string } };

    const patchResponse = await fetch(`${baseUrl}/management/${created.data.id}`, {
      method: 'PATCH',
      headers: testHeaders('owner'),
      body: JSON.stringify({ value: '60' })
    });

    assert.equal(patchResponse.status, 200);
  } finally {
    await stopServer(server);
  }
});

test('manager can read settings but cannot write', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const readResponse = await fetch(`${baseUrl}/management`, {
      method: 'GET',
      headers: testHeaders('manager')
    });

    assert.equal(readResponse.status, 200);

    const writeResponse = await fetch(`${baseUrl}/management`, {
      method: 'POST',
      headers: testHeaders('manager'),
      body: JSON.stringify({
        key: 'default_markup_pct',
        value: '12'
      })
    });

    assert.equal(writeResponse.status, 403);
  } finally {
    await stopServer(server);
  }
});