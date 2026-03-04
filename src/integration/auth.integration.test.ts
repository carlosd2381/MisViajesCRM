import test from 'node:test';
import assert from 'node:assert/strict';
import { signAuthToken } from '../core/auth/token-service';
import {
  bearerHeaders,
  integrationTestHeaders,
  issueIntegrationTokenPair,
  startIntegrationServer,
  stopIntegrationServer
} from './test-harness';

function testHeaders(role = 'agent'): Record<string, string> {
  return integrationTestHeaders(role);
}

const startServer = () => startIntegrationServer('header');

const startTokenServer = () => startIntegrationServer('token');

const stopServer = stopIntegrationServer;

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
      headers: bearerHeaders(token)
    });

    assert.equal(response.status, 200);
  } finally {
    await stopServer(server);
  }
});

test('auth token endpoint issues access and refresh pair', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const tokenPair = await issueIntegrationTokenPair(baseUrl, 'manager');
    assert.equal(typeof tokenPair.accessToken, 'string');
    assert.equal(typeof tokenPair.refreshToken, 'string');
  } finally {
    await stopServer(server);
  }
});

test('auth refresh rotates refresh token and revocation blocks reuse', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const firstIssue = await issueIntegrationTokenPair(baseUrl, 'agent');
    const firstRefresh = firstIssue.refreshToken;

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
    const one = await issueIntegrationTokenPair(baseUrl, 'agent');
    const two = await issueIntegrationTokenPair(baseUrl, 'agent');

    const revokeAll = await fetch(`${baseUrl}/auth/revoke-all`, {
      method: 'POST',
      headers: testHeaders('agent'),
      body: JSON.stringify({})
    });

    assert.equal(revokeAll.status, 200);

    const reuseOne = await fetch(`${baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-locale': 'es-MX' },
      body: JSON.stringify({ refreshToken: one.refreshToken })
    });

    const reuseTwo = await fetch(`${baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-locale': 'es-MX' },
      body: JSON.stringify({ refreshToken: two.refreshToken })
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

