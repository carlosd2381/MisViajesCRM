import test from 'node:test';
import assert from 'node:assert/strict';
import {
  QUALITY_HELPER_TESTS_SUMMARY_PREFIX,
  formatQualitySummaryLine,
  parseQualitySummaryLine
} from './quality-summary-helpers.mjs';

test('formatQualitySummaryLine serializes prefix and payload', () => {
  const summary = { pass: 4, fail: 0 };
  const line = formatQualitySummaryLine(QUALITY_HELPER_TESTS_SUMMARY_PREFIX, summary);

  assert.equal(line, 'QUALITY_HELPER_TESTS_SUMMARY {"pass":4,"fail":0}');
});

test('parseQualitySummaryLine returns parsed payload for matching prefix', () => {
  const line = 'QUALITY_HELPER_TESTS_SUMMARY {"pass":3,"fail":1}';

  const parsed = parseQualitySummaryLine(line, QUALITY_HELPER_TESTS_SUMMARY_PREFIX);
  assert.deepEqual(parsed, { pass: 3, fail: 1 });
});

test('parseQualitySummaryLine ignores non-matching prefixes', () => {
  const line = 'AUTH_SMOKE_SUMMARY {"locale":"es-MX"}';

  const parsed = parseQualitySummaryLine(line, QUALITY_HELPER_TESTS_SUMMARY_PREFIX);
  assert.equal(parsed, null);
});

test('parseQualitySummaryLine throws on invalid JSON payload', () => {
  assert.throws(
    () => parseQualitySummaryLine('QUALITY_HELPER_TESTS_SUMMARY {"pass":', QUALITY_HELPER_TESTS_SUMMARY_PREFIX),
    /Invalid JSON payload for QUALITY_HELPER_TESTS_SUMMARY/
  );
});
