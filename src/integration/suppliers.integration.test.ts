import test from 'node:test';
import assert from 'node:assert/strict';
import {
  bearerHeaders,
  integrationTestHeaders,
  issueIntegrationTokenPair,
  startIntegrationServer,
  stopIntegrationServer
} from './test-harness';

function testHeaders(role = 'agent', locale = 'es-MX'): Record<string, string> {
  return integrationTestHeaders(role, locale);
}

const startServer = startIntegrationServer;
const stopServer = stopIntegrationServer;

test('supplier create and fetch flow works for manager', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const createResponse = await fetch(`${baseUrl}/suppliers`, {
      method: 'POST',
      headers: testHeaders('manager'),
      body: JSON.stringify({
        name: 'Operadora Riviera',
        type: 'dmc',
        status: 'active',
        defaultCurrency: 'MXN',
        commissionType: 'percentage',
        commissionRate: 12,
        payoutTerms: 'post_travel_30',
        internalRiskFlag: 'reliable'
      })
    });

    assert.equal(createResponse.status, 201);
    const created = (await createResponse.json()) as { data: { id: string } };

    const getResponse = await fetch(`${baseUrl}/suppliers/${created.data.id}`, {
      headers: testHeaders('manager')
    });

    assert.equal(getResponse.status, 200);
  } finally {
    await stopServer(server);
  }
});

test('agent cannot write suppliers', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const response = await fetch(`${baseUrl}/suppliers`, {
      method: 'POST',
      headers: testHeaders('agent'),
      body: JSON.stringify({
        name: 'Proveedor Bloqueado',
        type: 'hotel',
        status: 'active',
        defaultCurrency: 'MXN',
        commissionType: 'percentage',
        commissionRate: 10,
        payoutTerms: 'upon_booking',
        internalRiskFlag: 'caution'
      })
    });

    assert.equal(response.status, 403);
  } finally {
    await stopServer(server);
  }
});

test('manager can delete supplier and it is no longer retrievable', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const createResponse = await fetch(`${baseUrl}/suppliers`, {
      method: 'POST',
      headers: testHeaders('manager'),
      body: JSON.stringify({
        name: 'Proveedor Temporal',
        type: 'hotel',
        status: 'active',
        defaultCurrency: 'MXN',
        commissionType: 'percentage',
        commissionRate: 10,
        payoutTerms: 'upon_booking',
        internalRiskFlag: 'reliable'
      })
    });

    assert.equal(createResponse.status, 201);
    const created = (await createResponse.json()) as { data: { id: string } };

    const deleteResponse = await fetch(`${baseUrl}/suppliers/${created.data.id}`, {
      method: 'DELETE',
      headers: testHeaders('manager')
    });

    assert.equal(deleteResponse.status, 200);

    const getResponse = await fetch(`${baseUrl}/suppliers/${created.data.id}`, {
      headers: testHeaders('manager')
    });

    assert.equal(getResponse.status, 404);
  } finally {
    await stopServer(server);
  }
});

test('supplier cascade delete requires explicit confirmation text', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const createResponse = await fetch(`${baseUrl}/suppliers`, {
      method: 'POST',
      headers: testHeaders('manager'),
      body: JSON.stringify({
        name: 'Proveedor Confirmación',
        type: 'hotel',
        status: 'active',
        defaultCurrency: 'MXN',
        commissionType: 'percentage',
        commissionRate: 10,
        payoutTerms: 'upon_booking',
        internalRiskFlag: 'reliable'
      })
    });

    assert.equal(createResponse.status, 201);
    const created = (await createResponse.json()) as { data: { id: string } };

    const invalidCascade = await fetch(`${baseUrl}/suppliers/${created.data.id}?cascade=true`, {
      method: 'DELETE',
      headers: testHeaders('manager'),
      body: JSON.stringify({ confirmation: 'eliminar' })
    });

    assert.equal(invalidCascade.status, 400);

    const stillExists = await fetch(`${baseUrl}/suppliers/${created.data.id}`, {
      headers: testHeaders('manager')
    });

    assert.equal(stillExists.status, 200);

    const validCascade = await fetch(`${baseUrl}/suppliers/${created.data.id}?cascade=true`, {
      method: 'DELETE',
      headers: testHeaders('manager'),
      body: JSON.stringify({ confirmation: 'Eliminar todo' })
    });

    assert.equal(validCascade.status, 200);
  } finally {
    await stopServer(server);
  }
});

test('supplier cascade delete accepts en-US confirmation phrase "Delete all"', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const createResponse = await fetch(`${baseUrl}/suppliers`, {
      method: 'POST',
      headers: testHeaders('manager', 'en-US'),
      body: JSON.stringify({
        name: 'Supplier EN Cascade',
        type: 'hotel',
        status: 'active',
        defaultCurrency: 'USD',
        commissionType: 'percentage',
        commissionRate: 9,
        payoutTerms: 'upon_booking',
        internalRiskFlag: 'reliable'
      })
    });

    assert.equal(createResponse.status, 201);
    const created = (await createResponse.json()) as { data: { id: string } };

    const invalidCascade = await fetch(`${baseUrl}/suppliers/${created.data.id}?cascade=true`, {
      method: 'DELETE',
      headers: testHeaders('manager', 'en-US'),
      body: JSON.stringify({ confirmation: 'Eliminar todo' })
    });

    assert.equal(invalidCascade.status, 400);

    const validCascade = await fetch(`${baseUrl}/suppliers/${created.data.id}?cascade=true`, {
      method: 'DELETE',
      headers: testHeaders('manager', 'en-US'),
      body: JSON.stringify({ confirmation: 'Delete all' })
    });

    assert.equal(validCascade.status, 200);

    const getResponse = await fetch(`${baseUrl}/suppliers/${created.data.id}`, {
      headers: testHeaders('manager', 'en-US')
    });

    assert.equal(getResponse.status, 404);
  } finally {
    await stopServer(server);
  }
});

test('token mode allows manager supplier cascade delete with valid confirmation', async () => {
  const { server, baseUrl } = await startServer('token');

  try {
    const { accessToken } = await issueIntegrationTokenPair(baseUrl, 'manager');
    const tokenHeaders = {
      ...bearerHeaders(accessToken),
      'content-type': 'application/json'
    };

    const createResponse = await fetch(`${baseUrl}/suppliers`, {
      method: 'POST',
      headers: tokenHeaders,
      body: JSON.stringify({
        name: 'Supplier Token Cascade',
        type: 'hotel',
        status: 'active',
        defaultCurrency: 'MXN',
        commissionType: 'percentage',
        commissionRate: 11,
        payoutTerms: 'upon_booking',
        internalRiskFlag: 'reliable'
      })
    });

    assert.equal(createResponse.status, 201);
    const created = (await createResponse.json()) as { data: { id: string } };

    const cascadeResponse = await fetch(`${baseUrl}/suppliers/${created.data.id}?cascade=true`, {
      method: 'DELETE',
      headers: tokenHeaders,
      body: JSON.stringify({ confirmation: 'Eliminar todo' })
    });

    assert.equal(cascadeResponse.status, 200);

    const getResponse = await fetch(`${baseUrl}/suppliers/${created.data.id}`, {
      headers: bearerHeaders(accessToken)
    });

    assert.equal(getResponse.status, 404);
  } finally {
    await stopServer(server);
  }
});
