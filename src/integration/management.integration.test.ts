import test from 'node:test';
import assert from 'node:assert/strict';
import { integrationTestHeaders, startIntegrationServer, stopIntegrationServer } from './test-harness';

function testHeaders(role = 'owner'): Record<string, string> {
  return integrationTestHeaders(role);
}

const startServer = startIntegrationServer;
const stopServer = stopIntegrationServer;

test('owner can create and update management setting', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const createResponse = await fetch(`${baseUrl}/management`, {
      method: 'POST',
      headers: testHeaders('owner'),
      body: JSON.stringify({
        key: 'booking_window_days',
        value: '45',
        description: 'Ventana de reserva recomendada'
      })
    });

    assert.equal(createResponse.status, 201);
    const created = (await createResponse.json()) as { data: { id: string } };

    const patchResponse = await fetch(`${baseUrl}/management/${created.data.id}`, {
      method: 'PATCH',
      headers: testHeaders('owner'),
      body: JSON.stringify({ value: '60' })
    });

    assert.equal(patchResponse.status, 200);
  } finally {
    await stopServer(server);
  }
});

test('manager can read settings but cannot write', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const readResponse = await fetch(`${baseUrl}/management`, {
      method: 'GET',
      headers: testHeaders('manager')
    });

    assert.equal(readResponse.status, 200);

    const writeResponse = await fetch(`${baseUrl}/management`, {
      method: 'POST',
      headers: testHeaders('manager'),
      body: JSON.stringify({
        key: 'default_markup_pct',
        value: '12'
      })
    });

    assert.equal(writeResponse.status, 403);
  } finally {
    await stopServer(server);
  }
});

test('owner can read CFDI readiness endpoint in memory mode', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const response = await fetch(`${baseUrl}/management/cfdi/readiness`, {
      method: 'GET',
      headers: testHeaders('owner')
    });

    assert.equal(response.status, 200);
    const payload = (await response.json()) as {
      message: string;
      data: {
        ready: boolean;
        storageMode: string;
        reason?: string;
        checkedTables: string[];
        missingTables: string[];
      };
    };

    assert.equal(payload.message, 'Readiness CFDI no disponible en modo memoria');
    assert.equal(payload.data.ready, false);
    assert.equal(payload.data.storageMode, 'memory');
    assert.equal(payload.data.reason, 'storage_mode_not_postgres');
    assert.deepEqual(payload.data.checkedTables, ['sat_certificates', 'cfdi_invoices', 'cfdi_invoice_events']);
    assert.deepEqual(payload.data.missingTables, ['sat_certificates', 'cfdi_invoices', 'cfdi_invoice_events']);
  } finally {
    await stopServer(server);
  }
});

test('manager can read CFDI readiness endpoint with en-US locale', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const response = await fetch(`${baseUrl}/management/cfdi/readiness`, {
      method: 'GET',
      headers: integrationTestHeaders('manager', 'en-US')
    });

    assert.equal(response.status, 200);
    const payload = (await response.json()) as {
      message: string;
      data: {
        ready: boolean;
      };
    };

    assert.equal(payload.message, 'CFDI readiness is unavailable in memory mode');
    assert.equal(payload.data.ready, false);
  } finally {
    await stopServer(server);
  }
});