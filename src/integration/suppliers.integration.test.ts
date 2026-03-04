import test from 'node:test';
import assert from 'node:assert/strict';
import { integrationTestHeaders, startIntegrationServer, stopIntegrationServer } from './test-harness';

function testHeaders(role = 'agent'): Record<string, string> {
  return integrationTestHeaders(role);
}

const startServer = startIntegrationServer;
const stopServer = stopIntegrationServer;

test('supplier create and fetch flow works for manager', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const createResponse = await fetch(`${baseUrl}/suppliers`, {
      method: 'POST',
      headers: testHeaders('manager'),
      body: JSON.stringify({
        name: 'Operadora Riviera',
        type: 'dmc',
        status: 'active',
        defaultCurrency: 'MXN',
        commissionType: 'percentage',
        commissionRate: 12,
        payoutTerms: 'post_travel_30',
        internalRiskFlag: 'reliable'
      })
    });

    assert.equal(createResponse.status, 201);
    const created = (await createResponse.json()) as { data: { id: string } };

    const getResponse = await fetch(`${baseUrl}/suppliers/${created.data.id}`, {
      headers: testHeaders('manager')
    });

    assert.equal(getResponse.status, 200);
  } finally {
    await stopServer(server);
  }
});

test('agent cannot write suppliers', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const response = await fetch(`${baseUrl}/suppliers`, {
      method: 'POST',
      headers: testHeaders('agent'),
      body: JSON.stringify({
        name: 'Proveedor Bloqueado',
        type: 'hotel',
        status: 'active',
        defaultCurrency: 'MXN',
        commissionType: 'percentage',
        commissionRate: 10,
        payoutTerms: 'upon_booking',
        internalRiskFlag: 'caution'
      })
    });

    assert.equal(response.status, 403);
  } finally {
    await stopServer(server);
  }
});
