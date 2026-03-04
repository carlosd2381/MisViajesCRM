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

test('itinerary create and fetch flow works', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const createClient = await fetch(`${baseUrl}/clients`, {
      method: 'POST',
      headers: testHeaders(),
      body: JSON.stringify({
        firstName: 'Lucia',
        paternalLastName: 'Perez',
        contacts: [{ type: 'email', value: 'lucia@example.com' }]
      })
    });

    assert.equal(createClient.status, 201);
    const clientPayload = (await createClient.json()) as { data: { id: string } };

    const createItinerary = await fetch(`${baseUrl}/itineraries`, {
      method: 'POST',
      headers: testHeaders(),
      body: JSON.stringify({
        clientId: clientPayload.data.id,
        agentId: 'agent_1',
        title: 'Escapada en Oaxaca',
        currency: 'MXN',
        grossTotal: 12000,
        netTotal: 10000,
        serviceFeeAmount: 500
      })
    });

    assert.equal(createItinerary.status, 201);
    const itineraryPayload = (await createItinerary.json()) as { data: { id: string } };

    const getItinerary = await fetch(`${baseUrl}/itineraries/${itineraryPayload.data.id}`, {
      headers: testHeaders()
    });

    assert.equal(getItinerary.status, 200);
  } finally {
    await stopServer(server);
  }
});

test('accountant cannot write itineraries', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const response = await fetch(`${baseUrl}/itineraries`, {
      method: 'POST',
      headers: testHeaders('accountant'),
      body: JSON.stringify({
        clientId: 'client_1',
        agentId: 'agent_1',
        title: 'Intento bloqueado',
        currency: 'MXN',
        grossTotal: 1000,
        netTotal: 900
      })
    });

    assert.equal(response.status, 403);
  } finally {
    await stopServer(server);
  }
});

test('manager can approve itinerary', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const createClient = await fetch(`${baseUrl}/clients`, {
      method: 'POST',
      headers: testHeaders('agent'),
      body: JSON.stringify({
        firstName: 'Mario',
        paternalLastName: 'Ruiz',
        contacts: [{ type: 'email', value: 'mario@example.com' }]
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
        title: 'Ruta Yucatán',
        currency: 'MXN',
        grossTotal: 18000,
        netTotal: 15000
      })
    });

    assert.equal(createItinerary.status, 201);
    const itineraryPayload = (await createItinerary.json()) as { data: { id: string } };

    const approve = await fetch(`${baseUrl}/itineraries/${itineraryPayload.data.id}/approve`, {
      method: 'POST',
      headers: testHeaders('manager')
    });

    assert.equal(approve.status, 200);
    const approvePayload = (await approve.json()) as { data: { status: string } };
    assert.equal(approvePayload.data.status, 'accepted');
  } finally {
    await stopServer(server);
  }
});

test('agent cannot approve itinerary', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const createClient = await fetch(`${baseUrl}/clients`, {
      method: 'POST',
      headers: testHeaders('agent'),
      body: JSON.stringify({
        firstName: 'Sofia',
        paternalLastName: 'Mejia',
        contacts: [{ type: 'email', value: 'sofia@example.com' }]
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
        title: 'Intento aprobación',
        currency: 'MXN',
        grossTotal: 9000,
        netTotal: 8000
      })
    });

    assert.equal(createItinerary.status, 201);
    const itineraryPayload = (await createItinerary.json()) as { data: { id: string } };

    const approve = await fetch(`${baseUrl}/itineraries/${itineraryPayload.data.id}/approve`, {
      method: 'POST',
      headers: testHeaders('agent')
    });

    assert.equal(approve.status, 403);
  } finally {
    await stopServer(server);
  }
});
