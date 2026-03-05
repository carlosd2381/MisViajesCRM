import test from 'node:test';
import assert from 'node:assert/strict';
import { integrationTestHeaders, startIntegrationServer, stopIntegrationServer } from './test-harness';

interface ValidationCase {
  name: string;
  path: string;
  role: string;
  expectedError: string;
}

interface LocaleCase {
  locale: 'es-MX' | 'en-US';
  expectedMessage: string;
}

const CASES: ValidationCase[] = [
  {
    name: 'management events invalid from',
    path: '/management/cfdi/events?invoiceId=inv_cfdi_001&from=not-a-date',
    role: 'owner',
    expectedError: 'from inválido'
  },
  {
    name: 'management signing errors invalid from',
    path: '/management/cfdi/signing/errors?from=not-a-date',
    role: 'owner',
    expectedError: 'from inválido'
  },
  {
    name: 'management signing trends invalid to',
    path: '/management/cfdi/signing/errors/trends?to=invalid-date',
    role: 'owner',
    expectedError: 'to inválido'
  },
  {
    name: 'management invoice status invalid from',
    path: '/management/cfdi/invoices/inv_cfdi_001?from=not-a-date',
    role: 'owner',
    expectedError: 'from inválido'
  },
  {
    name: 'dashboard signing summary invalid from',
    path: '/dashboard/ops/cfdi-signing/errors?from=not-a-date',
    role: 'manager',
    expectedError: 'from inválido'
  }
];

const LOCALES: LocaleCase[] = [
  { locale: 'es-MX', expectedMessage: 'Solicitud inválida' },
  { locale: 'en-US', expectedMessage: 'Invalid request' }
];

for (const currentCase of CASES) {
  for (const localeCase of LOCALES) {
    test(`CFDI query validation contract [${localeCase.locale}]: ${currentCase.name}`, async () => {
      const { server, baseUrl } = await startIntegrationServer();

      try {
        const response = await fetch(`${baseUrl}${currentCase.path}`, {
          method: 'GET',
          headers: integrationTestHeaders(currentCase.role, localeCase.locale)
        });

        assert.equal(response.status, 400);
        const payload = (await response.json()) as {
          message: string;
          errors?: string[];
        };

        assert.equal(payload.message, localeCase.expectedMessage);
        assert.ok((payload.errors ?? []).includes(currentCase.expectedError));
      } finally {
        await stopIntegrationServer(server);
      }
    });
  }
}
