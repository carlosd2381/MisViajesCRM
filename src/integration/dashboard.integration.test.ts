import test from 'node:test';
import assert from 'node:assert/strict';
import { integrationTestHeaders, startIntegrationServer, stopIntegrationServer } from './test-harness';

function testHeaders(role = 'manager'): Record<string, string> {
  return integrationTestHeaders(role);
}

const startServer = startIntegrationServer;
const stopServer = stopIntegrationServer;

test('manager can create and update dashboard snapshot', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const createResponse = await fetch(`${baseUrl}/dashboard`, {
      method: 'POST',
      headers: testHeaders('manager'),
      body: JSON.stringify({
        periodStart: '2026-03-01',
        periodEnd: '2026-03-31',
        leadsTotal: 100,
        leadsWon: 20,
        itinerariesAccepted: 14,
        commissionsPending: 5,
        commissionsPaid: 9,
        revenueMxn: 250000,
        profitMxn: 45000
      })
    });

    assert.equal(createResponse.status, 201);
    const created = (await createResponse.json()) as { data: { id: string } };

    const patchResponse = await fetch(`${baseUrl}/dashboard/${created.data.id}`, {
      method: 'PATCH',
      headers: testHeaders('manager'),
      body: JSON.stringify({ revenueMxn: 260000, profitMxn: 47000 })
    });

    assert.equal(patchResponse.status, 200);
  } finally {
    await stopServer(server);
  }
});

test('agent can read dashboard but cannot write', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const readResponse = await fetch(`${baseUrl}/dashboard`, {
      method: 'GET',
      headers: testHeaders('agent')
    });
    assert.equal(readResponse.status, 200);

    const writeResponse = await fetch(`${baseUrl}/dashboard`, {
      method: 'POST',
      headers: testHeaders('agent'),
      body: JSON.stringify({
        periodStart: '2026-03-01',
        periodEnd: '2026-03-31',
        leadsTotal: 10,
        leadsWon: 2,
        itinerariesAccepted: 1,
        commissionsPending: 1,
        commissionsPaid: 1,
        revenueMxn: 10000,
        profitMxn: 2000
      })
    });
    assert.equal(writeResponse.status, 403);
  } finally {
    await stopServer(server);
  }
});
