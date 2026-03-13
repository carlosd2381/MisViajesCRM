import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import { closePgPool, pgQuery } from '../core/db/pg-client';
import {
  ACTOR_USER_ID,
  actorHeaders,
  cleanupCfdiValidationArtifacts,
  hasRequiredPostgresEnv,
  isCfdiSchemaReady,
  seedCfdiInvoice,
  seedCfdiInvoiceEvent,
  setEnv,
  startPostgresServer,
  stopServer
} from './http.postgres.test-helpers';

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
      headers: actorHeaders('owner'),
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
      headers: actorHeaders('owner'),
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
        headers: actorHeaders('owner')
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

    const tiedEventTimestamp = '2026-03-05T20:30:00.000Z';
    const tieEventLowId = 'cfdi_events_tie_a_pg_001';
    const tieEventHighId = 'cfdi_events_tie_b_pg_001';

    await seedCfdiInvoiceEvent(stampInvoiceId, tieEventLowId, 'generated', tiedEventTimestamp, {
      source: 'integration_test'
    });
    await seedCfdiInvoiceEvent(stampInvoiceId, tieEventHighId, 'generated', tiedEventTimestamp, {
      source: 'integration_test'
    });

    const tieOrderedEventsResponse = await fetch(
      `${started.baseUrl}/management/cfdi/events?invoiceId=${stampInvoiceId}&from=${encodeURIComponent(tiedEventTimestamp)}&to=${encodeURIComponent(tiedEventTimestamp)}&limit=2`,
      {
        method: 'GET',
        headers: actorHeaders('owner')
      }
    );

    assert.equal(tieOrderedEventsResponse.status, 200);
    const tieOrderedEventsPayload = (await tieOrderedEventsResponse.json()) as {
      data: {
        count: number;
        events: Array<{ id: string }>;
      };
    };

    assert.equal(tieOrderedEventsPayload.data.count, 2);
    assert.deepEqual(
      tieOrderedEventsPayload.data.events.map((item) => item.id),
      [tieEventHighId, tieEventLowId]
    );
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
      headers: actorHeaders('owner'),
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
      headers: actorHeaders('owner'),
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
