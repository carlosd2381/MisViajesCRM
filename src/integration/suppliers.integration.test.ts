import test from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { createApiServer } from '../app';
import { InMemoryLeadRepository } from '../modules/leads/infrastructure/in-memory-lead-repository';
import { InMemoryClientRepository } from '../modules/clients/infrastructure/in-memory-client-repository';
import { InMemoryItineraryRepository } from '../modules/itinerary/infrastructure/in-memory-itinerary-repository';
import { InMemorySupplierRepository } from '../modules/suppliers/infrastructure/in-memory-supplier-repository';
import { InMemoryCommissionRepository } from '../modules/commissions/infrastructure/in-memory-commission-repository';
import { InMemoryFinancialRepository } from '../modules/financials/infrastructure/in-memory-financial-repository';
import { InMemoryMessagingRepository } from '../modules/messaging/infrastructure/in-memory-messaging-repository';
import { InMemoryDashboardRepository } from '../modules/dashboard/infrastructure/in-memory-dashboard-repository';
import { InMemoryManagementRepository } from '../modules/management/infrastructure/in-memory-management-repository';

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
    suppliers: new InMemorySupplierRepository(),
    commissions: new InMemoryCommissionRepository(),
    financials: new InMemoryFinancialRepository(),
    messaging: new InMemoryMessagingRepository(),
    itineraries: new InMemoryItineraryRepository(),
    dashboard: new InMemoryDashboardRepository(),
    management: new InMemoryManagementRepository()
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
