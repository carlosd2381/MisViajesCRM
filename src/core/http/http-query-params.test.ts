import test from 'node:test';
import assert from 'node:assert/strict';
import { asOptionalText, isIsoDateTime, parseBoundedInt } from './http-query-params';

test('asOptionalText trims and normalizes optional text values', () => {
  assert.equal(asOptionalText('  abc  '), 'abc');
  assert.equal(asOptionalText('   '), undefined);
  assert.equal(asOptionalText(''), undefined);
  assert.equal(asOptionalText(null), undefined);
  assert.equal(asOptionalText(undefined), undefined);
  assert.equal(asOptionalText(123), undefined);
});

test('parseBoundedInt returns fallback for null and NaN inputs', () => {
  assert.equal(parseBoundedInt(null, 20, 1, 100), 20);
  assert.equal(parseBoundedInt('not-a-number', 20, 1, 100), 20);
});

test('parseBoundedInt clamps values to provided bounds', () => {
  assert.equal(parseBoundedInt('0', 20, 1, 100), 1);
  assert.equal(parseBoundedInt('101', 20, 1, 100), 100);
  assert.equal(parseBoundedInt('42', 20, 1, 100), 42);
});

test('isIsoDateTime accepts parseable timestamps and rejects invalid ones', () => {
  assert.equal(isIsoDateTime('2026-03-06T12:00:00.000Z'), true);
  assert.equal(isIsoDateTime('2026-03-06'), true);
  assert.equal(isIsoDateTime('invalid-date'), false);
  assert.equal(isIsoDateTime('2026-13-99T99:99:99.000Z'), false);
});
