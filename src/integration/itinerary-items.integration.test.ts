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

test('adding itinerary items recalculates itinerary totals', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const createClient = await fetch(`${baseUrl}/clients`, {
      method: 'POST',
      headers: testHeaders('agent'),
      body: JSON.stringify({
        firstName: 'Raul',
        paternalLastName: 'Nava',
        contacts: [{ type: 'email', value: 'raul@example.com' }]
      })
    });

    assert.equal(createClient.status, 201);
    const clientPayload = (await createClient.json()) as { data: { id: string } };

    const createItinerary = await fetch(`${baseUrl}/itineraries`, {
      method: 'POST',
      headers: testHeaders('agent'),
      body: JSON.stringify({
        clientId: clientPayload.data.id,
        agentId: 'agent_1',
        title: 'Paquete Riviera',
        currency: 'MXN',
        grossTotal: 0,
        netTotal: 0,
        serviceFeeAmount: 0
      })
    });

    assert.equal(createItinerary.status, 201);
    const itineraryPayload = (await createItinerary.json()) as { data: { id: string } };
    const itineraryId = itineraryPayload.data.id;

    const addFlight = await fetch(`${baseUrl}/itineraries/${itineraryId}/items`, {
      method: 'POST',
      headers: testHeaders('agent'),
      body: JSON.stringify({
        title: 'Vuelo redondo',
        category: 'flight',
        quantity: 2,
        unitNet: 2500,
        unitGross: 3200,
        serviceFeeAmount: 200
      })
    });

    assert.equal(addFlight.status, 201);

    const addHotel = await fetch(`${baseUrl}/itineraries/${itineraryId}/items`, {
      method: 'POST',
      headers: testHeaders('agent'),
      body: JSON.stringify({
        title: 'Hotel 3 noches',
        category: 'hotel',
        quantity: 3,
        unitNet: 1200,
        unitGross: 1600,
        serviceFeeAmount: 300
      })
    });

    assert.equal(addHotel.status, 201);

    const listItems = await fetch(`${baseUrl}/itineraries/${itineraryId}/items`, {
      method: 'GET',
      headers: testHeaders('agent')
    });

    assert.equal(listItems.status, 200);
    const listPayload = (await listItems.json()) as { data: Array<{ id: string }> };
    assert.equal(listPayload.data.length, 2);

    const getItinerary = await fetch(`${baseUrl}/itineraries/${itineraryId}`, {
      method: 'GET',
      headers: testHeaders('agent')
    });

    assert.equal(getItinerary.status, 200);
    const itineraryResult = (await getItinerary.json()) as {
      data: {
        grossTotal: number;
        netTotal: number;
        serviceFeeAmount: number;
        markupAmount: number;
        agencyProfit: number;
      };
    };

    assert.equal(itineraryResult.data.grossTotal, 11200);
    assert.equal(itineraryResult.data.netTotal, 8600);
    assert.equal(itineraryResult.data.serviceFeeAmount, 500);
    assert.equal(itineraryResult.data.markupAmount, 2600);
    assert.equal(itineraryResult.data.agencyProfit, 3100);
  } finally {
    await stopServer(server);
  }
});
