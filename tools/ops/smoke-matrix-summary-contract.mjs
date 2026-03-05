export const REQUIRED_AI_RENDER_CHECKS = [
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

export const REQUIRED_AI_SCHEMA_SECTION_ORDER = [
  'storyteller',
  'auditor',
  'ghost_writer',
  'local_insider'
];

export const REQUIRED_AI_SCHEMA_VERSION = 'ai-proposal.v1';

export const REQUIRED_AUTH_NEGATIVE_SCENARIOS_BASE = [
  'unauth_metrics_401',
  'forbidden_metrics_403',
  'invalid_refresh_401'
];

export const REQUIRED_AUTH_NEGATIVE_SCENARIO_TOKEN_MODE = 'token_mode_unauth_protected_401';

export function assertAiRenderSmokeSummaryContract(summary) {
  if (!summary || typeof summary !== 'object') {
    throw new Error('AI_RENDER_SMOKE_SUMMARY contract invalid: summary must be an object');
  }

  if (!Array.isArray(summary.checks)) {
    throw new Error('AI_RENDER_SMOKE_SUMMARY contract invalid: checks must be an array');
  }

  for (const requiredCheck of REQUIRED_AI_RENDER_CHECKS) {
    if (!summary.checks.includes(requiredCheck)) {
      throw new Error(`AI_RENDER_SMOKE_SUMMARY contract invalid: missing required check ${requiredCheck}`);
    }
  }
}

export function assertAiSchemaSmokeSummaryContract(summary) {
  if (!summary || typeof summary !== 'object') {
    throw new Error('AI_SCHEMA_SMOKE_SUMMARY contract invalid: summary must be an object');
  }

  if (summary.schemaVersion !== REQUIRED_AI_SCHEMA_VERSION) {
    throw new Error(
      `AI_SCHEMA_SMOKE_SUMMARY contract invalid: schemaVersion must be ${REQUIRED_AI_SCHEMA_VERSION}`
    );
  }

  if (!Number.isInteger(summary.warningsCatalogCount) || summary.warningsCatalogCount < 1) {
    throw new Error('AI_SCHEMA_SMOKE_SUMMARY contract invalid: warningsCatalogCount must be a positive integer');
  }

  if (!Array.isArray(summary.sectionOrder)) {
    throw new Error('AI_SCHEMA_SMOKE_SUMMARY contract invalid: sectionOrder must be an array');
  }

  if (summary.sectionOrder.length !== REQUIRED_AI_SCHEMA_SECTION_ORDER.length) {
    throw new Error(
      `AI_SCHEMA_SMOKE_SUMMARY contract invalid: sectionOrder length must be ${REQUIRED_AI_SCHEMA_SECTION_ORDER.length}`
    );
  }

  for (let index = 0; index < REQUIRED_AI_SCHEMA_SECTION_ORDER.length; index += 1) {
    const expected = REQUIRED_AI_SCHEMA_SECTION_ORDER[index];
    const actual = summary.sectionOrder[index];
    if (actual !== expected) {
      throw new Error(
        `AI_SCHEMA_SMOKE_SUMMARY contract invalid: sectionOrder mismatch at index ${index}; expected ${expected}, got ${actual}`
      );
    }
  }
}

export function assertAuthSmokeSummaryContract(summary) {
  if (!summary || typeof summary !== 'object') {
    throw new Error('AUTH_SMOKE_SUMMARY contract invalid: summary must be an object');
  }

  if (summary.locale !== 'es-MX' && summary.locale !== 'en-US') {
    throw new Error('AUTH_SMOKE_SUMMARY contract invalid: locale must be es-MX or en-US');
  }

  if (typeof summary.verifyTokenMode !== 'boolean') {
    throw new Error('AUTH_SMOKE_SUMMARY contract invalid: verifyTokenMode must be boolean');
  }

  if (!Array.isArray(summary.checkedNegativeScenarios)) {
    throw new Error('AUTH_SMOKE_SUMMARY contract invalid: checkedNegativeScenarios must be an array');
  }

  for (const requiredScenario of REQUIRED_AUTH_NEGATIVE_SCENARIOS_BASE) {
    if (!summary.checkedNegativeScenarios.includes(requiredScenario)) {
      throw new Error(
        `AUTH_SMOKE_SUMMARY contract invalid: missing required negative scenario ${requiredScenario}`
      );
    }
  }

  if (
    summary.verifyTokenMode === true
    && !summary.checkedNegativeScenarios.includes(REQUIRED_AUTH_NEGATIVE_SCENARIO_TOKEN_MODE)
  ) {
    throw new Error(
      `AUTH_SMOKE_SUMMARY contract invalid: missing token-mode scenario ${REQUIRED_AUTH_NEGATIVE_SCENARIO_TOKEN_MODE}`
    );
  }

  if (!summary.checkedLeadConversion || typeof summary.checkedLeadConversion !== 'object') {
    throw new Error('AUTH_SMOKE_SUMMARY contract invalid: checkedLeadConversion must be an object');
  }

  if (summary.checkedLeadConversion.success201 !== true) {
    throw new Error('AUTH_SMOKE_SUMMARY contract invalid: checkedLeadConversion.success201 must be true');
  }

  if (summary.checkedLeadConversion.duplicateConflict409 !== true) {
    throw new Error('AUTH_SMOKE_SUMMARY contract invalid: checkedLeadConversion.duplicateConflict409 must be true');
  }

  if (summary.checkedLeadConversion.invalidPayload400 !== true) {
    throw new Error('AUTH_SMOKE_SUMMARY contract invalid: checkedLeadConversion.invalidPayload400 must be true');
  }

  if (summary.checkedLeadConversion.invalidPayloadErrorsArray !== true) {
    throw new Error('AUTH_SMOKE_SUMMARY contract invalid: checkedLeadConversion.invalidPayloadErrorsArray must be true');
  }
}