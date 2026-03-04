import type { AiProposalResponse } from '../api/proposal-contracts';

type ProposalData = AiProposalResponse['data'];

type RenderLabels = {
  previewTitle: string;
  draftTitle: string;
  schema: string;
  generated: string;
  profile: string;
  narrative: string;
  headline: string;
  callToAction: string;
  warnings: string;
  noWarnings: string;
  qualityChecks: string;
  localTips: string;
  checksTitle: string;
  warningsTitle: string;
};

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

function labelsByLocale(locale: string): RenderLabels {
  if (locale === 'en-US') {
    return {
      previewTitle: 'Proposal preview',
      draftTitle: 'Mis Viajes CRM - Proposal Draft',
      schema: 'Schema',
      generated: 'Generated',
      profile: 'Profile',
      narrative: 'Narrative',
      headline: 'Headline',
      callToAction: 'CTA',
      warnings: 'Warnings',
      noWarnings: 'None',
      qualityChecks: 'Quality checks',
      localTips: 'Local tips',
      checksTitle: 'Checks',
      warningsTitle: 'Quality warnings'
    };
  }

  return {
    previewTitle: 'Vista previa de propuesta',
    draftTitle: 'Mis Viajes CRM - Borrador de propuesta',
    schema: 'Esquema',
    generated: 'Generado',
    profile: 'Perfil',
    narrative: 'Narrativa',
    headline: 'Titular',
    callToAction: 'Llamado a la acción',
    warnings: 'Alertas',
    noWarnings: 'Ninguna',
    qualityChecks: 'Validaciones de calidad',
    localTips: 'Tips locales',
    checksTitle: 'Validaciones',
    warningsTitle: 'Alertas de calidad'
  };
}

function proposalLines(proposal: ProposalData, locale: string): string[] {
  const labels = labelsByLocale(locale);
  const warningsLabel = proposal.warnings.length === 0 ? labels.noWarnings : proposal.warnings.length.toString();
  const checklist = proposal.qualityChecks.join(' | ');
  const tips = proposal.sections.local_insider.localTips.join(' | ');

  return [
    labels.draftTitle,
    `${labels.generated}: ${proposal.generatedAt}`,
    `${labels.profile}: ${proposal.profile}`,
    `${labels.schema}: ${proposal.schemaVersion}`,
    `${labels.narrative}: ${proposal.narrative}`,
    `${labels.headline}: ${proposal.sections.ghost_writer.headline}`,
    `${labels.callToAction}: ${proposal.sections.ghost_writer.callToAction}`,
    `${labels.warnings}: ${warningsLabel}`,
    `${labels.qualityChecks}: ${checklist}`,
    `${labels.localTips}: ${tips}`
  ];
}

export function renderProposalHtml(proposal: ProposalData, locale: string): string {
  const labels = labelsByLocale(locale);

  const warningsItems =
    proposal.warnings.length === 0
      ? `<li>${escapeHtml(labels.noWarnings)}</li>`
      : proposal.warnings
          .map((warning) => `<li>[${escapeHtml(warning.severity)}] ${escapeHtml(warning.message)}</li>`)
          .join('');

  const checksItems = proposal.qualityChecks.map((check) => `<li>${escapeHtml(check)}</li>`).join('');

  return `<!doctype html>
<html lang="${locale}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(labels.previewTitle)}</title>
  </head>
  <body>
    <main>
      <h1>${escapeHtml(labels.previewTitle)}</h1>
      <p><strong>${escapeHtml(labels.schema)}:</strong> ${escapeHtml(proposal.schemaVersion)}</p>
      <p><strong>${escapeHtml(labels.generated)}:</strong> ${escapeHtml(proposal.generatedAt)}</p>
      <p><strong>${escapeHtml(labels.profile)}:</strong> ${escapeHtml(proposal.profile)}</p>
      <h2>${escapeHtml(proposal.sections.ghost_writer.headline)}</h2>
      <p>${escapeHtml(proposal.narrative)}</p>
      <p>${escapeHtml(proposal.sections.ghost_writer.callToAction)}</p>
      <section>
        <h3>${escapeHtml(labels.checksTitle)}</h3>
        <ul>${checksItems}</ul>
      </section>
      <section>
        <h3>${escapeHtml(labels.warningsTitle)}</h3>
        <ul>${warningsItems}</ul>
      </section>
    </main>
  </body>
</html>`;
}

export function renderProposalPdfDraft(proposal: ProposalData, locale = 'es-MX'): Buffer {
  const lines = proposalLines(proposal, locale).slice(0, 18);
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