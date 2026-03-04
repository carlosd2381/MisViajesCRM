import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCreateCommission, validateUpdateCommission } from './commission-validation';

test('validateCreateCommission succeeds with required fields', () => {
  const payload = {
    itineraryId: 'it_1',
    supplierId: 'sup_1',
    expectedAmount: 1200,
    dueDate: '2026-04-01',
    status: 'claimed'
  };

  const result = validateCreateCommission(payload);
  assert.equal(result.ok, true);
});

test('validateCreateCommission fails with invalid amounts', () => {
  const payload = {
    itineraryId: 'it_1',
    supplierId: 'sup_1',
    expectedAmount: -1,
    dueDate: '2026-04-01'
  };

  const result = validateCreateCommission(payload);
  assert.equal(result.ok, false);
});

test('validateUpdateCommission rejects invalid status', () => {
  const result = validateUpdateCommission({ status: 'bad_status' });
  assert.equal(result.ok, false);
});
