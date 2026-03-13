import test from 'node:test';
import assert from 'node:assert/strict';
import { startServer, stopServer, testHeaders } from './management.test-helpers';

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

test('owner can request CFDI signing in memory mode with explicit fallback', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const response = await fetch(`${baseUrl}/management/cfdi/sign`, {
      method: 'POST',
      headers: testHeaders('owner'),
      body: JSON.stringify({
        invoiceId: 'inv_sign_memory_001',
        satCertificateId: 'cert_sign_memory_001',
        xmlType: 'unsigned',
        digestAlgorithm: 'sha256'
      })
    });

    assert.equal(response.status, 200);
    const payload = (await response.json()) as {
      message: string;
      data: { signed: boolean; storageMode: string };
    };

    assert.equal(payload.message, 'Firmado CFDI no disponible en modo memoria');
    assert.equal(payload.data.signed, false);
    assert.equal(payload.data.storageMode, 'memory');
  } finally {
    await stopServer(server);
  }
});

test('owner can query CFDI signing errors endpoint in memory mode', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const response = await fetch(`${baseUrl}/management/cfdi/signing/errors?limit=10`, {
      method: 'GET',
      headers: testHeaders('owner')
    });

    assert.equal(response.status, 200);
    const payload = (await response.json()) as {
      message: string;
      data: { storageMode: string; count: number; errors: unknown[] };
    };

    assert.equal(payload.message, 'Errores de firmado CFDI no disponibles en modo memoria');
    assert.equal(payload.data.storageMode, 'memory');
    assert.equal(payload.data.count, 0);
    assert.deepEqual(payload.data.errors, []);
  } finally {
    await stopServer(server);
  }
});

test('owner gets 400 for CFDI signing errors endpoint with invalid from timestamp', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const response = await fetch(`${baseUrl}/management/cfdi/signing/errors?from=not-a-date`, {
      method: 'GET',
      headers: testHeaders('owner')
    });

    assert.equal(response.status, 400);
    const payload = (await response.json()) as {
      message: string;
      errors?: string[];
    };

    assert.equal(payload.message, 'Solicitud inválida');
    assert.ok((payload.errors ?? []).includes('from inválido'));
  } finally {
    await stopServer(server);
  }
});

test('owner can query CFDI signing error trends endpoint in memory mode', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const response = await fetch(`${baseUrl}/management/cfdi/signing/errors/trends?windowDays=7`, {
      method: 'GET',
      headers: testHeaders('owner')
    });

    assert.equal(response.status, 200);
    const payload = (await response.json()) as {
      message: string;
      data: {
        storageMode: string;
        totalErrors: number;
        bucketCount: number;
        buckets: unknown[];
        totals: unknown[];
      };
    };

    assert.equal(payload.message, 'Tendencias de errores de firmado CFDI no disponibles en modo memoria');
    assert.equal(payload.data.storageMode, 'memory');
    assert.equal(payload.data.totalErrors, 0);
    assert.equal(payload.data.bucketCount, 0);
    assert.deepEqual(payload.data.buckets, []);
    assert.deepEqual(payload.data.totals, []);
  } finally {
    await stopServer(server);
  }
});

test('owner gets 400 for CFDI signing error trends endpoint with invalid to timestamp', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const response = await fetch(`${baseUrl}/management/cfdi/signing/errors/trends?to=invalid-date`, {
      method: 'GET',
      headers: testHeaders('owner')
    });

    assert.equal(response.status, 400);
    const payload = (await response.json()) as {
      message: string;
      errors?: string[];
    };

    assert.equal(payload.message, 'Solicitud inválida');
    assert.ok((payload.errors ?? []).includes('to inválido'));
  } finally {
    await stopServer(server);
  }
});

test('owner gets 400 for CFDI invoice status endpoint with invalid from timestamp', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const response = await fetch(`${baseUrl}/management/cfdi/invoices/inv_cfdi_001?from=not-a-date`, {
      method: 'GET',
      headers: testHeaders('owner')
    });

    assert.equal(response.status, 400);
    const payload = (await response.json()) as {
      message: string;
      errors?: string[];
    };

    assert.equal(payload.message, 'Solicitud inválida');
    assert.ok((payload.errors ?? []).includes('from inválido'));
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
