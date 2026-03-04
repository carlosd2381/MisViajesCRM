import test from 'node:test';
import assert from 'node:assert/strict';
import {
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