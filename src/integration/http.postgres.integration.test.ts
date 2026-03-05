import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createApiServer } from '../app';
import { closePgPool, pgQuery } from '../core/db/pg-client';
import { integrationTestHeaders } from './test-harness';

const REQUIRED_POSTGRES_ENV = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'] as const;
const ACTOR_USER_ID = '7f8f3d10-49ab-4b5b-8dc8-94fdcf124501';

function hasRequiredPostgresEnv(): boolean {
  return REQUIRED_POSTGRES_ENV.every((name) => Boolean(process.env[name]));
}

async function isAuditSchemaReady(): Promise<boolean> {
  const result = await pgQuery<{ audit_table: string | null; leads_table: string | null; clients_table: string | null }>(
    `
      select
        to_regclass('public.audit_events')::text as audit_table,
        to_regclass('public.leads')::text as leads_table,
        to_regclass('public.clients')::text as clients_table
    `
  );

  const row = result.rows[0];
  return row.audit_table === 'audit_events' && row.leads_table === 'leads' && row.clients_table === 'clients';
}

async function isCfdiSchemaReady(): Promise<boolean> {
  const result = await pgQuery<{ cfdi_invoice_events: string | null }>(
    `
      select
        to_regclass('public.cfdi_invoice_events')::text as cfdi_invoice_events
    `
  );

  const row = result.rows[0];
  return row.cfdi_invoice_events === 'cfdi_invoice_events';
}

function setEnv(key: string, value: string): () => void {
  const previous = process.env[key];
  process.env[key] = value;

  return () => {
    if (previous === undefined) {
      delete process.env[key];
      return;
    }

    process.env[key] = previous;
  };
}

function startPostgresServer(): Promise<{ server: Server; baseUrl: string }> {
  const server = createApiServer(undefined, { authMode: 'header' });

  return new Promise((resolve) => {
    server.listen(0, () => {
      const address = server.address() as AddressInfo;
      resolve({ server, baseUrl: `http://127.0.0.1:${address.port}` });
    });
  });
}

async function stopServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

async function cleanupLeadArtifacts(leadId: string): Promise<void> {
  await pgQuery(
    "delete from audit_events where resource = $1 and action in ($2, $3, $4) and coalesce(after_json->>'id', after_json->'lead'->>'id') = $5",
    ['leads', 'lead.create', 'lead.update', 'lead.convert', leadId]
  );
  await pgQuery('delete from clients where lead_id = $1', [leadId]);
  await pgQuery('delete from leads where id = $1', [leadId]);
}

async function cleanupCfdiValidationArtifacts(invoiceId: string): Promise<void> {
  await pgQuery('delete from cfdi_invoice_events where cfdi_invoice_id = $1', [invoiceId]);
}

test('lead create and update persist audit events in postgres mode', async (t: TestContext) => {
  if (!hasRequiredPostgresEnv()) {
    t.skip('Postgres env vars are not configured');
    return;
  }

  const restoreStorageMode = setEnv('STORAGE_MODE', 'postgres');

  let createdLeadId: string | null = null;
  let server: Server | null = null;

  try {
    if (!(await isAuditSchemaReady())) {
      t.skip('Postgres schema is not initialized (audit_events/leads/clients missing)');
      return;
    }

    const started = await startPostgresServer();
    server = started.server;

    const createLeadResponse = await fetch(`${started.baseUrl}/leads`, {
      method: 'POST',
      headers: integrationTestHeaders('agent', 'es-MX', ACTOR_USER_ID),
      body: JSON.stringify({
        status: 'new',
        source: 'referral',
        priority: 'medium',
        destination: 'Lisboa',
        adultsCount: 2,
        childrenCount: 1
      })
    });

    assert.equal(createLeadResponse.status, 201);
    const createdLead = (await createLeadResponse.json()) as { data: { id: string } };
    createdLeadId = createdLead.data.id;

    const updateLeadResponse = await fetch(`${started.baseUrl}/leads/${createdLeadId}`, {
      method: 'PATCH',
      headers: integrationTestHeaders('agent', 'es-MX', ACTOR_USER_ID),
      body: JSON.stringify({
        destination: 'Oporto',
        adultsCount: 3
      })
    });

    assert.equal(updateLeadResponse.status, 200);

    const createAuditResult = await pgQuery<{
      actor_user_id: string | null;
      lead_id: string | null;
      before_id: string | null;
      destination: string | null;
    }>(
      `
        select
          actor_user_id::text,
          after_json->>'id' as lead_id,
          before_json->>'id' as before_id,
          after_json->>'destination' as destination
        from audit_events
        where action = 'lead.create'
          and resource = 'leads'
          and after_json->>'id' = $1
        order by event_at desc
        limit 1
      `,
      [createdLeadId]
    );

    assert.equal(createAuditResult.rowCount, 1);
    assert.equal(createAuditResult.rows[0].actor_user_id, ACTOR_USER_ID);
    assert.equal(createAuditResult.rows[0].lead_id, createdLeadId);
    assert.equal(createAuditResult.rows[0].before_id, null);
    assert.equal(createAuditResult.rows[0].destination, 'Lisboa');

    const updateAuditResult = await pgQuery<{
      actor_user_id: string | null;
      lead_id: string | null;
      before_destination: string | null;
      after_destination: string | null;
      before_adults: string | null;
      after_adults: string | null;
    }>(
      `
        select
          actor_user_id::text,
          after_json->>'id' as lead_id,
          before_json->>'destination' as before_destination,
          after_json->>'destination' as after_destination,
          before_json->>'adultsCount' as before_adults,
          after_json->>'adultsCount' as after_adults
        from audit_events
        where action = 'lead.update'
          and resource = 'leads'
          and after_json->>'id' = $1
        order by event_at desc
        limit 1
      `,
      [createdLeadId]
    );

    assert.equal(updateAuditResult.rowCount, 1);
    assert.equal(updateAuditResult.rows[0].actor_user_id, ACTOR_USER_ID);
    assert.equal(updateAuditResult.rows[0].lead_id, createdLeadId);
    assert.equal(updateAuditResult.rows[0].before_destination, 'Lisboa');
    assert.equal(updateAuditResult.rows[0].after_destination, 'Oporto');
    assert.equal(updateAuditResult.rows[0].before_adults, '2');
    assert.equal(updateAuditResult.rows[0].after_adults, '3');
  } finally {
    if (server) {
      await stopServer(server);
    }

    if (createdLeadId) {
      await cleanupLeadArtifacts(createdLeadId);
    }

    await closePgPool();
    restoreStorageMode();
  }
});

test('lead convert persists audit event in postgres mode', async (t: TestContext) => {
  if (!hasRequiredPostgresEnv()) {
    t.skip('Postgres env vars are not configured');
    return;
  }

  const restoreStorageMode = setEnv('STORAGE_MODE', 'postgres');

  let createdLeadId: string | null = null;
  let server: Server | null = null;

  try {
    if (!(await isAuditSchemaReady())) {
      t.skip('Postgres schema is not initialized (audit_events/leads/clients missing)');
      return;
    }

    const started = await startPostgresServer();
    server = started.server;

    const createLeadResponse = await fetch(`${started.baseUrl}/leads`, {
      method: 'POST',
      headers: integrationTestHeaders('agent', 'es-MX', ACTOR_USER_ID),
      body: JSON.stringify({
        status: 'new',
        source: 'website',
        priority: 'high',
        destination: 'Cartagena',
        adultsCount: 2,
        childrenCount: 0
      })
    });

    assert.equal(createLeadResponse.status, 201);
    const createdLead = (await createLeadResponse.json()) as { data: { id: string } };
    createdLeadId = createdLead.data.id;

    const convertResponse = await fetch(`${started.baseUrl}/leads/${createdLeadId}/convert`, {
      method: 'POST',
      headers: integrationTestHeaders('agent', 'es-MX', ACTOR_USER_ID),
      body: JSON.stringify({
        firstName: 'Postgres',
        paternalLastName: 'Audit',
        contacts: [{ type: 'email', value: 'postgres.audit@example.com' }]
      })
    });

    assert.equal(convertResponse.status, 201);

    const auditResult = await pgQuery<{
      actor_user_id: string | null;
      lead_id: string | null;
      client_lead_id: string | null;
    }>(
      `
        select
          actor_user_id::text,
          after_json->'lead'->>'id' as lead_id,
          after_json->'client'->>'leadId' as client_lead_id
        from audit_events
        where action = 'lead.convert'
          and resource = 'leads'
          and after_json->'lead'->>'id' = $1
        order by event_at desc
        limit 1
      `,
      [createdLeadId]
    );

    assert.equal(auditResult.rowCount, 1);
    const auditRow = auditResult.rows[0];
    assert.equal(auditRow.actor_user_id, ACTOR_USER_ID);
    assert.equal(auditRow.lead_id, createdLeadId);
    assert.equal(auditRow.client_lead_id, createdLeadId);
  } finally {
    if (server) {
      await stopServer(server);
    }

    if (createdLeadId) {
      await cleanupLeadArtifacts(createdLeadId);
    }

    await closePgPool();
    restoreStorageMode();
  }
});

test('cfdi validation endpoints persist events in postgres mode', async (t: TestContext) => {
  if (!hasRequiredPostgresEnv()) {
    t.skip('Postgres env vars are not configured');
    return;
  }

  const restoreStorageMode = setEnv('STORAGE_MODE', 'postgres');

  const stampInvoiceId = 'inv_cfdi_stamp_pg_001';
  const cancelInvoiceId = 'inv_cfdi_cancel_pg_001';
  let server: Server | null = null;

  try {
    if (!(await isCfdiSchemaReady())) {
      t.skip('Postgres schema is not initialized (cfdi_invoice_events missing)');
      return;
    }

    await cleanupCfdiValidationArtifacts(stampInvoiceId);
    await cleanupCfdiValidationArtifacts(cancelInvoiceId);

    const started = await startPostgresServer();
    server = started.server;

    const stampResponse = await fetch(`${started.baseUrl}/management/cfdi/stamp/validate`, {
      method: 'POST',
      headers: integrationTestHeaders('owner', 'es-MX', ACTOR_USER_ID),
      body: JSON.stringify({
        invoiceId: stampInvoiceId,
        satCertificateId: 'cert_pg_001',
        rfcEmisor: 'AAA010101AAA',
        rfcReceptor: 'BBB010101BBB',
        currency: 'MXN',
        total: 8900,
        issueDate: '2026-03-05T10:00:00.000Z'
      })
    });

    assert.equal(stampResponse.status, 200);

    const stampEventResult = await pgQuery<{
      event_type: string;
      operation: string | null;
      valid: string | null;
    }>(
      `
        select
          event_type,
          detail_json->>'operation' as operation,
          detail_json->>'valid' as valid
        from cfdi_invoice_events
        where cfdi_invoice_id = $1
        order by event_at desc
        limit 1
      `,
      [stampInvoiceId]
    );

    assert.equal(stampEventResult.rowCount, 1);
    assert.equal(stampEventResult.rows[0].event_type, 'validation_passed');
    assert.equal(stampEventResult.rows[0].operation, 'stamp');
    assert.equal(stampEventResult.rows[0].valid, 'true');

    const cancelInvalidResponse = await fetch(`${started.baseUrl}/management/cfdi/cancel/validate`, {
      method: 'POST',
      headers: integrationTestHeaders('owner', 'es-MX', ACTOR_USER_ID),
      body: JSON.stringify({
        invoiceId: cancelInvoiceId,
        cfdiUuid: 'd2719f53-0dca-4eeb-b6bb-9bcd2ccf61fc',
        cancellationReason: '01',
        cancelledAt: '2026-03-05T11:00:00.000Z'
      })
    });

    assert.equal(cancelInvalidResponse.status, 400);

    const cancelEventResult = await pgQuery<{
      event_type: string;
      operation: string | null;
      valid: string | null;
    }>(
      `
        select
          event_type,
          detail_json->>'operation' as operation,
          detail_json->>'valid' as valid
        from cfdi_invoice_events
        where cfdi_invoice_id = $1
        order by event_at desc
        limit 1
      `,
      [cancelInvoiceId]
    );

    assert.equal(cancelEventResult.rowCount, 1);
    assert.equal(cancelEventResult.rows[0].event_type, 'validation_failed');
    assert.equal(cancelEventResult.rows[0].operation, 'cancel');
    assert.equal(cancelEventResult.rows[0].valid, 'false');

    const eventsEndpointResponse = await fetch(
      `${started.baseUrl}/management/cfdi/events?invoiceId=${stampInvoiceId}&limit=5`,
      {
        method: 'GET',
        headers: integrationTestHeaders('owner', 'es-MX', ACTOR_USER_ID)
      }
    );

    assert.equal(eventsEndpointResponse.status, 200);
    const eventsPayload = (await eventsEndpointResponse.json()) as {
      message: string;
      data: {
        storageMode: string;
        invoiceId: string;
        count: number;
        events: Array<{ eventType: string }>;
      };
    };

    assert.equal(eventsPayload.message, 'Eventos CFDI consultados');
    assert.equal(eventsPayload.data.storageMode, 'postgres');
    assert.equal(eventsPayload.data.invoiceId, stampInvoiceId);
    assert.ok(eventsPayload.data.count >= 1);
    assert.equal(eventsPayload.data.events[0]?.eventType, 'validation_passed');
  } finally {
    if (server) {
      await stopServer(server);
    }

    await cleanupCfdiValidationArtifacts(stampInvoiceId);
    await cleanupCfdiValidationArtifacts(cancelInvoiceId);
    await closePgPool();
    restoreStorageMode();
  }
});
