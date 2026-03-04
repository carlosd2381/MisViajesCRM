import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCreateSupplier, validateUpdateSupplier } from './supplier-validation';

test('validateCreateSupplier succeeds with required fields', () => {
  const payload = {
    name: 'Operadora Riviera',
    type: 'dmc',
    status: 'active',
    defaultCurrency: 'MXN',
    commissionType: 'percentage',
    commissionRate: 12,
    payoutTerms: 'post_travel_30',
    internalRiskFlag: 'reliable'
  };

  const result = validateCreateSupplier(payload);

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.name, 'Operadora Riviera');
  }
});

test('validateCreateSupplier fails with missing required fields', () => {
  const payload = { name: 'Incompleto' };
  const result = validateCreateSupplier(payload);

  assert.equal(result.ok, false);
});

test('validateUpdateSupplier rejects invalid enum values', () => {
  const payload = { status: 'wrong_status' };
  const result = validateUpdateSupplier(payload);

  assert.equal(result.ok, false);
});
