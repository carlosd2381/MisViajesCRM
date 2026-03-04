import test from 'node:test';
import assert from 'node:assert/strict';
import { formatSmokeSummaryLine, parseSmokeSummaryLine } from './smoke-summary-helpers.mjs';

test('formatSmokeSummaryLine serializes prefix and payload', () => {
  const summary = { locale: 'es-MX', totalRuns: 3 };
  const line = formatSmokeSummaryLine('SMOKE_MATRIX_SUMMARY', summary);

  assert.equal(line, 'SMOKE_MATRIX_SUMMARY {"locale":"es-MX","totalRuns":3}');
});

test('parseSmokeSummaryLine returns parsed payload for matching prefix', () => {
  const line = 'AI_RENDER_SMOKE_SUMMARY {"authMode":"token","locale":"en-US"}';

  const parsed = parseSmokeSummaryLine(line, 'AI_RENDER_SMOKE_SUMMARY');
  assert.deepEqual(parsed, { authMode: 'token', locale: 'en-US' });
});

test('parseSmokeSummaryLine ignores non-matching prefixes', () => {
  const line = 'AUTH_SMOKE_SUMMARY {"locale":"es-MX"}';

  const parsed = parseSmokeSummaryLine(line, 'AI_SCHEMA_SMOKE_SUMMARY');
  assert.equal(parsed, null);
});

test('parseSmokeSummaryLine throws on invalid JSON payload', () => {
  assert.throws(
    () => parseSmokeSummaryLine('AUTH_SMOKE_SUMMARY {"locale":', 'AUTH_SMOKE_SUMMARY'),
    /Invalid JSON payload for AUTH_SMOKE_SUMMARY/
  );
});