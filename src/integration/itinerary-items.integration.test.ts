import test from 'node:test';
import assert from 'node:assert/strict';
import {
  integrationTestHeaders,
  startIntegrationServer,
  stopIntegrationServer
} from './test-harness';

test('adding itinerary items recalculates itinerary totals', async () => {
  const { server, baseUrl } = await startIntegrationServer();

  try {
    const createClient = await fetch(`${baseUrl}/clients`, {
      method: 'POST',
      headers: integrationTestHeaders('agent'),
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
      headers: integrationTestHeaders('agent'),
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
      headers: integrationTestHeaders('agent'),
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
      headers: integrationTestHeaders('agent'),
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
      headers: integrationTestHeaders('agent')
    });

    assert.equal(listItems.status, 200);
    const listPayload = (await listItems.json()) as { data: Array<{ id: string }> };
    assert.equal(listPayload.data.length, 2);

    const getItinerary = await fetch(`${baseUrl}/itineraries/${itineraryId}`, {
      method: 'GET',
      headers: integrationTestHeaders('agent')
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
    await stopIntegrationServer(server);
  }
});
