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
  seedCfdiInvoiceErrorEvent,
  seedSatCertificate,
  setEnv,
  startPostgresServer,
  stopServer
} from './http.postgres.test-helpers';

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

    const secondSignResponse = await fetch(`${started.baseUrl}/management/cfdi/sign`, {
      method: 'POST',
      headers: actorHeaders('owner'),
      body: JSON.stringify({
        invoiceId,
        satCertificateId: certificateId,
        xmlType: 'unsigned',
        digestAlgorithm: 'sha256'
      })
    });

    assert.equal(secondSignResponse.status, 409);

    const signingErrorsResponse = await fetch(
      `${started.baseUrl}/management/cfdi/signing/errors?reason=certificate_signing_material_missing&invoiceId=${invoiceId}&limit=5`,
      {
        method: 'GET',
        headers: actorHeaders('owner')
      }
    );

    assert.equal(signingErrorsResponse.status, 200);
    const signingErrorsPayload = (await signingErrorsResponse.json()) as {
      message: string;
      data: {
        count: number;
        errors: Array<{
          id: string;
          invoiceId: string;
          reason: string | null;
          invoiceLastError: string | null;
          detail: Record<string, unknown>;
          eventAt: string;
          createdAt: string;
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
    assert.ok(signingErrorsPayload.data.errors.length >= 2);

    for (let index = 1; index < signingErrorsPayload.data.errors.length; index += 1) {
      const previousTimestamp = Date.parse(signingErrorsPayload.data.errors[index - 1].eventAt);
      const currentTimestamp = Date.parse(signingErrorsPayload.data.errors[index].eventAt);
      assert.ok(previousTimestamp >= currentTimestamp);
    }

    const signingErrorsLimitOneResponse = await fetch(
      `${started.baseUrl}/management/cfdi/signing/errors?reason=certificate_signing_material_missing&invoiceId=${invoiceId}&limit=1`,
      {
        method: 'GET',
        headers: actorHeaders('owner')
      }
    );

    assert.equal(signingErrorsLimitOneResponse.status, 200);
    const signingErrorsLimitOnePayload = (await signingErrorsLimitOneResponse.json()) as {
      data: {
        count: number;
        errors: Array<{ invoiceId: string; reason: string | null }>;
      };
    };

    assert.equal(signingErrorsLimitOnePayload.data.count, 1);
    assert.equal(signingErrorsLimitOnePayload.data.errors.length, 1);
    assert.equal(signingErrorsLimitOnePayload.data.errors[0].invoiceId, invoiceId);
    assert.equal(signingErrorsLimitOnePayload.data.errors[0].reason, 'certificate_signing_material_missing');

    const tiedEventTimestamp = '2026-03-05T21:30:00.000Z';
    const tieEventLowId = 'cfdi_sign_error_tie_a_pg_001';
    const tieEventHighId = 'cfdi_sign_error_tie_b_pg_001';

    await seedCfdiInvoiceErrorEvent(invoiceId, tieEventLowId, tiedEventTimestamp);
    await seedCfdiInvoiceErrorEvent(invoiceId, tieEventHighId, tiedEventTimestamp);

    const signingErrorsTieResponse = await fetch(
      `${started.baseUrl}/management/cfdi/signing/errors?reason=certificate_signing_material_missing&invoiceId=${invoiceId}&from=${encodeURIComponent(tiedEventTimestamp)}&to=${encodeURIComponent(tiedEventTimestamp)}&limit=2`,
      {
        method: 'GET',
        headers: actorHeaders('owner')
      }
    );

    assert.equal(signingErrorsTieResponse.status, 200);
    const signingErrorsTiePayload = (await signingErrorsTieResponse.json()) as {
      data: {
        count: number;
        errors: Array<{ id: string }>;
      };
    };

    assert.equal(signingErrorsTiePayload.data.count, 2);
    assert.deepEqual(
      signingErrorsTiePayload.data.errors.map((item) => item.id),
      [tieEventHighId, tieEventLowId]
    );

    const signingErrorTrendsResponse = await fetch(
      `${started.baseUrl}/management/cfdi/signing/errors/trends?reason=certificate_signing_material_missing&windowDays=30`,
      {
        method: 'GET',
        headers: actorHeaders('owner')
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
        headers: actorHeaders('manager')
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
