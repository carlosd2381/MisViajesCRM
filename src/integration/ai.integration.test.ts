import test from 'node:test';
import assert from 'node:assert/strict';
import {
  integrationTestHeaders,
  startIntegrationServer,
  stopIntegrationServer
} from './test-harness';

test('agent can generate AI proposal mock', async () => {
  const { server, baseUrl } = await startIntegrationServer();

  try {
    const response = await fetch(`${baseUrl}/ai/proposal`, {
      method: 'POST',
      headers: integrationTestHeaders('agent'),
      body: JSON.stringify({
        promptProfile: 'storyteller',
        itinerarySummary: 'Llegada, recorrido gastronómico y cierre cultural.',
        destination: 'Oaxaca',
        days: 4
      })
    });

    assert.equal(response.status, 200);
    const payload = (await response.json()) as {
      data: {
        schemaVersion: string;
        generatedAt: string;
        profile: string;
        narrative: string;
        warnings: Array<{ code: string; severity: string; message: string }>;
        sectionOrder: string[];
        sections: {
          storyteller: { tripHook: string; dayNarrative: string };
          auditor: { operationalChecklist: string[]; riskNotes: string[] };
          ghost_writer: { headline: string; callToAction: string };
          local_insider: { localTips: string[]; signatureExperience: string };
        };
      };
    };
    assert.equal(payload.data.schemaVersion, 'ai-proposal.v1');
    assert.equal(typeof payload.data.generatedAt, 'string');
    assert.equal(payload.data.profile, 'storyteller');
    assert.match(payload.data.narrative, /Oaxaca/);
    assert.ok(Array.isArray(payload.data.warnings));
    assert.deepEqual(payload.data.sectionOrder, ['storyteller', 'auditor', 'ghost_writer', 'local_insider']);
    assert.equal(typeof payload.data.sections.storyteller.tripHook, 'string');
    assert.ok(Array.isArray(payload.data.sections.auditor.operationalChecklist));
  } finally {
    await stopIntegrationServer(server);
  }
});

test('ai proposal returns quality warnings for weak summaries', async () => {
  const { server, baseUrl } = await startIntegrationServer();

  try {
    const response = await fetch(`${baseUrl}/ai/proposal`, {
      method: 'POST',
      headers: integrationTestHeaders('agent'),
      body: JSON.stringify({
        promptProfile: 'auditor',
        itinerarySummary: 'Plan breve con actividades.',
        destination: 'Oaxaca',
        days: 8
      })
    });

    assert.equal(response.status, 200);
    const payload = (await response.json()) as {
      data: { warnings: Array<{ code: string; severity: string; message: string }> };
    };

    assert.ok(payload.data.warnings.some((warning) => warning.code === 'SUMMARY_TOO_SHORT'));
    assert.ok(payload.data.warnings.some((warning) => warning.code === 'DESTINATION_NOT_REFERENCED'));
    assert.ok(payload.data.warnings.some((warning) => warning.code === 'DAY_BY_DAY_MISSING'));
  } finally {
    await stopIntegrationServer(server);
  }
});

test('external_dmc cannot generate AI proposal mock', async () => {
  const { server, baseUrl } = await startIntegrationServer();

  try {
    const response = await fetch(`${baseUrl}/ai/proposal`, {
      method: 'POST',
      headers: integrationTestHeaders('external_dmc'),
      body: JSON.stringify({
        promptProfile: 'storyteller',
        itinerarySummary: 'Plan base',
        destination: 'Oaxaca',
        days: 3
      })
    });

    assert.equal(response.status, 403);
  } finally {
    await stopIntegrationServer(server);
  }
});

test('ai proposal strict quality gate returns 422 when high severity warnings exist', async () => {
  const { server, baseUrl } = await startIntegrationServer();

  try {
    const response = await fetch(`${baseUrl}/ai/proposal`, {
      method: 'POST',
      headers: integrationTestHeaders('agent'),
      body: JSON.stringify({
        promptProfile: 'auditor',
        itinerarySummary: 'Plan breve',
        destination: 'Oaxaca',
        days: 12,
        enforceQualityGate: true
      })
    });

    assert.equal(response.status, 422);
    const payload = (await response.json()) as {
      data: { warnings: Array<{ code: string; severity: string }> };
    };

    assert.ok(payload.data.warnings.some((warning) => warning.code === 'QUALITY_GATE_BLOCKER'));
  } finally {
    await stopIntegrationServer(server);
  }
});

test('agent can read AI proposal schema metadata', async () => {
  const { server, baseUrl } = await startIntegrationServer();

  try {
    const response = await fetch(`${baseUrl}/ai/schema/proposal`, {
      method: 'GET',
      headers: integrationTestHeaders('agent')
    });

    assert.equal(response.status, 200);
    const payload = (await response.json()) as {
      data: {
        schemaVersion: string;
        requiredFields: string[];
        warningsCatalog: Array<{ code: string; severity: string }>;
        qualityGate: { blockedStatusCode: number };
        examples: {
          request: { promptProfile: string };
          successResponse: { statusCode: number };
          blockedResponse: { statusCode: number; body: { blockingWarningCode: string } };
        };
      };
    };

    assert.equal(payload.data.schemaVersion, 'ai-proposal.v1');
    assert.ok(payload.data.requiredFields.includes('promptProfile'));
    assert.ok(payload.data.warningsCatalog.some((warning) => warning.code === 'QUALITY_GATE_BLOCKER'));
    assert.equal(payload.data.qualityGate.blockedStatusCode, 422);
    assert.equal(payload.data.examples.request.promptProfile, 'storyteller');
    assert.equal(payload.data.examples.successResponse.statusCode, 200);
    assert.equal(payload.data.examples.blockedResponse.statusCode, 422);
    assert.equal(payload.data.examples.blockedResponse.body.blockingWarningCode, 'QUALITY_GATE_BLOCKER');
  } finally {
    await stopIntegrationServer(server);
  }
});

test('external_dmc can read AI schema but cannot post proposal', async () => {
  const { server, baseUrl } = await startIntegrationServer();

  try {
    const schemaResponse = await fetch(`${baseUrl}/ai/schema/proposal`, {
      method: 'GET',
      headers: integrationTestHeaders('external_dmc')
    });
    assert.equal(schemaResponse.status, 200);

    const proposalResponse = await fetch(`${baseUrl}/ai/proposal`, {
      method: 'POST',
      headers: integrationTestHeaders('external_dmc'),
      body: JSON.stringify({
        promptProfile: 'storyteller',
        itinerarySummary: 'Plan base',
        destination: 'Oaxaca',
        days: 3
      })
    });

    assert.equal(proposalResponse.status, 403);
  } finally {
    await stopIntegrationServer(server);
  }
});

test('ai schema endpoint supports locale query for description localization', async () => {
  const { server, baseUrl } = await startIntegrationServer();

  try {
    const enResponse = await fetch(`${baseUrl}/ai/schema/proposal?locale=en-US`, {
      method: 'GET',
      headers: integrationTestHeaders('agent')
    });

    assert.equal(enResponse.status, 200);
    const enPayload = (await enResponse.json()) as {
      data: {
        warningsCatalog: Array<{ code: string; description: string }>;
        examples: { blockedResponse: { body: { message: string } } };
      };
    };

    const enSummary = enPayload.data.warningsCatalog.find((warning) => warning.code === 'SUMMARY_TOO_SHORT');
    assert.ok((enSummary?.description ?? '').toLowerCase().includes('summary'));
    assert.equal(enPayload.data.examples.blockedResponse.body.message, 'Proposal blocked by quality gate');

    const esResponse = await fetch(`${baseUrl}/ai/schema/proposal?locale=es-MX`, {
      method: 'GET',
      headers: integrationTestHeaders('agent')
    });

    assert.equal(esResponse.status, 200);
    const esPayload = (await esResponse.json()) as {
      data: {
        warningsCatalog: Array<{ code: string; description: string }>;
        examples: { blockedResponse: { body: { message: string } } };
      };
    };

    const esSummary = esPayload.data.warningsCatalog.find((warning) => warning.code === 'SUMMARY_TOO_SHORT');
    assert.ok((esSummary?.description ?? '').toLowerCase().includes('resumen'));
    assert.equal(esPayload.data.examples.blockedResponse.body.message, 'Propuesta bloqueada por quality gate');
  } finally {
    await stopIntegrationServer(server);
  }
});

test('agent can read AI metrics after proposal requests', async () => {
  const { server, baseUrl } = await startIntegrationServer();

  try {
    const proposalResponse = await fetch(`${baseUrl}/ai/proposal`, {
      method: 'POST',
      headers: integrationTestHeaders('agent'),
      body: JSON.stringify({
        promptProfile: 'storyteller',
        itinerarySummary: 'Llegada y actividades culturales con narrativa diaria.',
        destination: 'Mérida',
        days: 4
      })
    });

    assert.equal(proposalResponse.status, 200);

    const metricsResponse = await fetch(`${baseUrl}/ai/metrics`, {
      method: 'GET',
      headers: integrationTestHeaders('agent')
    });

    assert.equal(metricsResponse.status, 200);
    const payload = (await metricsResponse.json()) as {
      data: {
        provider: string;
        configuration: {
          mode: 'mock' | 'provider';
          provider: string;
          fallbackProvider: string | null;
        };
        totals: { requests: number; totalEstimatedTokens: number; totalEstimatedCostUsd: number };
        byOperation: { proposal: { count: number; avgDurationMs: number } };
      };
      message: string;
    };

    assert.equal(payload.message, 'Métricas AI disponibles');
    assert.equal(payload.data.provider, 'mock');
    assert.equal(payload.data.configuration.mode, 'mock');
    assert.equal(payload.data.configuration.provider, 'mock');
    assert.equal(payload.data.configuration.fallbackProvider, null);
    assert.ok(payload.data.totals.requests >= 1);
    assert.ok(payload.data.byOperation.proposal.count >= 1);
    assert.ok(payload.data.byOperation.proposal.avgDurationMs >= 0);
    assert.ok(payload.data.totals.totalEstimatedTokens >= 0);
    assert.ok(payload.data.totals.totalEstimatedCostUsd >= 0);
  } finally {
    await stopIntegrationServer(server);
  }
});
