import test from 'node:test';
import assert from 'node:assert/strict';
import { integrationTestHeaders, startIntegrationServer, stopIntegrationServer } from './test-harness';

function testHeaders(role = 'agent'): Record<string, string> {
  return integrationTestHeaders(role);
}

const startServer = startIntegrationServer;
const stopServer = stopIntegrationServer;

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
