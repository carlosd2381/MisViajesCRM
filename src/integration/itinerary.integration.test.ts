import test from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { createApiServer } from '../app';
import { InMemoryLeadRepository } from '../modules/leads/infrastructure/in-memory-lead-repository';
import { InMemoryClientRepository } from '../modules/clients/infrastructure/in-memory-client-repository';
import { InMemoryItineraryRepository } from '../modules/itinerary/infrastructure/in-memory-itinerary-repository';

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
