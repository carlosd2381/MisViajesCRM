import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCreateLead, validateUpdateLead } from './lead-validation';

test('validateCreateLead succeeds with required fields', () => {
  const payload = {
    status: 'new',
    source: 'whatsapp',
    priority: 'high',
    destination: 'Oaxaca',
    adultsCount: 2,
    childrenCount: 0
  };

  const result = validateCreateLead(payload);

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.destination, 'Oaxaca');
  }
});

test('validateCreateLead fails with missing fields', () => {
  const payload = { source: 'whatsapp' };
  const result = validateCreateLead(payload);

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.ok(result.errors.length > 0);
  }
});

test('validateUpdateLead rejects invalid status', () => {
  const payload = { status: 'wrong_status' };
  const result = validateUpdateLead(payload);

  assert.equal(result.ok, false);
});
