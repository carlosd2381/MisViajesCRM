import test from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { createApiServer } from '../app';
import { InMemoryLeadRepository } from '../modules/leads/infrastructure/in-memory-lead-repository';
import { InMemoryClientRepository } from '../modules/clients/infrastructure/in-memory-client-repository';
import { InMemorySupplierRepository } from '../modules/suppliers/infrastructure/in-memory-supplier-repository';
import { InMemoryCommissionRepository } from '../modules/commissions/infrastructure/in-memory-commission-repository';
import { InMemoryItineraryRepository } from '../modules/itinerary/infrastructure/in-memory-itinerary-repository';

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

test('manager can read commissions but cannot write', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const listResponse = await fetch(`${baseUrl}/commissions`, {
      headers: testHeaders('manager')
    });
    assert.equal(listResponse.status, 200);

    const createResponse = await fetch(`${baseUrl}/commissions`, {
      method: 'POST',
      headers: testHeaders('manager'),
      body: JSON.stringify({
        itineraryId: 'it_1',
        supplierId: 'sup_1',
        expectedAmount: 1000,
        dueDate: '2026-04-01'
      })
    });
    assert.equal(createResponse.status, 403);
  } finally {
    await stopServer(server);
  }
});

test('accountant can create and update commissions', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const createResponse = await fetch(`${baseUrl}/commissions`, {
      method: 'POST',
      headers: testHeaders('accountant'),
      body: JSON.stringify({
        itineraryId: 'it_1',
        supplierId: 'sup_1',
        expectedAmount: 1300,
        dueDate: '2026-04-10',
        status: 'claimed'
      })
    });

    assert.equal(createResponse.status, 201);
    const created = (await createResponse.json()) as { data: { id: string } };

    const patchResponse = await fetch(`${baseUrl}/commissions/${created.data.id}`, {
      method: 'PATCH',
      headers: testHeaders('accountant'),
      body: JSON.stringify({
        actualReceived: 1300,
        receivedDate: '2026-04-11',
        status: 'paid'
      })
    });

    assert.equal(patchResponse.status, 200);
  } finally {
    await stopServer(server);
  }
});
