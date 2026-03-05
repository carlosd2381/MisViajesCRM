import test from 'node:test';
import assert from 'node:assert/strict';
import { mapCfdiEventRow, mapCfdiEventRowWithInvoice } from './pg-cfdi-event-mappers';

test('mapCfdiEventRow maps common CFDI event shape', () => {
  const mapped = mapCfdiEventRow({
    id: 'evt_1',
    event_type: 'validation_passed',
    detail_json: { operation: 'stamp' },
    event_at: '2026-03-05T10:00:00.000Z',
    created_at: '2026-03-05T10:00:01.000Z'
  });

  assert.deepEqual(mapped, {
    id: 'evt_1',
    eventType: 'validation_passed',
    detail: { operation: 'stamp' },
    eventAt: '2026-03-05T10:00:00.000Z',
    createdAt: '2026-03-05T10:00:01.000Z'
  });
});

test('mapCfdiEventRow maps null detail_json as empty object', () => {
  const mapped = mapCfdiEventRow({
    id: 'evt_2',
    event_type: 'generated',
    detail_json: null,
    event_at: '2026-03-05T11:00:00.000Z',
    created_at: '2026-03-05T11:00:01.000Z'
  });

  assert.deepEqual(mapped.detail, {});
});

test('mapCfdiEventRowWithInvoice includes invoice id and common mapped fields', () => {
  const mapped = mapCfdiEventRowWithInvoice({
    id: 'evt_3',
    cfdi_invoice_id: 'inv_3',
    event_type: 'error',
    detail_json: { reason: 'certificate_signing_material_missing' },
    event_at: '2026-03-05T12:00:00.000Z',
    created_at: '2026-03-05T12:00:01.000Z'
  });

  assert.deepEqual(mapped, {
    id: 'evt_3',
    invoiceId: 'inv_3',
    eventType: 'error',
    detail: { reason: 'certificate_signing_material_missing' },
    eventAt: '2026-03-05T12:00:00.000Z',
    createdAt: '2026-03-05T12:00:01.000Z'
  });
});
