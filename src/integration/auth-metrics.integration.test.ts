import test from 'node:test';
import assert from 'node:assert/strict';
import {
  integrationTestHeaders,
  issueIntegrationTokenPair,
  startIntegrationServer,
  stopIntegrationServer
} from './test-harness';

function testHeaders(role = 'agent'): Record<string, string> {
  return integrationTestHeaders(role);
}

const startServer = startIntegrationServer;
const stopServer = stopIntegrationServer;

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
    await issueIntegrationTokenPair(baseUrl, 'agent');

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
    await issueIntegrationTokenPair(baseUrl, 'agent');

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
