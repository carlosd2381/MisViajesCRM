import test from 'node:test';
import assert from 'node:assert/strict';
import { integrationTestHeaders, startIntegrationServer, stopIntegrationServer } from './test-harness';

function testHeaders(role = 'manager'): Record<string, string> {
  return integrationTestHeaders(role);
}

const startServer = startIntegrationServer;
const stopServer = stopIntegrationServer;

test('manager can read commissions but cannot write', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const listResponse = await fetch(`${baseUrl}/commissions`, {
      headers: testHeaders('manager')
    });
    assert.equal(listResponse.status, 200);

    const createResponse = await fetch(`${baseUrl}/commissions`, {
      method: 'POST',
      headers: testHeaders('manager'),
      body: JSON.stringify({
        itineraryId: 'it_1',
        supplierId: 'sup_1',
        expectedAmount: 1000,
        dueDate: '2026-04-01'
      })
    });
    assert.equal(createResponse.status, 403);
  } finally {
    await stopServer(server);
  }
});

test('accountant can create and update commissions', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const createResponse = await fetch(`${baseUrl}/commissions`, {
      method: 'POST',
      headers: testHeaders('accountant'),
      body: JSON.stringify({
        itineraryId: 'it_1',
        supplierId: 'sup_1',
        expectedAmount: 1300,
        dueDate: '2026-04-10',
        status: 'claimed'
      })
    });

    assert.equal(createResponse.status, 201);
    const created = (await createResponse.json()) as { data: { id: string } };

    const patchResponse = await fetch(`${baseUrl}/commissions/${created.data.id}`, {
      method: 'PATCH',
      headers: testHeaders('accountant'),
      body: JSON.stringify({
        actualReceived: 1300,
        receivedDate: '2026-04-11',
        status: 'paid'
      })
    });

    assert.equal(patchResponse.status, 200);
  } finally {
    await stopServer(server);
  }
});
