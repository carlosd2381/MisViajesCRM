import test from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { createApiServer } from '../app';
import { InMemoryLeadRepository } from '../modules/leads/infrastructure/in-memory-lead-repository';
import { InMemoryClientRepository } from '../modules/clients/infrastructure/in-memory-client-repository';
import { InMemoryItineraryRepository } from '../modules/itinerary/infrastructure/in-memory-itinerary-repository';
import { InMemorySupplierRepository } from '../modules/suppliers/infrastructure/in-memory-supplier-repository';
import { signAuthToken } from '../core/auth/token-service';

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
    itineraries: new InMemoryItineraryRepository()
  }, { authMode: 'header' });

  await new Promise<void>((resolve) => {
    server.listen(0, () => resolve());
  });

  const address = server.address() as AddressInfo;
  return { server, baseUrl: `http://127.0.0.1:${address.port}` };
}

async function startTokenServer(): Promise<{ server: Server; baseUrl: string }> {
  const server = createApiServer({
    leads: new InMemoryLeadRepository(),
    clients: new InMemoryClientRepository(),
    suppliers: new InMemorySupplierRepository(),
    itineraries: new InMemoryItineraryRepository()
  }, { authMode: 'token' });

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

test('token mode rejects request without bearer token', async () => {
  const { server, baseUrl } = await startTokenServer();

  try {
    const response = await fetch(`${baseUrl}/leads`);
    assert.equal(response.status, 401);
  } finally {
    await stopServer(server);
  }
});

test('token mode accepts valid bearer token', async () => {
  const { server, baseUrl } = await startTokenServer();

  try {
    const token = signAuthToken({ userId: 'u_token', role: 'agent' }, 300);
    const response = await fetch(`${baseUrl}/leads`, {
      headers: {
        authorization: `Bearer ${token}`,
        'x-locale': 'es-MX'
      }
    });

    assert.equal(response.status, 200);
  } finally {
    await stopServer(server);
  }
});

test('auth token endpoint issues access and refresh pair', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const response = await fetch(`${baseUrl}/auth/token`, {
      method: 'POST',
      headers: testHeaders('manager')
    });

    assert.equal(response.status, 200);
    const payload = (await response.json()) as {
      data: { accessToken: string; refreshToken: string };
    };

    assert.equal(typeof payload.data.accessToken, 'string');
    assert.equal(typeof payload.data.refreshToken, 'string');
  } finally {
    await stopServer(server);
  }
});

test('auth refresh rotates refresh token and revocation blocks reuse', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const issue = await fetch(`${baseUrl}/auth/token`, {
      method: 'POST',
      headers: testHeaders('agent')
    });

    const issuePayload = (await issue.json()) as {
      data: { refreshToken: string };
    };

    const firstRefresh = issuePayload.data.refreshToken;

    const refresh = await fetch(`${baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-locale': 'es-MX' },
      body: JSON.stringify({ refreshToken: firstRefresh })
    });

    assert.equal(refresh.status, 200);
    const refreshPayload = (await refresh.json()) as {
      data: { refreshToken: string };
    };

    const secondRefresh = refreshPayload.data.refreshToken;
    assert.notEqual(secondRefresh, firstRefresh);

    const revoke = await fetch(`${baseUrl}/auth/revoke`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-locale': 'es-MX' },
      body: JSON.stringify({ refreshToken: secondRefresh })
    });

    assert.equal(revoke.status, 200);

    const reuse = await fetch(`${baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-locale': 'es-MX' },
      body: JSON.stringify({ refreshToken: secondRefresh })
    });

    assert.equal(reuse.status, 401);
  } finally {
    await stopServer(server);
  }
});

test('auth revoke-all invalidates all user refresh sessions', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const issue1 = await fetch(`${baseUrl}/auth/token`, {
      method: 'POST',
      headers: testHeaders('agent')
    });

    const issue2 = await fetch(`${baseUrl}/auth/token`, {
      method: 'POST',
      headers: testHeaders('agent')
    });

    const one = (await issue1.json()) as { data: { refreshToken: string } };
    const two = (await issue2.json()) as { data: { refreshToken: string } };

    const revokeAll = await fetch(`${baseUrl}/auth/revoke-all`, {
      method: 'POST',
      headers: testHeaders('agent'),
      body: JSON.stringify({})
    });

    assert.equal(revokeAll.status, 200);

    const reuseOne = await fetch(`${baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-locale': 'es-MX' },
      body: JSON.stringify({ refreshToken: one.data.refreshToken })
    });

    const reuseTwo = await fetch(`${baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-locale': 'es-MX' },
      body: JSON.stringify({ refreshToken: two.data.refreshToken })
    });

    assert.equal(reuseOne.status, 401);
    assert.equal(reuseTwo.status, 401);
  } finally {
    await stopServer(server);
  }
});

test('auth prune requires manager or owner role', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const forbidden = await fetch(`${baseUrl}/auth/prune`, {
      method: 'POST',
      headers: testHeaders('agent')
    });

    assert.equal(forbidden.status, 403);

    const allowed = await fetch(`${baseUrl}/auth/prune`, {
      method: 'POST',
      headers: testHeaders('manager')
    });

    assert.equal(allowed.status, 200);
  } finally {
    await stopServer(server);
  }
});

