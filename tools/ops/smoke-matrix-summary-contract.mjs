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