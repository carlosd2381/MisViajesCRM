import test from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { createApiServer } from '../app';
import { InMemoryLeadRepository } from '../modules/leads/infrastructure/in-memory-lead-repository';
import { InMemoryClientRepository } from '../modules/clients/infrastructure/in-memory-client-repository';
import { InMemorySupplierRepository } from '../modules/suppliers/infrastructure/in-memory-supplier-repository';
import { InMemoryCommissionRepository } from '../modules/commissions/infrastructure/in-memory-commission-repository';
import { InMemoryFinancialRepository } from '../modules/financials/infrastructure/in-memory-financial-repository';
import { InMemoryMessagingRepository } from '../modules/messaging/infrastructure/in-memory-messaging-repository';
import { InMemoryItineraryRepository } from '../modules/itinerary/infrastructure/in-memory-itinerary-repository';
import { InMemoryDashboardRepository } from '../modules/dashboard/infrastructure/in-memory-dashboard-repository';

function testHeaders(role = 'accountant'): Record<string, string> {
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
    suppliers: new InMemorySupplierRepository(),
    commissions: new InMemoryCommissionRepository(),
    financials: new InMemoryFinancialRepository(),
    messaging: new InMemoryMessagingRepository(),
    itineraries: new InMemoryItineraryRepository(),
    dashboard: new InMemoryDashboardRepository()
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
