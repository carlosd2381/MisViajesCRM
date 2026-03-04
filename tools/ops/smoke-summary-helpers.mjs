export function formatSmokeSummaryLine(prefix, summary) {
  return `${prefix} ${JSON.stringify(summary)}`;
}

export function parseSmokeSummaryLine(line, prefix) {
  const expectedStart = `${prefix} `;
  if (!line.startsWith(expectedStart)) return null;

  const payload = line.slice(expectedStart.length).trim();
  try {
    return JSON.parse(payload);
  } catch {
    throw new Error(`Invalid JSON payload for ${prefix}`);
  }
}
