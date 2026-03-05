import test from 'node:test';
import assert from 'node:assert/strict';
import { integrationTestHeaders, startIntegrationServer, stopIntegrationServer } from './test-harness';

function testHeaders(role = 'agent', locale = 'es-MX'): Record<string, string> {
  return integrationTestHeaders(role, locale);
}

const startServer = startIntegrationServer;
const stopServer = stopIntegrationServer;

test('lead convert requires authentication', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const createLeadResponse = await fetch(`${baseUrl}/leads`, {
      method: 'POST',
      headers: testHeaders(),
      body: JSON.stringify({
        status: 'new',
        source: 'website',
        priority: 'high',
        destination: 'Lima',
        adultsCount: 2,
        childrenCount: 0
      })
    });

    assert.equal(createLeadResponse.status, 201);
    const createdLead = (await createLeadResponse.json()) as { data: { id: string } };

    const unauthConvertResponse = await fetch(`${baseUrl}/leads/${createdLead.data.id}/convert`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-locale': 'es-MX' },
      body: JSON.stringify({
        firstName: 'SinAuth',
        paternalLastName: 'Cliente'
      })
    });

    assert.equal(unauthConvertResponse.status, 401);
    const unauthPayload = (await unauthConvertResponse.json()) as { message: string };
    assert.equal(unauthPayload.message, 'No autenticado');
  } finally {
    await stopServer(server);
  }
});

test('lead convert requires authentication and localizes message for en-US', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const createLeadResponse = await fetch(`${baseUrl}/leads`, {
      method: 'POST',
      headers: testHeaders(),
      body: JSON.stringify({
        status: 'new',
        source: 'website',
        priority: 'high',
        destination: 'Boston',
        adultsCount: 2,
        childrenCount: 0
      })
    });

    assert.equal(createLeadResponse.status, 201);
    const createdLead = (await createLeadResponse.json()) as { data: { id: string } };

    const unauthConvertResponse = await fetch(`${baseUrl}/leads/${createdLead.data.id}/convert`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-locale': 'en-US' },
      body: JSON.stringify({
        firstName: 'NoAuth',
        paternalLastName: 'Client'
      })
    });

    assert.equal(unauthConvertResponse.status, 401);
    const unauthPayload = (await unauthConvertResponse.json()) as { message: string };
    assert.equal(unauthPayload.message, 'Unauthenticated');
  } finally {
    await stopServer(server);
  }
});

test('accountant cannot convert lead to client', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const createLeadResponse = await fetch(`${baseUrl}/leads`, {
      method: 'POST',
      headers: testHeaders(),
      body: JSON.stringify({
        status: 'new',
        source: 'referral',
        priority: 'high',
        destination: 'Cusco',
        adultsCount: 2,
        childrenCount: 0
      })
    });

    assert.equal(createLeadResponse.status, 201);
    const createdLead = (await createLeadResponse.json()) as { data: { id: string } };

    const forbiddenConvertResponse = await fetch(`${baseUrl}/leads/${createdLead.data.id}/convert`, {
      method: 'POST',
      headers: testHeaders('accountant'),
      body: JSON.stringify({
        firstName: 'NoPermitido',
        paternalLastName: 'Contador'
      })
    });

    assert.equal(forbiddenConvertResponse.status, 403);
    const forbiddenPayload = (await forbiddenConvertResponse.json()) as { message: string };
    assert.equal(forbiddenPayload.message, 'Acceso denegado');
  } finally {
    await stopServer(server);
  }
});

test('accountant cannot convert lead to client and localizes message for en-US', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const createLeadResponse = await fetch(`${baseUrl}/leads`, {
      method: 'POST',
      headers: testHeaders(),
      body: JSON.stringify({
        status: 'new',
        source: 'referral',
        priority: 'high',
        destination: 'Denver',
        adultsCount: 2,
        childrenCount: 0
      })
    });

    assert.equal(createLeadResponse.status, 201);
    const createdLead = (await createLeadResponse.json()) as { data: { id: string } };

    const forbiddenConvertResponse = await fetch(`${baseUrl}/leads/${createdLead.data.id}/convert`, {
      method: 'POST',
      headers: testHeaders('accountant', 'en-US'),
      body: JSON.stringify({
        firstName: 'NotAllowed',
        paternalLastName: 'Accountant'
      })
    });

    assert.equal(forbiddenConvertResponse.status, 403);
    const forbiddenPayload = (await forbiddenConvertResponse.json()) as { message: string };
    assert.equal(forbiddenPayload.message, 'Access denied');
  } finally {
    await stopServer(server);
  }
});
