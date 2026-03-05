import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCfdiReadQueryParams } from './http-query-validation';

test('validateCfdiReadQueryParams succeeds with normalized from/to and bounded values', () => {
  const params = new URLSearchParams({
    from: ' 2026-03-05T10:00:00.000Z ',
    to: '2026-03-06T10:00:00.000Z',
    limit: '999',
    windowDays: '0'
  });

  const result = validateCfdiReadQueryParams(params, {
    limit: { defaultValue: 20, min: 1, max: 100 },
    windowDays: { defaultValue: 14, min: 1, max: 90 }
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.value.from, '2026-03-05T10:00:00.000Z');
  assert.equal(result.value.to, '2026-03-06T10:00:00.000Z');
  assert.equal(result.value.limit, 100);
  assert.equal(result.value.windowDays, 1);
});

test('validateCfdiReadQueryParams returns fallback values when optional numbers are missing', () => {
  const params = new URLSearchParams();
  const result = validateCfdiReadQueryParams(params, {
    limit: { defaultValue: 10, min: 1, max: 50 },
    windowDays: { defaultValue: 7, min: 1, max: 30 }
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.value.limit, 10);
  assert.equal(result.value.windowDays, 7);
  assert.equal(result.value.from, undefined);
  assert.equal(result.value.to, undefined);
});

test('validateCfdiReadQueryParams fails on invalid from/to timestamps', () => {
  const params = new URLSearchParams({ from: 'invalid-from', to: 'invalid-to' });
  const result = validateCfdiReadQueryParams(params);

  assert.equal(result.ok, false);
  if (result.ok) return;

  assert.ok(result.errors.includes('from inválido'));
  assert.ok(result.errors.includes('to inválido'));
});
