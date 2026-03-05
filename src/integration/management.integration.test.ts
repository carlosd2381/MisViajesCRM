import test from 'node:test';
import assert from 'node:assert/strict';
import { integrationTestHeaders, startIntegrationServer, stopIntegrationServer } from './test-harness';

function testHeaders(role = 'owner'): Record<string, string> {
  return integrationTestHeaders(role);
}

const startServer = startIntegrationServer;
const stopServer = stopIntegrationServer;

test('owner can create and update management setting', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const createResponse = await fetch(`${baseUrl}/management`, {
      method: 'POST',
      headers: testHeaders('owner'),
      body: JSON.stringify({
        key: 'booking_window_days',
        value: '45',
        description: 'Ventana de reserva recomendada'
      })
    });

    assert.equal(createResponse.status, 201);
    const created = (await createResponse.json()) as { data: { id: string } };

    const patchResponse = await fetch(`${baseUrl}/management/${created.data.id}`, {
      method: 'PATCH',
      headers: testHeaders('owner'),
      body: JSON.stringify({ value: '60' })
    });

    assert.equal(patchResponse.status, 200);
  } finally {
    await stopServer(server);
  }
});

test('manager can read settings but cannot write', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const readResponse = await fetch(`${baseUrl}/management`, {
      method: 'GET',
      headers: testHeaders('manager')
    });

    assert.equal(readResponse.status, 200);

    const writeResponse = await fetch(`${baseUrl}/management`, {
      method: 'POST',
      headers: testHeaders('manager'),
      body: JSON.stringify({
        key: 'default_markup_pct',
        value: '12'
      })
    });

    assert.equal(writeResponse.status, 403);
  } finally {
    await stopServer(server);
  }
});

test('owner can read CFDI readiness endpoint in memory mode', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const response = await fetch(`${baseUrl}/management/cfdi/readiness`, {
      method: 'GET',
      headers: testHeaders('owner')
    });

    assert.equal(response.status, 200);
    const payload = (await response.json()) as {
      message: string;
      data: {
        ready: boolean;
        storageMode: string;
        reason?: string;
        checkedTables: string[];
        missingTables: string[];
      };
    };

    assert.equal(payload.message, 'Readiness CFDI no disponible en modo memoria');
    assert.equal(payload.data.ready, false);
    assert.equal(payload.data.storageMode, 'memory');
    assert.equal(payload.data.reason, 'storage_mode_not_postgres');
    assert.deepEqual(payload.data.checkedTables, ['sat_certificates', 'cfdi_invoices', 'cfdi_invoice_events']);
    assert.deepEqual(payload.data.missingTables, ['sat_certificates', 'cfdi_invoices', 'cfdi_invoice_events']);
  } finally {
    await stopServer(server);
  }
});

test('manager can read CFDI readiness endpoint with en-US locale', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const response = await fetch(`${baseUrl}/management/cfdi/readiness`, {
      method: 'GET',
      headers: integrationTestHeaders('manager', 'en-US')
    });

    assert.equal(response.status, 200);
    const payload = (await response.json()) as {
      message: string;
      data: {
        ready: boolean;
      };
    };

    assert.equal(payload.message, 'CFDI readiness is unavailable in memory mode');
    assert.equal(payload.data.ready, false);
  } finally {
    await stopServer(server);
  }
});

test('owner can validate CFDI stamp contract payload', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const response = await fetch(`${baseUrl}/management/cfdi/stamp/validate`, {
      method: 'POST',
      headers: testHeaders('owner'),
      body: JSON.stringify({
        invoiceId: 'inv_cfdi_001',
        satCertificateId: 'cert_001',
        rfcEmisor: 'AAA010101AAA',
        rfcReceptor: 'BBB010101BBB',
        currency: 'MXN',
        total: 15999.75,
        issueDate: '2026-03-06T09:00:00.000Z'
      })
    });

    assert.equal(response.status, 200);
    const payload = (await response.json()) as {
      message: string;
      data: {
        valid: boolean;
        operation: string;
        normalizedRequest: {
          currency: string;
        };
      };
    };

    assert.equal(payload.message, 'Contrato CFDI timbrado válido');
    assert.equal(payload.data.valid, true);
    assert.equal(payload.data.operation, 'stamp');
    assert.equal(payload.data.normalizedRequest.currency, 'MXN');
  } finally {
    await stopServer(server);
  }
});

test('owner gets validation errors for invalid CFDI cancel contract payload', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const response = await fetch(`${baseUrl}/management/cfdi/cancel/validate`, {
      method: 'POST',
      headers: testHeaders('owner'),
      body: JSON.stringify({
        invoiceId: 'inv_cfdi_001',
        cfdiUuid: 'd2719f53-0dca-4eeb-b6bb-9bcd2ccf61fc',
        cancellationReason: '01',
        cancelledAt: '2026-03-06T10:00:00.000Z'
      })
    });

    assert.equal(response.status, 400);
    const payload = (await response.json()) as {
      message: string;
      errors?: string[];
    };

    assert.equal(payload.message, 'Solicitud inválida');
    assert.ok(Array.isArray(payload.errors));
    assert.ok((payload.errors?.join(' ') ?? '').includes('replacementCfdiUuid es requerido'));
  } finally {
    await stopServer(server);
  }
});

test('owner can query CFDI events endpoint in memory mode', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const response = await fetch(`${baseUrl}/management/cfdi/events?invoiceId=inv_cfdi_001&limit=5`, {
      method: 'GET',
      headers: testHeaders('owner')
    });

    assert.equal(response.status, 200);
    const payload = (await response.json()) as {
      message: string;
      data: {
        storageMode: string;
        invoiceId: string;
        count: number;
        events: unknown[];
      };
    };

    assert.equal(payload.message, 'Eventos CFDI no disponibles en modo memoria');
    assert.equal(payload.data.storageMode, 'memory');
    assert.equal(payload.data.invoiceId, 'inv_cfdi_001');
    assert.equal(payload.data.count, 0);
    assert.deepEqual(payload.data.events, []);
  } finally {
    await stopServer(server);
  }
});

test('owner gets 400 for CFDI events endpoint without invoiceId', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const response = await fetch(`${baseUrl}/management/cfdi/events`, {
      method: 'GET',
      headers: testHeaders('owner')
    });

    assert.equal(response.status, 400);
    const payload = (await response.json()) as {
      message: string;
      errors?: string[];
    };

    assert.equal(payload.message, 'Solicitud inválida');
    assert.ok(Array.isArray(payload.errors));
    assert.ok((payload.errors ?? []).includes('invoiceId es requerido'));
  } finally {
    await stopServer(server);
  }
});

test('owner can request CFDI stamp confirm in memory mode', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const response = await fetch(`${baseUrl}/management/cfdi/stamp/confirm`, {
      method: 'POST',
      headers: testHeaders('owner'),
      body: JSON.stringify({
        invoiceId: 'inv_memory_001',
        cfdiUuid: 'd2719f53-0dca-4eeb-b6bb-9bcd2ccf61fc',
        stampedAt: '2026-03-06T12:00:00.000Z'
      })
    });

    assert.equal(response.status, 200);
    const payload = (await response.json()) as {
      message: string;
      data: {
        transitionApplied: boolean;
        storageMode: string;
      };
    };

    assert.equal(payload.message, 'Transición CFDI no disponible en modo memoria');
    assert.equal(payload.data.transitionApplied, false);
    assert.equal(payload.data.storageMode, 'memory');
  } finally {
    await stopServer(server);
  }
});

test('owner can query SAT certificates endpoint in memory mode', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const response = await fetch(`${baseUrl}/management/cfdi/certificates?limit=10`, {
      method: 'GET',
      headers: testHeaders('owner')
    });

    assert.equal(response.status, 200);
    const payload = (await response.json()) as {
      message: string;
      data: {
        storageMode: string;
        count: number;
        certificates: unknown[];
      };
    };

    assert.equal(payload.message, 'Certificados SAT no disponibles en modo memoria');
    assert.equal(payload.data.storageMode, 'memory');
    assert.equal(payload.data.count, 0);
    assert.deepEqual(payload.data.certificates, []);
  } finally {
    await stopServer(server);
  }
});

test('owner can create SAT certificate in memory mode with explicit fallback', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const response = await fetch(`${baseUrl}/management/cfdi/certificates`, {
      method: 'POST',
      headers: testHeaders('owner'),
      body: JSON.stringify({
        rfcEmisor: 'AAA010101AAA',
        certificateNumber: '30001000000500003416',
        certificateSource: 'csd',
        status: 'active',
        validFrom: '2026-01-01',
        validTo: '2027-01-01'
      })
    });

    assert.equal(response.status, 200);
    const payload = (await response.json()) as {
      message: string;
      data: {
        storageMode: string;
        created: boolean;
      };
    };

    assert.equal(payload.message, 'Creación de certificado SAT no disponible en modo memoria');
    assert.equal(payload.data.storageMode, 'memory');
    assert.equal(payload.data.created, false);
  } finally {
    await stopServer(server);
  }
});

test('owner can validate CFDI XML contract payload', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const response = await fetch(`${baseUrl}/management/cfdi/xml/validate`, {
      method: 'POST',
      headers: testHeaders('owner'),
      body: JSON.stringify({
        invoiceId: 'inv_xml_memory_001',
        xmlType: 'unsigned',
        xmlContent: '<?xml version="1.0"?><cfdi:Comprobante></cfdi:Comprobante>'
      })
    });

    assert.equal(response.status, 200);
    const payload = (await response.json()) as {
      message: string;
      data: { valid: boolean; operation: string };
    };

    assert.equal(payload.message, 'Contrato XML CFDI válido');
    assert.equal(payload.data.valid, true);
    assert.equal(payload.data.operation, 'xml_validate');
  } finally {
    await stopServer(server);
  }
});

test('owner can request CFDI XML persistence in memory mode with explicit fallback', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const response = await fetch(`${baseUrl}/management/cfdi/xml/persist`, {
      method: 'POST',
      headers: testHeaders('owner'),
      body: JSON.stringify({
        invoiceId: 'inv_xml_memory_002',
        xmlType: 'unsigned',
        xmlContent: '<?xml version="1.0"?><cfdi:Comprobante></cfdi:Comprobante>'
      })
    });

    assert.equal(response.status, 200);
    const payload = (await response.json()) as {
      message: string;
      data: { persisted: boolean; storageMode: string };
    };

    assert.equal(payload.message, 'Persistencia XML CFDI no disponible en modo memoria');
    assert.equal(payload.data.persisted, false);
    assert.equal(payload.data.storageMode, 'memory');
  } finally {
    await stopServer(server);
  }
});

test('owner gets validation errors for invalid CFDI stamp confirm payload', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const response = await fetch(`${baseUrl}/management/cfdi/stamp/confirm`, {
      method: 'POST',
      headers: testHeaders('owner'),
      body: JSON.stringify({
        invoiceId: 'inv_memory_002',
        cfdiUuid: 'invalid',
        stampedAt: 'not-a-date'
      })
    });

    assert.equal(response.status, 400);
    const payload = (await response.json()) as {
      message: string;
      errors?: string[];
    };

    assert.equal(payload.message, 'Solicitud inválida');
    assert.ok(Array.isArray(payload.errors));
    assert.ok((payload.errors ?? []).some((error) => error.includes('cfdiUuid inválido')));
  } finally {
    await stopServer(server);
  }
});