import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import { closePgPool, pgQuery } from '../core/db/pg-client';
import {
  actorHeaders,
  cleanupCfdiValidationArtifacts,
  cleanupSatCertificateArtifacts,
  hasRequiredPostgresEnv,
  isCfdiSatSchemaReady,
  isCfdiSchemaReady,
  seedCfdiInvoice,
  seedCfdiInvoiceEvent,
  seedSatCertificate,
  seedStampedCfdiInvoice,
  setEnv,
  startPostgresServer,
  stopServer
} from './http.postgres.test-helpers';

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
      headers: actorHeaders('owner'),
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
        headers: actorHeaders('owner')
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
      headers: actorHeaders('owner')
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
      headers: actorHeaders('owner'),
      body: JSON.stringify({
        invoiceId,
        xmlType: 'unsigned',
        xmlContent: xmlUnsigned
      })
    });

    assert.equal(validateResponse.status, 200);

    const persistResponse = await fetch(`${started.baseUrl}/management/cfdi/xml/persist`, {
      method: 'POST',
      headers: actorHeaders('owner'),
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
        headers: actorHeaders('owner')
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

    const tiedEventTimestamp = '2026-03-05T21:00:00.000Z';
    const tieEventLowId = 'cfdi_invoice_status_tie_a_pg_001';
    const tieEventHighId = 'cfdi_invoice_status_tie_b_pg_001';

    await seedCfdiInvoiceEvent(invoiceId, tieEventLowId, 'generated', tiedEventTimestamp, {
      source: 'integration_test'
    });
    await seedCfdiInvoiceEvent(invoiceId, tieEventHighId, 'generated', tiedEventTimestamp, {
      source: 'integration_test'
    });

    const tieOrderedStatusResponse = await fetch(
      `${started.baseUrl}/management/cfdi/invoices/${invoiceId}?from=${encodeURIComponent(tiedEventTimestamp)}&to=${encodeURIComponent(tiedEventTimestamp)}&limit=2`,
      {
        method: 'GET',
        headers: actorHeaders('owner')
      }
    );

    assert.equal(tieOrderedStatusResponse.status, 200);
    const tieOrderedStatusPayload = (await tieOrderedStatusResponse.json()) as {
      data: {
        events: Array<{ id: string }>;
      };
    };

    assert.equal(tieOrderedStatusPayload.data.events.length, 2);
    assert.deepEqual(
      tieOrderedStatusPayload.data.events.map((item) => item.id),
      [tieEventHighId, tieEventLowId]
    );

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
      headers: actorHeaders('owner'),
      body: JSON.stringify({
        invoiceId,
        xmlType: 'unsigned',
        xmlContent: xmlUnsigned
      })
    });
    assert.equal(persistXmlResponse.status, 200);

    const signResponse = await fetch(`${started.baseUrl}/management/cfdi/sign`, {
      method: 'POST',
      headers: actorHeaders('owner'),
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
        headers: actorHeaders('owner')
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
      headers: actorHeaders('owner'),
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
      headers: actorHeaders('owner'),
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
      headers: actorHeaders('owner'),
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
