import test from 'node:test';
import assert from 'node:assert/strict';
import { integrationTestHeaders, startIntegrationServer, stopIntegrationServer } from './test-harness';

function testHeaders(role = 'accountant'): Record<string, string> {
  return integrationTestHeaders(role);
}

const startServer = startIntegrationServer;
const stopServer = stopIntegrationServer;

test('accountant can create and update financial transaction', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const createResponse = await fetch(`${baseUrl}/financials`, {
      method: 'POST',
      headers: testHeaders('accountant'),
      body: JSON.stringify({
        itineraryId: 'it_1',
        type: 'client_receipt',
        amountOriginal: 1000,
        currencyOriginal: 'USD',
        exchangeRate: 17,
        transactionDate: '2026-04-15'
      })
    });

    assert.equal(createResponse.status, 201);
    const created = (await createResponse.json()) as { data: { id: string; amountMxn: number } };
    assert.equal(created.data.amountMxn, 17000);

    const patchResponse = await fetch(`${baseUrl}/financials/${created.data.id}`, {
      method: 'PATCH',
      headers: testHeaders('accountant'),
      body: JSON.stringify({
        exchangeRate: 18,
        status: 'cleared'
      })
    });

    assert.equal(patchResponse.status, 200);
  } finally {
    await stopServer(server);
  }
});

test('manager cannot read financials', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const response = await fetch(`${baseUrl}/financials`, {
      method: 'GET',
      headers: testHeaders('manager')
    });

    assert.equal(response.status, 403);
  } finally {
    await stopServer(server);
  }
});
