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
import { InMemoryDashboardRepository } from '../modules/dashboard/infrastructure/in-memory-dashboard-repository';
import { InMemoryItineraryRepository } from '../modules/itinerary/infrastructure/in-memory-itinerary-repository';
import { InMemoryManagementRepository } from '../modules/management/infrastructure/in-memory-management-repository';

function testHeaders(role = 'manager'): Record<string, string> {
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
    dashboard: new InMemoryDashboardRepository(),
    management: new InMemoryManagementRepository(),
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
