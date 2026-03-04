import type { AiProposalResponse } from '../api/proposal-contracts';

type ProposalData = AiProposalResponse['data'];

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function escapePdfText(value: string): string {
  return value.replaceAll('\\', '\\\\').replaceAll('(', '\\(').replaceAll(')', '\\)');
}

function proposalLines(proposal: ProposalData): string[] {
  const warningsLabel = proposal.warnings.length === 0 ? 'None' : proposal.warnings.length.toString();
  const checklist = proposal.qualityChecks.join(' | ');
  const tips = proposal.sections.local_insider.localTips.join(' | ');

  return [
    'Mis Viajes CRM - Proposal Draft',
    `Generated: ${proposal.generatedAt}`,
    `Profile: ${proposal.profile}`,
    `Schema: ${proposal.schemaVersion}`,
    `Narrative: ${proposal.narrative}`,
    `Headline: ${proposal.sections.ghost_writer.headline}`,
    `CTA: ${proposal.sections.ghost_writer.callToAction}`,
    `Warnings: ${warningsLabel}`,
    `Quality checks: ${checklist}`,
    `Local tips: ${tips}`
  ];
}

export function renderProposalHtml(proposal: ProposalData, locale: string): string {
  const title = locale === 'es-MX' ? 'Vista previa de propuesta' : 'Proposal preview';
  const warningsTitle = locale === 'es-MX' ? 'Alertas de calidad' : 'Quality warnings';
  const checksTitle = locale === 'es-MX' ? 'Validaciones' : 'Checks';

  const warningsItems =
    proposal.warnings.length === 0
      ? `<li>${locale === 'es-MX' ? 'Sin alertas' : 'No warnings'}</li>`
      : proposal.warnings
          .map((warning) => `<li>[${escapeHtml(warning.severity)}] ${escapeHtml(warning.message)}</li>`)
          .join('');

  const checksItems = proposal.qualityChecks.map((check) => `<li>${escapeHtml(check)}</li>`).join('');

  return `<!doctype html>
<html lang="${locale}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body>
    <main>
      <h1>${escapeHtml(title)}</h1>
      <p><strong>Schema:</strong> ${escapeHtml(proposal.schemaVersion)}</p>
      <p><strong>Generated:</strong> ${escapeHtml(proposal.generatedAt)}</p>
      <p><strong>Profile:</strong> ${escapeHtml(proposal.profile)}</p>
      <h2>${escapeHtml(proposal.sections.ghost_writer.headline)}</h2>
      <p>${escapeHtml(proposal.narrative)}</p>
      <p>${escapeHtml(proposal.sections.ghost_writer.callToAction)}</p>
      <section>
        <h3>${escapeHtml(checksTitle)}</h3>
        <ul>${checksItems}</ul>
      </section>
      <section>
        <h3>${escapeHtml(warningsTitle)}</h3>
        <ul>${warningsItems}</ul>
      </section>
    </main>
  </body>
</html>`;
}

export function renderProposalPdfDraft(proposal: ProposalData): Buffer {
  const lines = proposalLines(proposal).slice(0, 18);
  const body = lines
    .map((line, index) => {
      const yOffset = index === 0 ? '' : '0 -16 Td\n';
      return `${yOffset}(${escapePdfText(line)}) Tj\n`;
    })
    .join('');

  const stream = `BT\n/F1 12 Tf\n50 780 Td\n${body}ET\n`;

  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n',
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
    `5 0 obj\n<< /Length ${Buffer.byteLength(stream, 'utf8')} >>\nstream\n${stream}endstream\nendobj\n`
  ];

  let output = '%PDF-1.4\n';
  const offsets: number[] = [0];

  for (const object of objects) {
    offsets.push(Buffer.byteLength(output, 'utf8'));
    output += object;
  }

  const xrefOffset = Buffer.byteLength(output, 'utf8');
  output += `xref\n0 ${objects.length + 1}\n`;
  output += '0000000000 65535 f \n';

  for (let index = 1; index <= objects.length; index += 1) {
    output += `${offsets[index].toString().padStart(10, '0')} 00000 n \n`;
  }

  output += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(output, 'utf8');
}