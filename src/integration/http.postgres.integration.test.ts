import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createApiServer } from '../app';
import { closePgPool, pgQuery } from '../core/db/pg-client';
import { integrationTestHeaders } from './test-harness';

const REQUIRED_POSTGRES_ENV = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'] as const;
const ACTOR_USER_ID = '7f8f3d10-49ab-4b5b-8dc8-94fdcf124501';
const ACTOR_USER_EMAIL = 'postgres.audit.actor@misviajes.local';

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
  const result = await pgQuery<{ cfdi_invoice_events: string | null; cfdi_invoices: string | null }>(
    `
      select
        to_regclass('public.cfdi_invoice_events')::text as cfdi_invoice_events,
        to_regclass('public.cfdi_invoices')::text as cfdi_invoices
    `
  );

  const row = result.rows[0];
  return row.cfdi_invoice_events === 'cfdi_invoice_events' && row.cfdi_invoices === 'cfdi_invoices';
}

async function isCfdiSatSchemaReady(): Promise<boolean> {
  const result = await pgQuery<{ sat_certificates: string | null }>(
    `
      select
        to_regclass('public.sat_certificates')::text as sat_certificates
    `
  );

  const row = result.rows[0];
  return row.sat_certificates === 'sat_certificates';
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

async function ensureAuditActorUser(): Promise<void> {
  await pgQuery(
    `
      insert into users (id, full_name, email, role_id, is_active)
      values (
        $1,
        $2,
        $3,
        (select id from roles where code = 'agent' limit 1),
        true
      )
      on conflict (id) do update set
        full_name = excluded.full_name,
        email = excluded.email,
        role_id = excluded.role_id,
        is_active = excluded.is_active,
        updated_at = now()
    `,
    [ACTOR_USER_ID, 'Postgres Audit Actor', ACTOR_USER_EMAIL]
  );
}

async function cleanupCfdiValidationArtifacts(invoiceId: string): Promise<void> {
  await pgQuery('delete from cfdi_invoice_events where cfdi_invoice_id = $1', [invoiceId]);
  await pgQuery('delete from cfdi_invoices where id = $1', [invoiceId]);
}

async function cleanupSatCertificateArtifacts(certificateId: string): Promise<void> {
  await pgQuery('delete from sat_certificates where id = $1', [certificateId]);
}

async function seedSatCertificate(
  certificateId: string,
  options: {
    privateKeyRef?: string | null;
    passphraseRef?: string | null;
    certificatePemRef?: string | null;
  } = {}
): Promise<void> {
  const now = new Date().toISOString();
  const privateKeyRef =
    Object.prototype.hasOwnProperty.call(options, 'privateKeyRef')
      ? options.privateKeyRef
      : 'vault://sat/cert/private-key';
  const passphraseRef =
    Object.prototype.hasOwnProperty.call(options, 'passphraseRef')
      ? options.passphraseRef
      : 'vault://sat/cert/passphrase';
  const certificatePemRef =
    Object.prototype.hasOwnProperty.call(options, 'certificatePemRef')
      ? options.certificatePemRef
      : 'vault://sat/cert/pem';
  await pgQuery(
    `
      insert into sat_certificates (
        id,
        rfc_emisor,
        certificate_number,
        serial_number,
        certificate_source,
        status,
        valid_from,
        valid_to,
        certificate_pem_ref,
        private_key_ref,
        passphrase_ref,
        created_at,
        updated_at
      ) values ($1, $2, $3, null, $4, $5, $6::date, $7::date, $8, $9, $10, $11, $12)
    `,
    [
      certificateId,
      'AAA010101AAA',
      `30001000000500003416-${Date.now()}`,
      'csd',
      'active',
      '2026-01-01',
      '2027-01-01',
      certificatePemRef,
      privateKeyRef,
      passphraseRef,
      now,
      now
    ]
  );
}

async function seedCfdiInvoice(invoiceId: string): Promise<void> {
  const now = new Date().toISOString();
  await pgQuery(
    `
      insert into cfdi_invoices (
        id,
        rfc_emisor,
        rfc_receptor,
        tipo_comprobante,
        moneda,
        subtotal,
        impuestos_total,
        total,
        status,
        issue_date,
        created_at,
        updated_at
      ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `,
    [
      invoiceId,
      'AAA010101AAA',
      'BBB010101BBB',
      'I',
      'MXN',
      1000,
      160,
      1160,
      'ready_to_stamp',
      now,
      now,
      now
    ]
  );
}

async function seedStampedCfdiInvoice(invoiceId: string, cfdiUuid: string): Promise<void> {
  const now = new Date().toISOString();
  await pgQuery(
    `
      insert into cfdi_invoices (
        id,
        rfc_emisor,
        rfc_receptor,
        tipo_comprobante,
        moneda,
        subtotal,
        impuestos_total,
        total,
        status,
        issue_date,
        cfdi_uuid,
        stamped_at,
        created_at,
        updated_at
      ) values ($1, $2, $3, $4, $5, $6, $7, $8, 'stamped', $9, $10, $11, $12, $13)
    `,
    [
      invoiceId,
      'AAA010101AAA',
      'BBB010101BBB',
      'I',
      'MXN',
      2000,
      320,
      2320,
      now,
      cfdiUuid,
      now,
      now,
      now
    ]
  );
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

    await ensureAuditActorUser();

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

    await ensureAuditActorUser();

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
      `${started.baseUrl}/management/cfdi/events?invoiceId=${stampInvoiceId}&limit=5&from=2020-01-01T00:00:00.000Z&to=2100-01-01T00:00:00.000Z`,
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
    assert.deepEqual(Object.keys(eventsPayload.data.events[0] ?? {}).sort(), [
      'createdAt',
      'detail',
      'eventAt',
      'eventType',
      'id',
      'invoiceId'
    ]);
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

test('cfdi confirm endpoints apply invoice status transitions in postgres mode', async (t: TestContext) => {
  if (!hasRequiredPostgresEnv()) {
    t.skip('Postgres env vars are not configured');
    return;
  }

  const restoreStorageMode = setEnv('STORAGE_MODE', 'postgres');

  const stampInvoiceId = 'inv_cfdi_confirm_stamp_pg_001';
  const cancelInvoiceId = 'inv_cfdi_confirm_cancel_pg_001';
  const stampedCfdiUuid = 'd2719f53-0dca-4eeb-b6bb-9bcd2ccf61fc';
  const cancelledCfdiUuid = 'e4c4f3df-2393-4f9f-84a8-3f98fbe26ea1';
  let server: Server | null = null;

  try {
    if (!(await isCfdiSchemaReady())) {
      t.skip('Postgres schema is not initialized (cfdi_invoices/cfdi_invoice_events missing)');
      return;
    }

    await cleanupCfdiValidationArtifacts(stampInvoiceId);
    await cleanupCfdiValidationArtifacts(cancelInvoiceId);
    await seedCfdiInvoice(stampInvoiceId);
    await seedCfdiInvoice(cancelInvoiceId);

    const started = await startPostgresServer();
    server = started.server;

    const stampResponse = await fetch(`${started.baseUrl}/management/cfdi/stamp/confirm`, {
      method: 'POST',
      headers: integrationTestHeaders('owner', 'es-MX', ACTOR_USER_ID),
      body: JSON.stringify({
        invoiceId: stampInvoiceId,
        cfdiUuid: stampedCfdiUuid,
        stampedAt: '2026-03-05T12:00:00.000Z'
      })
    });

    assert.equal(stampResponse.status, 200);

    const stampedInvoice = await pgQuery<{
      status: string;
      cfdi_uuid: string | null;
      stamped_at: string | null;
    }>(
      `
        select status, cfdi_uuid, stamped_at
        from cfdi_invoices
        where id = $1
      `,
      [stampInvoiceId]
    );

    assert.equal(stampedInvoice.rowCount, 1);
    assert.equal(stampedInvoice.rows[0].status, 'stamped');
    assert.equal(stampedInvoice.rows[0].cfdi_uuid, stampedCfdiUuid);
    assert.ok(stampedInvoice.rows[0].stamped_at);

    const stampedEvent = await pgQuery<{ event_type: string }>(
      `
        select event_type
        from cfdi_invoice_events
        where cfdi_invoice_id = $1
        order by event_at desc
        limit 1
      `,
      [stampInvoiceId]
    );

    assert.equal(stampedEvent.rowCount, 1);
    assert.equal(stampedEvent.rows[0].event_type, 'stamped');

    const cancelResponse = await fetch(`${started.baseUrl}/management/cfdi/cancel/confirm`, {
      method: 'POST',
      headers: integrationTestHeaders('owner', 'es-MX', ACTOR_USER_ID),
      body: JSON.stringify({
        invoiceId: cancelInvoiceId,
        cfdiUuid: cancelledCfdiUuid,
        cancellationReason: '02',
        cancelledAt: '2026-03-05T13:00:00.000Z'
      })
    });

    assert.equal(cancelResponse.status, 200);

    const cancelledInvoice = await pgQuery<{
      status: string;
      cancelled_at: string | null;
    }>(
      `
        select status, cancelled_at
        from cfdi_invoices
        where id = $1
      `,
      [cancelInvoiceId]
    );

    assert.equal(cancelledInvoice.rowCount, 1);
    assert.equal(cancelledInvoice.rows[0].status, 'cancelled');
    assert.ok(cancelledInvoice.rows[0].cancelled_at);

    const cancelledEvent = await pgQuery<{ event_type: string }>(
      `
        select event_type
        from cfdi_invoice_events
        where cfdi_invoice_id = $1
        order by event_at desc
        limit 1
      `,
      [cancelInvoiceId]
    );

    assert.equal(cancelledEvent.rowCount, 1);
    assert.equal(cancelledEvent.rows[0].event_type, 'cancelled');
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

test('cfdi SAT certificate endpoints create and query records in postgres mode', async (t: TestContext) => {
  if (!hasRequiredPostgresEnv()) {
    t.skip('Postgres env vars are not configured');
    return;
  }

  const restoreStorageMode = setEnv('STORAGE_MODE', 'postgres');
  let createdCertificateId: string | null = null;
  let server: Server | null = null;

  try {
    if (!(await isCfdiSatSchemaReady())) {
      t.skip('Postgres schema is not initialized (sat_certificates missing)');
      return;
    }

    const started = await startPostgresServer();
    server = started.server;

    const createResponse = await fetch(`${started.baseUrl}/management/cfdi/certificates`, {
      method: 'POST',
      headers: integrationTestHeaders('owner', 'es-MX', ACTOR_USER_ID),
      body: JSON.stringify({
        rfcEmisor: 'AAA010101AAA',
        certificateNumber: `30001000000500003416-${Date.now()}`,
        certificateSource: 'csd',
        status: 'active',
        validFrom: '2026-01-01',
        validTo: '2027-01-01'
      })
    });

    assert.equal(createResponse.status, 201);
    const createdPayload = (await createResponse.json()) as {
      data: {
        id: string;
        rfcEmisor: string;
      };
    };

    createdCertificateId = createdPayload.data.id;
    assert.equal(createdPayload.data.rfcEmisor, 'AAA010101AAA');

    const listResponse = await fetch(
      `${started.baseUrl}/management/cfdi/certificates?rfcEmisor=AAA010101AAA&status=active&limit=10`,
      {
        method: 'GET',
        headers: integrationTestHeaders('owner', 'es-MX', ACTOR_USER_ID)
      }
    );

    assert.equal(listResponse.status, 200);
    const listPayload = (await listResponse.json()) as {
      data: {
        count: number;
        certificates: Array<{ id: string }>;
      };
    };

    assert.ok(listPayload.data.count >= 1);
    assert.ok(listPayload.data.certificates.some((certificate) => certificate.id === createdCertificateId));

    const getByIdResponse = await fetch(`${started.baseUrl}/management/cfdi/certificates/${createdCertificateId}`, {
      method: 'GET',
      headers: integrationTestHeaders('owner', 'es-MX', ACTOR_USER_ID)
    });

    assert.equal(getByIdResponse.status, 200);
    const byIdPayload = (await getByIdResponse.json()) as {
      data: {
        id: string;
        status: string;
      };
    };

    assert.equal(byIdPayload.data.id, createdCertificateId);
    assert.equal(byIdPayload.data.status, 'active');
  } finally {
    if (server) {
      await stopServer(server);
    }

    if (createdCertificateId) {
      await cleanupSatCertificateArtifacts(createdCertificateId);
    }

    await closePgPool();
    restoreStorageMode();
  }
});

test('cfdi XML validate and persist endpoints update invoice xml metadata in postgres mode', async (t: TestContext) => {
  if (!hasRequiredPostgresEnv()) {
    t.skip('Postgres env vars are not configured');
    return;
  }

  const restoreStorageMode = setEnv('STORAGE_MODE', 'postgres');
  const invoiceId = 'inv_cfdi_xml_pg_001';
  let server: Server | null = null;

  try {
    if (!(await isCfdiSchemaReady())) {
      t.skip('Postgres schema is not initialized (cfdi_invoices/cfdi_invoice_events missing)');
      return;
    }

    await cleanupCfdiValidationArtifacts(invoiceId);
    await seedCfdiInvoice(invoiceId);

    const started = await startPostgresServer();
    server = started.server;

    const xmlUnsigned = '<?xml version="1.0"?><cfdi:Comprobante></cfdi:Comprobante>';
    const validateResponse = await fetch(`${started.baseUrl}/management/cfdi/xml/validate`, {
      method: 'POST',
      headers: integrationTestHeaders('owner', 'es-MX', ACTOR_USER_ID),
      body: JSON.stringify({
        invoiceId,
        xmlType: 'unsigned',
        xmlContent: xmlUnsigned
      })
    });

    assert.equal(validateResponse.status, 200);

    const persistResponse = await fetch(`${started.baseUrl}/management/cfdi/xml/persist`, {
      method: 'POST',
      headers: integrationTestHeaders('owner', 'es-MX', ACTOR_USER_ID),
      body: JSON.stringify({
        invoiceId,
        xmlType: 'unsigned',
        xmlContent: xmlUnsigned
      })
    });

    assert.equal(persistResponse.status, 200);

    const statusResponse = await fetch(
      `${started.baseUrl}/management/cfdi/invoices/${invoiceId}?limit=5&from=2020-01-01T00:00:00.000Z&to=2100-01-01T00:00:00.000Z`,
      {
        method: 'GET',
        headers: integrationTestHeaders('owner', 'es-MX', ACTOR_USER_ID)
      }
    );

    assert.equal(statusResponse.status, 200);
    const statusPayload = (await statusResponse.json()) as {
      data: {
        events: Array<{
          id: string;
          eventType: string;
          detail: Record<string, unknown>;
          eventAt: string;
          createdAt: string;
        }>;
        invoice: {
          xml: {
            hasUnsigned: boolean;
            hasStamped: boolean;
            unsignedBytes: number;
            stampedBytes: number;
          };
        };
      };
    };

    assert.equal(statusPayload.data.invoice.xml.hasUnsigned, true);
    assert.equal(statusPayload.data.invoice.xml.hasStamped, false);
    assert.ok(statusPayload.data.invoice.xml.unsignedBytes > 0);
    assert.equal(statusPayload.data.invoice.xml.stampedBytes, 0);
    assert.ok(statusPayload.data.events.length >= 1);
    assert.deepEqual(Object.keys(statusPayload.data.events[0] ?? {}).sort(), [
      'createdAt',
      'detail',
      'eventAt',
      'eventType',
      'id'
    ]);

    const xmlEventResult = await pgQuery<{ event_type: string }>(
      `
        select event_type
        from cfdi_invoice_events
        where cfdi_invoice_id = $1
          and event_type in ('validation_passed', 'generated')
        order by event_at desc
        limit 2
      `,
      [invoiceId]
    );

    assert.ok((xmlEventResult.rowCount ?? 0) >= 2);
  } finally {
    if (server) {
      await stopServer(server);
    }

    await cleanupCfdiValidationArtifacts(invoiceId);
    await closePgPool();
    restoreStorageMode();
  }
});

test('cfdi sign endpoint persists signing fields in postgres mode', async (t: TestContext) => {
  if (!hasRequiredPostgresEnv()) {
    t.skip('Postgres env vars are not configured');
    return;
  }

  const restoreStorageMode = setEnv('STORAGE_MODE', 'postgres');
  const invoiceId = 'inv_cfdi_sign_pg_001';
  const certificateId = 'cert_cfdi_sign_pg_001';
  let server: Server | null = null;

  try {
    if (!(await isCfdiSchemaReady()) || !(await isCfdiSatSchemaReady())) {
      t.skip('Postgres schema is not initialized (cfdi_invoices/cfdi_invoice_events/sat_certificates missing)');
      return;
    }

    await cleanupCfdiValidationArtifacts(invoiceId);
    await cleanupSatCertificateArtifacts(certificateId);
    await seedCfdiInvoice(invoiceId);
    await seedSatCertificate(certificateId);

    const started = await startPostgresServer();
    server = started.server;

    const xmlUnsigned = '<?xml version="1.0"?><cfdi:Comprobante></cfdi:Comprobante>';
    const persistXmlResponse = await fetch(`${started.baseUrl}/management/cfdi/xml/persist`, {
      method: 'POST',
      headers: integrationTestHeaders('owner', 'es-MX', ACTOR_USER_ID),
      body: JSON.stringify({
        invoiceId,
        xmlType: 'unsigned',
        xmlContent: xmlUnsigned
      })
    });
    assert.equal(persistXmlResponse.status, 200);

    const signResponse = await fetch(`${started.baseUrl}/management/cfdi/sign`, {
      method: 'POST',
      headers: integrationTestHeaders('owner', 'es-MX', ACTOR_USER_ID),
      body: JSON.stringify({
        invoiceId,
        satCertificateId: certificateId,
        xmlType: 'unsigned',
        digestAlgorithm: 'sha256'
      })
    });

    assert.equal(signResponse.status, 200);

    const invoiceResult = await pgQuery<{
      sat_certificate_id: string | null;
      cadena_original: string | null;
      sello_digital: string | null;
    }>(
      `
        select sat_certificate_id, cadena_original, sello_digital
        from cfdi_invoices
        where id = $1
      `,
      [invoiceId]
    );

    assert.equal(invoiceResult.rowCount, 1);
    assert.equal(invoiceResult.rows[0].sat_certificate_id, certificateId);
    assert.ok((invoiceResult.rows[0].cadena_original ?? '').length > 0);
    assert.ok((invoiceResult.rows[0].sello_digital ?? '').length > 0);

    const statusResponse = await fetch(
      `${started.baseUrl}/management/cfdi/invoices/${invoiceId}?limit=5&from=2020-01-01T00:00:00.000Z&to=2100-01-01T00:00:00.000Z`,
      {
        method: 'GET',
        headers: integrationTestHeaders('owner', 'es-MX', ACTOR_USER_ID)
      }
    );
    assert.equal(statusResponse.status, 200);
    const statusPayload = (await statusResponse.json()) as {
      data: {
        invoice: {
          signing: {
            hasCadenaOriginal: boolean;
            hasSelloDigital: boolean;
            satCertificateId: string | null;
          };
        };
      };
    };
    assert.equal(statusPayload.data.invoice.signing.hasCadenaOriginal, true);
    assert.equal(statusPayload.data.invoice.signing.hasSelloDigital, true);
    assert.equal(statusPayload.data.invoice.signing.satCertificateId, certificateId);
  } finally {
    if (server) {
      await stopServer(server);
    }

    await cleanupCfdiValidationArtifacts(invoiceId);
    await cleanupSatCertificateArtifacts(certificateId);
    await closePgPool();
    restoreStorageMode();
  }
});

test('cfdi cancel reason 01 enforces replacement CFDI traceability in postgres mode', async (t: TestContext) => {
  if (!hasRequiredPostgresEnv()) {
    t.skip('Postgres env vars are not configured');
    return;
  }

  const restoreStorageMode = setEnv('STORAGE_MODE', 'postgres');
  const invoiceId = 'inv_cfdi_cancel_r01_pg_001';
  const replacementInvoiceId = 'inv_cfdi_cancel_r01_replacement_pg_001';
  const replacementCfdiUuid = '1f1422b6-0d57-4c3b-b0d8-26f67edaf5cf';
  let server: Server | null = null;

  try {
    if (!(await isCfdiSchemaReady())) {
      t.skip('Postgres schema is not initialized (cfdi_invoices/cfdi_invoice_events missing)');
      return;
    }

    await cleanupCfdiValidationArtifacts(invoiceId);
    await cleanupCfdiValidationArtifacts(replacementInvoiceId);
    await seedCfdiInvoice(invoiceId);

    const started = await startPostgresServer();
    server = started.server;

    const validateMissingReplacement = await fetch(`${started.baseUrl}/management/cfdi/cancel/validate`, {
      method: 'POST',
      headers: integrationTestHeaders('owner', 'es-MX', ACTOR_USER_ID),
      body: JSON.stringify({
        invoiceId,
        cfdiUuid: '58f72000-a4ec-40aa-bfd9-92e33652d7d9',
        cancellationReason: '01',
        replacementCfdiUuid,
        cancelledAt: '2026-03-05T16:00:00.000Z'
      })
    });

    assert.equal(validateMissingReplacement.status, 409);

    await seedStampedCfdiInvoice(replacementInvoiceId, replacementCfdiUuid);

    const validateWithReplacement = await fetch(`${started.baseUrl}/management/cfdi/cancel/validate`, {
      method: 'POST',
      headers: integrationTestHeaders('owner', 'es-MX', ACTOR_USER_ID),
      body: JSON.stringify({
        invoiceId,
        cfdiUuid: '58f72000-a4ec-40aa-bfd9-92e33652d7d9',
        cancellationReason: '01',
        replacementCfdiUuid,
        cancelledAt: '2026-03-05T16:10:00.000Z'
      })
    });

    assert.equal(validateWithReplacement.status, 200);

    const confirmResponse = await fetch(`${started.baseUrl}/management/cfdi/cancel/confirm`, {
      method: 'POST',
      headers: integrationTestHeaders('owner', 'es-MX', ACTOR_USER_ID),
      body: JSON.stringify({
        invoiceId,
        cfdiUuid: '58f72000-a4ec-40aa-bfd9-92e33652d7d9',
        cancellationReason: '01',
        replacementCfdiUuid,
        cancelledAt: '2026-03-05T16:20:00.000Z'
      })
    });

    assert.equal(confirmResponse.status, 200);
  } finally {
    if (server) {
      await stopServer(server);
    }

    await cleanupCfdiValidationArtifacts(invoiceId);
    await cleanupCfdiValidationArtifacts(replacementInvoiceId);
    await closePgPool();
    restoreStorageMode();
  }
});

test('cfdi sign stores diagnostic last_error when certificate signing material is missing', async (t: TestContext) => {
  if (!hasRequiredPostgresEnv()) {
    t.skip('Postgres env vars are not configured');
    return;
  }

  const restoreStorageMode = setEnv('STORAGE_MODE', 'postgres');
  const invoiceId = 'inv_cfdi_sign_missing_material_pg_001';
  const certificateId = 'cert_cfdi_sign_missing_material_pg_001';
  let server: Server | null = null;

  try {
    if (!(await isCfdiSchemaReady()) || !(await isCfdiSatSchemaReady())) {
      t.skip('Postgres schema is not initialized (cfdi_invoices/cfdi_invoice_events/sat_certificates missing)');
      return;
    }

    await cleanupCfdiValidationArtifacts(invoiceId);
    await cleanupSatCertificateArtifacts(certificateId);
    await seedCfdiInvoice(invoiceId);
    await seedSatCertificate(certificateId, {
      privateKeyRef: null,
      passphraseRef: null
    });

    const started = await startPostgresServer();
    server = started.server;

    const xmlUnsigned = '<?xml version="1.0"?><cfdi:Comprobante></cfdi:Comprobante>';
    const persistXmlResponse = await fetch(`${started.baseUrl}/management/cfdi/xml/persist`, {
      method: 'POST',
      headers: integrationTestHeaders('owner', 'es-MX', ACTOR_USER_ID),
      body: JSON.stringify({
        invoiceId,
        xmlType: 'unsigned',
        xmlContent: xmlUnsigned
      })
    });

    assert.equal(persistXmlResponse.status, 200);

    const signResponse = await fetch(`${started.baseUrl}/management/cfdi/sign`, {
      method: 'POST',
      headers: integrationTestHeaders('owner', 'es-MX', ACTOR_USER_ID),
      body: JSON.stringify({
        invoiceId,
        satCertificateId: certificateId,
        xmlType: 'unsigned',
        digestAlgorithm: 'sha256'
      })
    });

    assert.equal(signResponse.status, 409);

    const invoiceResult = await pgQuery<{ last_error: string | null }>(
      `
        select last_error
        from cfdi_invoices
        where id = $1
      `,
      [invoiceId]
    );

    assert.equal(invoiceResult.rowCount, 1);
    assert.equal(invoiceResult.rows[0].last_error, 'certificate_signing_material_missing');

    const errorEventResult = await pgQuery<{ event_type: string; reason: string | null }>(
      `
        select
          event_type,
          detail_json->>'reason' as reason
        from cfdi_invoice_events
        where cfdi_invoice_id = $1
          and event_type = 'error'
        order by event_at desc
        limit 1
      `,
      [invoiceId]
    );

    assert.equal(errorEventResult.rowCount, 1);
    assert.equal(errorEventResult.rows[0].event_type, 'error');
    assert.equal(errorEventResult.rows[0].reason, 'certificate_signing_material_missing');

    const signingErrorsResponse = await fetch(
      `${started.baseUrl}/management/cfdi/signing/errors?reason=certificate_signing_material_missing&invoiceId=${invoiceId}&limit=5`,
      {
        method: 'GET',
        headers: integrationTestHeaders('owner', 'es-MX', ACTOR_USER_ID)
      }
    );

    assert.equal(signingErrorsResponse.status, 200);
    const signingErrorsPayload = (await signingErrorsResponse.json()) as {
      message: string;
      data: {
        count: number;
        errors: Array<{
          invoiceId: string;
          reason: string | null;
          invoiceLastError: string | null;
        }>;
      };
    };

    assert.equal(signingErrorsPayload.message, 'Errores de firmado CFDI consultados');
    assert.ok(signingErrorsPayload.data.count >= 1);
    assert.deepEqual(Object.keys(signingErrorsPayload.data.errors[0]).sort(), [
      'createdAt',
      'detail',
      'eventAt',
      'id',
      'invoiceId',
      'invoiceLastError',
      'reason'
    ]);
    assert.equal(signingErrorsPayload.data.errors[0].invoiceId, invoiceId);
    assert.equal(signingErrorsPayload.data.errors[0].reason, 'certificate_signing_material_missing');
    assert.equal(signingErrorsPayload.data.errors[0].invoiceLastError, 'certificate_signing_material_missing');

    const signingErrorTrendsResponse = await fetch(
      `${started.baseUrl}/management/cfdi/signing/errors/trends?reason=certificate_signing_material_missing&windowDays=30`,
      {
        method: 'GET',
        headers: integrationTestHeaders('owner', 'es-MX', ACTOR_USER_ID)
      }
    );

    assert.equal(signingErrorTrendsResponse.status, 200);
    const signingErrorTrendsPayload = (await signingErrorTrendsResponse.json()) as {
      message: string;
      data: {
        totalErrors: number;
        bucketCount: number;
        buckets: Array<{
          day: string;
          totalCount: number;
          reasons: Array<{ reason: string; count: number }>;
        }>;
        totals: Array<{ reason: string; count: number }>;
      };
    };

    assert.equal(signingErrorTrendsPayload.message, 'Tendencias de errores de firmado CFDI consultadas');
    assert.ok(signingErrorTrendsPayload.data.totalErrors >= 1);
    assert.ok(signingErrorTrendsPayload.data.bucketCount >= 1);
    assert.deepEqual(Object.keys(signingErrorTrendsPayload.data.buckets[0]).sort(), ['day', 'reasons', 'totalCount']);
    assert.deepEqual(Object.keys(signingErrorTrendsPayload.data.buckets[0].reasons[0]).sort(), ['count', 'reason']);
    assert.deepEqual(Object.keys(signingErrorTrendsPayload.data.totals[0]).sort(), ['count', 'reason']);
    assert.equal(signingErrorTrendsPayload.data.totals[0].reason, 'certificate_signing_material_missing');
    assert.ok(signingErrorTrendsPayload.data.totals[0].count >= 1);
    assert.ok(
      signingErrorTrendsPayload.data.buckets.some((bucket) =>
        bucket.reasons.some((item) => item.reason === 'certificate_signing_material_missing' && item.count >= 1)
      )
    );

    const dashboardSummaryResponse = await fetch(
      `${started.baseUrl}/dashboard/ops/cfdi-signing/errors?reason=certificate_signing_material_missing&windowDays=30&limit=1`,
      {
        method: 'GET',
        headers: integrationTestHeaders('manager', 'es-MX', ACTOR_USER_ID)
      }
    );

    assert.equal(dashboardSummaryResponse.status, 200);
    const dashboardSummaryPayload = (await dashboardSummaryResponse.json()) as {
      message: string;
      data: {
        totalErrors: number;
        activeDays: number;
        topReasons: Array<{ reason: string; count: number }>;
        daily: Array<{ day: string; count: number }>;
      };
    };

    assert.equal(dashboardSummaryPayload.message, 'Resumen de errores CFDI consultado');
    assert.ok(dashboardSummaryPayload.data.totalErrors >= 1);
    assert.ok(dashboardSummaryPayload.data.activeDays >= 1);
    assert.deepEqual(Object.keys(dashboardSummaryPayload.data.topReasons[0]).sort(), ['count', 'reason']);
    assert.deepEqual(Object.keys(dashboardSummaryPayload.data.daily[0]).sort(), ['count', 'day']);
    assert.equal(dashboardSummaryPayload.data.topReasons[0].reason, 'certificate_signing_material_missing');
    assert.ok(dashboardSummaryPayload.data.topReasons[0].count >= 1);
    assert.ok(dashboardSummaryPayload.data.daily.length <= 1);
    assert.ok(dashboardSummaryPayload.data.daily[0].count >= 1);
  } finally {
    if (server) {
      await stopServer(server);
    }

    await cleanupCfdiValidationArtifacts(invoiceId);
    await cleanupSatCertificateArtifacts(certificateId);
    await closePgPool();
    restoreStorageMode();
  }
});
