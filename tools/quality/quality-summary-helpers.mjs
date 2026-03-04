export const QUALITY_HELPER_TESTS_SUMMARY_PREFIX = 'QUALITY_HELPER_TESTS_SUMMARY';

export function formatQualitySummaryLine(prefix, summary) {
  return `${prefix} ${JSON.stringify(summary)}`;
}

export function parseQualitySummaryLine(line, prefix) {
  const expectedStart = `${prefix} `;
  if (!line.startsWith(expectedStart)) return null;

  const payload = line.slice(expectedStart.length).trim();
  try {
    return JSON.parse(payload);
  } catch {
    throw new Error(`Invalid JSON payload for ${prefix}`);
  }
}
