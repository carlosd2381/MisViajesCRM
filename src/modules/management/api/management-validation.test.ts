import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateCfdiCancelConfirmRequest,
  validateCfdiCancelRequest,
  validateCfdiStampConfirmRequest,
  validateCfdiStampRequest,
  validateCreateSatCertificateRequest,
  validateCreateManagementSetting,
  validateUpdateManagementSetting
} from './management-validation';

test('validateCreateManagementSetting succeeds with required fields', () => {
  const result = validateCreateManagementSetting({
    key: 'booking_window_days',
    value: '45',
    description: 'Ventana recomendada de reserva'
  });

  assert.equal(result.ok, true);
});

test('validateCreateManagementSetting fails with invalid key', () => {
  const result = validateCreateManagementSetting({
    key: 'BookingWindow',
    value: '45'
  });

  assert.equal(result.ok, false);
});

test('validateUpdateManagementSetting rejects empty body', () => {
  const result = validateUpdateManagementSetting({});
  assert.equal(result.ok, false);
});

test('validateCfdiStampRequest succeeds with required fields', () => {
  const result = validateCfdiStampRequest({
    invoiceId: 'inv_123',
    satCertificateId: 'cert_123',
    rfcEmisor: 'AAA010101AAA',
    rfcReceptor: 'BBB010101BBB',
    currency: 'MXN',
    total: 12500.5,
    issueDate: '2026-03-05T12:00:00.000Z'
  });

  assert.equal(result.ok, true);
});

test('validateCfdiStampRequest rejects invalid RFC and total', () => {
  const result = validateCfdiStampRequest({
    invoiceId: 'inv_123',
    satCertificateId: 'cert_123',
    rfcEmisor: 'INVALID',
    rfcReceptor: 'BBB010101BBB',
    currency: 'MXN',
    total: 0,
    issueDate: '2026-03-05T12:00:00.000Z'
  });

  assert.equal(result.ok, false);
});

test('validateCfdiCancelRequest requires replacement UUID for reason 01', () => {
  const result = validateCfdiCancelRequest({
    invoiceId: 'inv_123',
    cfdiUuid: 'd2719f53-0dca-4eeb-b6bb-9bcd2ccf61fc',
    cancellationReason: '01',
    cancelledAt: '2026-03-05T13:00:00.000Z'
  });

  assert.equal(result.ok, false);
});

test('validateCfdiCancelRequest succeeds with valid payload', () => {
  const result = validateCfdiCancelRequest({
    invoiceId: 'inv_123',
    cfdiUuid: 'd2719f53-0dca-4eeb-b6bb-9bcd2ccf61fc',
    cancellationReason: '02',
    cancelledAt: '2026-03-05T13:00:00.000Z'
  });

  assert.equal(result.ok, true);
});

test('validateCfdiStampConfirmRequest succeeds with valid payload', () => {
  const result = validateCfdiStampConfirmRequest({
    invoiceId: 'inv_123',
    cfdiUuid: 'd2719f53-0dca-4eeb-b6bb-9bcd2ccf61fc',
    stampedAt: '2026-03-05T13:00:00.000Z'
  });

  assert.equal(result.ok, true);
});

test('validateCfdiStampConfirmRequest rejects invalid uuid', () => {
  const result = validateCfdiStampConfirmRequest({
    invoiceId: 'inv_123',
    cfdiUuid: 'invalid',
    stampedAt: '2026-03-05T13:00:00.000Z'
  });

  assert.equal(result.ok, false);
});

test('validateCfdiCancelConfirmRequest reuses cancellation rules', () => {
  const result = validateCfdiCancelConfirmRequest({
    invoiceId: 'inv_123',
    cfdiUuid: 'd2719f53-0dca-4eeb-b6bb-9bcd2ccf61fc',
    cancellationReason: '01',
    cancelledAt: '2026-03-05T13:00:00.000Z'
  });

  assert.equal(result.ok, false);
});

test('validateCreateSatCertificateRequest succeeds with valid payload', () => {
  const result = validateCreateSatCertificateRequest({
    rfcEmisor: 'AAA010101AAA',
    certificateNumber: '30001000000500003416',
    certificateSource: 'csd',
    status: 'active',
    validFrom: '2026-01-01',
    validTo: '2027-01-01'
  });

  assert.equal(result.ok, true);
});

test('validateCreateSatCertificateRequest rejects invalid date range', () => {
  const result = validateCreateSatCertificateRequest({
    rfcEmisor: 'AAA010101AAA',
    certificateNumber: '30001000000500003416',
    certificateSource: 'csd',
    status: 'active',
    validFrom: '2027-01-01',
    validTo: '2026-01-01'
  });

  assert.equal(result.ok, false);
});