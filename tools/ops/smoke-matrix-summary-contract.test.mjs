import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSmokeSummaryLine } from './smoke-summary-helpers.mjs';
import {
  REQUIRED_AUTH_NEGATIVE_SCENARIOS_BASE,
  REQUIRED_AUTH_NEGATIVE_SCENARIO_TOKEN_MODE,
  REQUIRED_AI_RENDER_CHECKS,
  REQUIRED_AI_SCHEMA_SECTION_ORDER,
  REQUIRED_AI_SCHEMA_VERSION,
  assertAuthSmokeSummaryContract,
  assertAiRenderSmokeSummaryContract,
  assertAiSchemaSmokeSummaryContract
} from './smoke-matrix-summary-contract.mjs';

test('Auth smoke summary contract accepts required base scenarios', () => {
  const line =
    'AUTH_SMOKE_SUMMARY {"locale":"es-MX","verifyTokenMode":false,"checkedNegativeScenarios":["unauth_metrics_401","forbidden_metrics_403","invalid_refresh_401"],"checkedLeadConversion":{"success201":true,"duplicateConflict409":true,"invalidPayload400":true,"invalidPayloadErrorsArray":true}}';

  const parsed = parseSmokeSummaryLine(line, 'AUTH_SMOKE_SUMMARY');

  assert.ok(parsed);
  assert.equal(parsed.verifyTokenMode, false);
  assert.deepEqual(parsed.checkedNegativeScenarios, REQUIRED_AUTH_NEGATIVE_SCENARIOS_BASE);
  assert.doesNotThrow(() => assertAuthSmokeSummaryContract(parsed));
});

test('Auth smoke summary contract requires token-mode scenario when verifyTokenMode=true', () => {
  const line =
    'AUTH_SMOKE_SUMMARY {"locale":"en-US","verifyTokenMode":true,"checkedNegativeScenarios":["unauth_metrics_401","forbidden_metrics_403","invalid_refresh_401","token_mode_unauth_protected_401"],"checkedLeadConversion":{"success201":true,"duplicateConflict409":true,"invalidPayload400":true,"invalidPayloadErrorsArray":true}}';

  const parsed = parseSmokeSummaryLine(line, 'AUTH_SMOKE_SUMMARY');

  assert.ok(parsed);
  assert.ok(parsed.checkedNegativeScenarios.includes(REQUIRED_AUTH_NEGATIVE_SCENARIO_TOKEN_MODE));
  assert.doesNotThrow(() => assertAuthSmokeSummaryContract(parsed));
});

test('Auth smoke summary contract rejects missing token-mode scenario when verifyTokenMode=true', () => {
  const line =
    'AUTH_SMOKE_SUMMARY {"locale":"en-US","verifyTokenMode":true,"checkedNegativeScenarios":["unauth_metrics_401","forbidden_metrics_403","invalid_refresh_401"],"checkedLeadConversion":{"success201":true,"duplicateConflict409":true,"invalidPayload400":true,"invalidPayloadErrorsArray":true}}';

  const parsed = parseSmokeSummaryLine(line, 'AUTH_SMOKE_SUMMARY');

  assert.ok(parsed);
  assert.throws(
    () => assertAuthSmokeSummaryContract(parsed),
    /missing token-mode scenario token_mode_unauth_protected_401/
  );
});

test('Auth smoke summary contract rejects missing checkedLeadConversion block', () => {
  const line =
    'AUTH_SMOKE_SUMMARY {"locale":"es-MX","verifyTokenMode":false,"checkedNegativeScenarios":["unauth_metrics_401","forbidden_metrics_403","invalid_refresh_401"]}';

  const parsed = parseSmokeSummaryLine(line, 'AUTH_SMOKE_SUMMARY');

  assert.ok(parsed);
  assert.throws(
    () => assertAuthSmokeSummaryContract(parsed),
    /checkedLeadConversion must be an object/
  );
});

test('Auth smoke summary contract rejects missing invalidPayload400 flag', () => {
  const line =
    'AUTH_SMOKE_SUMMARY {"locale":"es-MX","verifyTokenMode":false,"checkedNegativeScenarios":["unauth_metrics_401","forbidden_metrics_403","invalid_refresh_401"],"checkedLeadConversion":{"success201":true,"duplicateConflict409":true,"invalidPayloadErrorsArray":true}}';

  const parsed = parseSmokeSummaryLine(line, 'AUTH_SMOKE_SUMMARY');

  assert.ok(parsed);
  assert.throws(
    () => assertAuthSmokeSummaryContract(parsed),
    /checkedLeadConversion.invalidPayload400 must be true/
  );
});

test('Auth smoke summary contract rejects missing invalidPayloadErrorsArray flag', () => {
  const line =
    'AUTH_SMOKE_SUMMARY {"locale":"es-MX","verifyTokenMode":false,"checkedNegativeScenarios":["unauth_metrics_401","forbidden_metrics_403","invalid_refresh_401"],"checkedLeadConversion":{"success201":true,"duplicateConflict409":true,"invalidPayload400":true}}';

  const parsed = parseSmokeSummaryLine(line, 'AUTH_SMOKE_SUMMARY');

  assert.ok(parsed);
  assert.throws(
    () => assertAuthSmokeSummaryContract(parsed),
    /checkedLeadConversion.invalidPayloadErrorsArray must be true/
  );
});

test('AI render smoke summary contract includes required checks for matrix consumers', () => {
  const line =
    'AI_RENDER_SMOKE_SUMMARY {"authMode":"header","locale":"es-MX","checks":["unauthorized_401","method_not_allowed_405_web","method_not_allowed_405_pdf","forbidden_external_403","render_schema_options_contract","invalid_render_options_400_web","invalid_render_options_400_pdf","web_render_200_html","pdf_render_200_pdf"]}';

  const parsed = parseSmokeSummaryLine(line, 'AI_RENDER_SMOKE_SUMMARY');

  assert.ok(parsed);
  assert.equal(parsed.authMode, 'header');
  assert.equal(parsed.locale, 'es-MX');
  assert.ok(Array.isArray(parsed.checks));

  assert.doesNotThrow(() => assertAiRenderSmokeSummaryContract(parsed));

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
  assert.throws(
    () => assertAiRenderSmokeSummaryContract(parsed),
    /missing required check invalid_render_options_400_pdf/
  );
});

test('AI schema smoke summary contract accepts required fields and order', () => {
  const line =
    'AI_SCHEMA_SMOKE_SUMMARY {"authMode":"header","locale":"es-MX","schemaVersion":"ai-proposal.v1","warningsCatalogCount":4,"sectionOrder":["storyteller","auditor","ghost_writer","local_insider"]}';

  const parsed = parseSmokeSummaryLine(line, 'AI_SCHEMA_SMOKE_SUMMARY');

  assert.ok(parsed);
  assert.equal(parsed.schemaVersion, REQUIRED_AI_SCHEMA_VERSION);
  assert.equal(parsed.warningsCatalogCount, 4);
  assert.deepEqual(parsed.sectionOrder, REQUIRED_AI_SCHEMA_SECTION_ORDER);
  assert.doesNotThrow(() => assertAiSchemaSmokeSummaryContract(parsed));
});

test('AI schema smoke summary contract rejects invalid section order', () => {
  const line =
    'AI_SCHEMA_SMOKE_SUMMARY {"authMode":"token","locale":"en-US","schemaVersion":"ai-proposal.v1","warningsCatalogCount":4,"sectionOrder":["storyteller","ghost_writer","auditor","local_insider"]}';

  const parsed = parseSmokeSummaryLine(line, 'AI_SCHEMA_SMOKE_SUMMARY');

  assert.ok(parsed);
  assert.throws(
    () => assertAiSchemaSmokeSummaryContract(parsed),
    /sectionOrder mismatch at index 1/
  );
});

test('AI schema smoke summary contract rejects invalid schema version', () => {
  const line =
    'AI_SCHEMA_SMOKE_SUMMARY {"authMode":"header","locale":"es-MX","schemaVersion":"ai-proposal.v2","warningsCatalogCount":4,"sectionOrder":["storyteller","auditor","ghost_writer","local_insider"]}';

  const parsed = parseSmokeSummaryLine(line, 'AI_SCHEMA_SMOKE_SUMMARY');

  assert.ok(parsed);
  assert.throws(
    () => assertAiSchemaSmokeSummaryContract(parsed),
    /schemaVersion must be ai-proposal.v1/
  );
});