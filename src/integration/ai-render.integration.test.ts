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
