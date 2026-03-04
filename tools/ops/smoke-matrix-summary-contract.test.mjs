import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSmokeSummaryLine } from './smoke-summary-helpers.mjs';

const REQUIRED_AI_RENDER_CHECKS = [
  'unauthorized_401',
  'method_not_allowed_405_web',
  'method_not_allowed_405_pdf',
  'forbidden_external_403',
  'render_schema_options_contract',
  'invalid_render_options_400_web',
  'invalid_render_options_400_pdf',
  'web_render_200_html',
  'pdf_render_200_pdf'
];

test('AI render smoke summary contract includes required checks for matrix consumers', () => {
  const line =
    'AI_RENDER_SMOKE_SUMMARY {"authMode":"header","locale":"es-MX","checks":["unauthorized_401","method_not_allowed_405_web","method_not_allowed_405_pdf","forbidden_external_403","render_schema_options_contract","invalid_render_options_400_web","invalid_render_options_400_pdf","web_render_200_html","pdf_render_200_pdf"]}';

  const parsed = parseSmokeSummaryLine(line, 'AI_RENDER_SMOKE_SUMMARY');

  assert.ok(parsed);
  assert.equal(parsed.authMode, 'header');
  assert.equal(parsed.locale, 'es-MX');
  assert.ok(Array.isArray(parsed.checks));

  for (const requiredCheck of REQUIRED_AI_RENDER_CHECKS) {
    assert.ok(parsed.checks.includes(requiredCheck), `missing required AI render smoke check: ${requiredCheck}`);
  }
});

test('AI render smoke summary contract fails completeness check when a required key is missing', () => {
  const line =
    'AI_RENDER_SMOKE_SUMMARY {"authMode":"token","locale":"en-US","checks":["unauthorized_401","method_not_allowed_405_web","method_not_allowed_405_pdf","forbidden_external_403","render_schema_options_contract","invalid_render_options_400_web","web_render_200_html","pdf_render_200_pdf"]}';

  const parsed = parseSmokeSummaryLine(line, 'AI_RENDER_SMOKE_SUMMARY');

  assert.ok(parsed);
  assert.equal(parsed.checks.includes('invalid_render_options_400_pdf'), false);
});