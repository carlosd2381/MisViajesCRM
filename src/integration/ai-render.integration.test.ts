import test from 'node:test';
import assert from 'node:assert/strict';
import {
  integrationTestHeaders,
  startIntegrationServer,
  stopIntegrationServer
} from './test-harness';

test('agent can render AI proposal as web preview html', async () => {
  const { server, baseUrl } = await startIntegrationServer();

  try {
    const response = await fetch(`${baseUrl}/ai/proposal/render/web`, {
      method: 'POST',
      headers: integrationTestHeaders('agent'),
      body: JSON.stringify({
        promptProfile: 'ghost_writer',
        itinerarySummary: 'Viaje de cuatro días en Oaxaca con enfoque gastronómico y cultural.',
        destination: 'Oaxaca',
        days: 4
      })
    });

    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type') ?? '', /text\/html/);
    const html = await response.text();
    assert.match(html, /<!doctype html>/i);
    assert.match(html, /ai-proposal\.v1/i);
    assert.match(html, /Oaxaca/);
  } finally {
    await stopIntegrationServer(server);
  }
});

test('agent can render AI proposal as PDF draft', async () => {
  const { server, baseUrl } = await startIntegrationServer();

  try {
    const response = await fetch(`${baseUrl}/ai/proposal/render/pdf`, {
      method: 'POST',
      headers: integrationTestHeaders('agent'),
      body: JSON.stringify({
        promptProfile: 'storyteller',
        itinerarySummary: 'Día 1 llegada a Oaxaca, día 2 experiencias locales y cierre cultural.',
        destination: 'Oaxaca',
        days: 3
      })
    });

    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type') ?? '', /application\/pdf/);
    const bytes = Buffer.from(await response.arrayBuffer());
    assert.equal(bytes.subarray(0, 8).toString('utf8'), '%PDF-1.4');
    assert.ok(bytes.length > 200);
  } finally {
    await stopIntegrationServer(server);
  }
});

test('agent can read AI render schema metadata', async () => {
  const { server, baseUrl } = await startIntegrationServer();

  try {
    const response = await fetch(`${baseUrl}/ai/proposal/render/schema`, {
      method: 'GET',
      headers: integrationTestHeaders('agent')
    });

    assert.equal(response.status, 200);
    const payload = (await response.json()) as {
      data: {
        schemaVersion: string;
        sourceSchemaVersion: string;
        endpoints: {
          web: { path: string; method: string; contentType: string };
          pdf: { path: string; method: string; contentType: string };
        };
      };
      message: string;
    };

    assert.equal(payload.data.schemaVersion, 'ai-proposal-render.v1');
    assert.equal(payload.data.sourceSchemaVersion, 'ai-proposal.v1');
    assert.equal(payload.data.endpoints.web.path, '/ai/proposal/render/web');
    assert.equal(payload.data.endpoints.pdf.path, '/ai/proposal/render/pdf');
    assert.equal(payload.data.endpoints.web.contentType, 'text/html; charset=utf-8');
    assert.equal(payload.data.endpoints.pdf.contentType, 'application/pdf');
    assert.equal(payload.message, 'Esquema de render AI disponible');
  } finally {
    await stopIntegrationServer(server);
  }
});

test('ai render schema metadata supports locale and method guard', async () => {
  const { server, baseUrl } = await startIntegrationServer();

  try {
    const enResponse = await fetch(`${baseUrl}/ai/proposal/render/schema?locale=en-US`, {
      method: 'GET',
      headers: integrationTestHeaders('agent', 'en-US')
    });

    assert.equal(enResponse.status, 200);
    const enPayload = (await enResponse.json()) as {
      data: { endpoints: { web: { description: string }; pdf: { description: string } } };
      message: string;
    };

    assert.match(enPayload.data.endpoints.web.description, /HTML preview/);
    assert.match(enPayload.data.endpoints.pdf.description, /PDF draft/);
    assert.equal(enPayload.message, 'AI render schema available');

    const postResponse = await fetch(`${baseUrl}/ai/proposal/render/schema`, {
      method: 'POST',
      headers: integrationTestHeaders('agent', 'es-MX'),
      body: JSON.stringify({})
    });

    assert.equal(postResponse.status, 405);
  } finally {
    await stopIntegrationServer(server);
  }
});
