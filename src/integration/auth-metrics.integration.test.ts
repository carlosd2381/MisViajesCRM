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

test('auth metrics requires manager or owner role', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const forbidden = await fetch(`${baseUrl}/auth/metrics`, {
      method: 'GET',
      headers: testHeaders('agent')
    });

    assert.equal(forbidden.status, 403);

    const allowed = await fetch(`${baseUrl}/auth/metrics`, {
      method: 'GET',
      headers: testHeaders('manager')
    });

    assert.equal(allowed.status, 200);
  } finally {
    await stopServer(server);
  }
});

test('auth metrics includes counters after auth operations', async () => {
  const { server, baseUrl } = await startServer();

  try {
    await fetch(`${baseUrl}/auth/token`, {
      method: 'POST',
      headers: testHeaders('agent')
    });

    const metricsResponse = await fetch(`${baseUrl}/auth/metrics`, {
      method: 'GET',
      headers: testHeaders('manager')
    });

    assert.equal(metricsResponse.status, 200);
    const payload = (await metricsResponse.json()) as {
      data: { counters: Record<string, number> };
    };

    assert.ok((payload.data.counters['issue.success'] ?? 0) >= 1);
  } finally {
    await stopServer(server);
  }
});

test('auth prometheus metrics requires manager or owner role', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const forbidden = await fetch(`${baseUrl}/auth/metrics/prom`, {
      method: 'GET',
      headers: testHeaders('agent')
    });

    assert.equal(forbidden.status, 403);

    const allowed = await fetch(`${baseUrl}/auth/metrics/prom`, {
      method: 'GET',
      headers: testHeaders('manager')
    });

    assert.equal(allowed.status, 200);
    assert.match(allowed.headers.get('content-type') ?? '', /text\/plain/);
  } finally {
    await stopServer(server);
  }
});

test('auth prometheus metrics exports counters', async () => {
  const { server, baseUrl } = await startServer();

  try {
    await fetch(`${baseUrl}/auth/token`, {
      method: 'POST',
      headers: testHeaders('agent')
    });

    const response = await fetch(`${baseUrl}/auth/metrics/prom`, {
      method: 'GET',
      headers: testHeaders('manager')
    });

    assert.equal(response.status, 200);
    const body = await response.text();

    assert.match(body, /misviajescrm_auth_refresh_counter/);
    assert.match(body, /operation="issue"/);
  } finally {
    await stopServer(server);
  }
});
