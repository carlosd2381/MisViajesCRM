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

test('agent can move itinerary pipeline from draft to sent and read events', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const createClient = await fetch(`${baseUrl}/clients`, {
      method: 'POST',
      headers: testHeaders('agent'),
      body: JSON.stringify({
        firstName: 'Diana',
        paternalLastName: 'Lopez',
        contacts: [{ type: 'email', value: 'diana@example.com' }]
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
        title: 'Pipeline Test',
        currency: 'MXN',
        grossTotal: 10000,
        netTotal: 9000
      })
    });

    assert.equal(createItinerary.status, 201);
    const itineraryPayload = (await createItinerary.json()) as { data: { id: string; status: string } };
    assert.equal(itineraryPayload.data.status, 'draft');

    const move = await fetch(`${baseUrl}/itineraries/${itineraryPayload.data.id}/pipeline/move`, {
      method: 'POST',
      headers: testHeaders('agent'),
      body: JSON.stringify({
        toStatus: 'sent',
        notes: 'Cliente listo para revisión'
      })
    });

    assert.equal(move.status, 200);
    const movePayload = (await move.json()) as {
      data: {
        itinerary: { status: string };
        event: { fromStatus?: string; toStatus: string; notes?: string };
      }
    };
    assert.equal(movePayload.data.itinerary.status, 'sent');
    assert.equal(movePayload.data.event.fromStatus, 'draft');
    assert.equal(movePayload.data.event.toStatus, 'sent');
    assert.equal(movePayload.data.event.notes, 'Cliente listo para revisión');

    const eventsResponse = await fetch(`${baseUrl}/itineraries/${itineraryPayload.data.id}/pipeline/events`, {
      headers: testHeaders('agent')
    });

    assert.equal(eventsResponse.status, 200);
    const eventsPayload = (await eventsResponse.json()) as {
      data: Array<{ fromStatus?: string; toStatus: string }>;
    };
    assert.equal(eventsPayload.data.length, 1);
    assert.equal(eventsPayload.data[0]?.fromStatus, 'draft');
    assert.equal(eventsPayload.data[0]?.toStatus, 'sent');
  } finally {
    await stopServer(server);
  }
});

test('pipeline move rejects invalid transition', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const createClient = await fetch(`${baseUrl}/clients`, {
      method: 'POST',
      headers: testHeaders('agent'),
      body: JSON.stringify({
        firstName: 'Mariana',
        paternalLastName: 'Diaz',
        contacts: [{ type: 'email', value: 'mariana@example.com' }]
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
        title: 'Pipeline Invalid Transition',
        currency: 'MXN',
        grossTotal: 10000,
        netTotal: 9000
      })
    });

    assert.equal(createItinerary.status, 201);
    const itineraryPayload = (await createItinerary.json()) as { data: { id: string } };

    const invalidMove = await fetch(`${baseUrl}/itineraries/${itineraryPayload.data.id}/pipeline/move`, {
      method: 'POST',
      headers: testHeaders('agent'),
      body: JSON.stringify({ toStatus: 'accepted' })
    });

    assert.equal(invalidMove.status, 409);
  } finally {
    await stopServer(server);
  }
});

test('day and activity CRUD supports reorder and total recalculation', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const createClient = await fetch(`${baseUrl}/clients`, {
      method: 'POST',
      headers: testHeaders('agent'),
      body: JSON.stringify({
        firstName: 'Paola',
        paternalLastName: 'Ramos',
        contacts: [{ type: 'email', value: 'paola@example.com' }]
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
        title: 'Builder CRUD Test',
        currency: 'MXN',
        grossTotal: 0,
        netTotal: 0
      })
    });

    assert.equal(createItinerary.status, 201);
    const itineraryPayload = (await createItinerary.json()) as { data: { id: string } };

    const createDay = await fetch(`${baseUrl}/itineraries/${itineraryPayload.data.id}/days`, {
      method: 'POST',
      headers: testHeaders('agent'),
      body: JSON.stringify({
        dayIndex: 1,
        title: 'Día 1'
      })
    });

    assert.equal(createDay.status, 201);
    const dayPayload = (await createDay.json()) as { data: { id: string; dayIndex: number } };
    assert.equal(dayPayload.data.dayIndex, 1);

    const updateDay = await fetch(`${baseUrl}/itineraries/${itineraryPayload.data.id}/days/${dayPayload.data.id}`, {
      method: 'PATCH',
      headers: testHeaders('agent'),
      body: JSON.stringify({ dayIndex: 2, title: 'Día 2' })
    });

    assert.equal(updateDay.status, 200);
    const updatedDayPayload = (await updateDay.json()) as { data: { dayIndex: number; title: string } };
    assert.equal(updatedDayPayload.data.dayIndex, 2);
    assert.equal(updatedDayPayload.data.title, 'Día 2');

    const createActivity = await fetch(`${baseUrl}/itineraries/${itineraryPayload.data.id}/days/${dayPayload.data.id}/activities`, {
      method: 'POST',
      headers: testHeaders('agent'),
      body: JSON.stringify({
        activityIndex: 1,
        title: 'Hotel Boutique',
        category: 'hotel',
        priceNet: 1000,
        priceGross: 1200,
        optionalEnabled: true
      })
    });

    assert.equal(createActivity.status, 201);
    const activityPayload = (await createActivity.json()) as {
      data: {
        activity: { id: string; activityIndex: number; optionalEnabled: boolean };
        itinerary: { grossTotal: number; netTotal: number };
      }
    };
    assert.equal(activityPayload.data.activity.activityIndex, 1);
    assert.equal(activityPayload.data.activity.optionalEnabled, true);
    assert.equal(activityPayload.data.itinerary.grossTotal, 1200);
    assert.equal(activityPayload.data.itinerary.netTotal, 1000);

    const updateActivity = await fetch(`${baseUrl}/itineraries/${itineraryPayload.data.id}/days/${dayPayload.data.id}/activities/${activityPayload.data.activity.id}`, {
      method: 'PATCH',
      headers: testHeaders('agent'),
      body: JSON.stringify({
        activityIndex: 2,
        optionalEnabled: false,
        priceNet: 1000,
        priceGross: 1200
      })
    });

    assert.equal(updateActivity.status, 200);
    const updatedActivityPayload = (await updateActivity.json()) as {
      data: {
        activity: { activityIndex: number; optionalEnabled: boolean };
        itinerary: { grossTotal: number; netTotal: number };
      }
    };
    assert.equal(updatedActivityPayload.data.activity.activityIndex, 2);
    assert.equal(updatedActivityPayload.data.activity.optionalEnabled, false);
    assert.equal(updatedActivityPayload.data.itinerary.grossTotal, 0);
    assert.equal(updatedActivityPayload.data.itinerary.netTotal, 0);
  } finally {
    await stopServer(server);
  }
});

test('destination library search returns curated internal content first', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const response = await fetch(`${baseUrl}/itineraries/library/destinations?location=oaxaca&category=activity&limit=5`, {
      headers: testHeaders('agent')
    });

    assert.equal(response.status, 200);
    const payload = (await response.json()) as {
      data: Array<{ contentSource: string; locationName: string; mediaUrl?: string; description?: string }>;
    };

    assert.ok(payload.data.length > 0);
    assert.equal(payload.data[0]?.contentSource, 'internal');
    assert.equal(payload.data[0]?.locationName, 'Oaxaca');
    assert.ok((payload.data[0]?.mediaUrl ?? '').length > 0);
    assert.ok((payload.data[0]?.description ?? '').length > 0);
  } finally {
    await stopServer(server);
  }
});

test('destination library search falls back when no curated content exists', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const response = await fetch(`${baseUrl}/itineraries/library/destinations?location=patagonia&category=hotel`, {
      headers: testHeaders('agent')
    });

    assert.equal(response.status, 200);
    const payload = (await response.json()) as {
      data: Array<{ contentSource: string; locationName: string; mediaUrl?: string }>;
    };

    assert.equal(payload.data.length, 1);
    assert.equal(payload.data[0]?.contentSource, 'fallback');
    assert.equal(payload.data[0]?.locationName, 'patagonia');
    assert.ok((payload.data[0]?.mediaUrl ?? '').includes('placeholder'));
  } finally {
    await stopServer(server);
  }
});

test('publish proposal and approve action via public portal updates itinerary and notifies messaging', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const createClient = await fetch(`${baseUrl}/clients`, {
      method: 'POST',
      headers: testHeaders('agent'),
      body: JSON.stringify({
        firstName: 'Ana',
        paternalLastName: 'Torres',
        contacts: [{ type: 'email', value: 'ana@example.com' }]
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
        title: 'Portal Approve Test',
        currency: 'MXN',
        grossTotal: 12000,
        netTotal: 10000
      })
    });

    assert.equal(createItinerary.status, 201);
    const itineraryPayload = (await createItinerary.json()) as { data: { id: string } };

    const publish = await fetch(`${baseUrl}/itineraries/${itineraryPayload.data.id}/publish`, {
      method: 'POST',
      headers: testHeaders('agent'),
      body: JSON.stringify({})
    });

    assert.equal(publish.status, 201);
    const publishPayload = (await publish.json()) as {
      data: { hash: string; status: string; urlPath: string };
    };
    assert.equal(publishPayload.data.status, 'active');
    assert.ok(publishPayload.data.urlPath.includes(publishPayload.data.hash));

    const portalView = await fetch(`${baseUrl}/portal/proposals/${publishPayload.data.hash}`);
    assert.equal(portalView.status, 200);

    const approve = await fetch(`${baseUrl}/portal/proposals/${publishPayload.data.hash}/actions/approve`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message: 'Listo para avanzar' })
    });

    assert.equal(approve.status, 200);
    const approvePayload = (await approve.json()) as { data: { itinerary: { status: string } } };
    assert.equal(approvePayload.data.itinerary.status, 'accepted');

    const messages = await fetch(`${baseUrl}/messaging`, { headers: testHeaders('agent') });
    assert.equal(messages.status, 200);
    const messagesPayload = (await messages.json()) as { data: Array<{ content: string }> };
    assert.ok(messagesPayload.data.some((item) => item.content.includes('proposal.approve')));
  } finally {
    await stopServer(server);
  }
});

test('public portal request revision sets revised status and emits notification', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const createClient = await fetch(`${baseUrl}/clients`, {
      method: 'POST',
      headers: testHeaders('agent'),
      body: JSON.stringify({
        firstName: 'Laura',
        paternalLastName: 'Mendez',
        contacts: [{ type: 'email', value: 'laura@example.com' }]
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
        title: 'Portal Revision Test',
        currency: 'MXN',
        grossTotal: 9000,
        netTotal: 8000
      })
    });

    assert.equal(createItinerary.status, 201);
    const itineraryPayload = (await createItinerary.json()) as { data: { id: string } };

    const publish = await fetch(`${baseUrl}/itineraries/${itineraryPayload.data.id}/publish`, {
      method: 'POST',
      headers: testHeaders('agent'),
      body: JSON.stringify({})
    });

    assert.equal(publish.status, 201);
    const publishPayload = (await publish.json()) as { data: { hash: string } };

    const revision = await fetch(`${baseUrl}/portal/proposals/${publishPayload.data.hash}/actions/request-revision`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ feedback: 'Ajustar hotel y tiempos de traslado' })
    });

    assert.equal(revision.status, 200);
    const revisionPayload = (await revision.json()) as { data: { itinerary: { status: string } } };
    assert.equal(revisionPayload.data.itinerary.status, 'revised');

    const messages = await fetch(`${baseUrl}/messaging`, { headers: testHeaders('agent') });
    assert.equal(messages.status, 200);
    const messagesPayload = (await messages.json()) as { data: Array<{ content: string }> };
    assert.ok(messagesPayload.data.some((item) => item.content.includes('proposal.request_revision')));
  } finally {
    await stopServer(server);
  }
});
