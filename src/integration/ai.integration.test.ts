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
import { InMemoryDashboardRepository } from '../modules/dashboard/infrastructure/in-memory-dashboard-repository';
import { InMemoryManagementRepository } from '../modules/management/infrastructure/in-memory-management-repository';

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
    itineraries: new InMemoryItineraryRepository(),
    dashboard: new InMemoryDashboardRepository(),
    management: new InMemoryManagementRepository()
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

test('agent can generate AI proposal mock', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const response = await fetch(`${baseUrl}/ai/proposal`, {
      method: 'POST',
      headers: testHeaders('agent'),
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
    await stopServer(server);
  }
});

test('ai proposal returns quality warnings for weak summaries', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const response = await fetch(`${baseUrl}/ai/proposal`, {
      method: 'POST',
      headers: testHeaders('agent'),
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
    await stopServer(server);
  }
});

test('external_dmc cannot generate AI proposal mock', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const response = await fetch(`${baseUrl}/ai/proposal`, {
      method: 'POST',
      headers: testHeaders('external_dmc'),
      body: JSON.stringify({
        promptProfile: 'storyteller',
        itinerarySummary: 'Plan base',
        destination: 'Oaxaca',
        days: 3
      })
    });

    assert.equal(response.status, 403);
  } finally {
    await stopServer(server);
  }
});
