import test from 'node:test';
import assert from 'node:assert/strict';
import { generateMockProposal } from './proposal-mock-service';
import { renderProposalHtml, renderProposalPdfDraft } from './proposal-render-service';

function sampleProposal() {
  return generateMockProposal(
    {
      promptProfile: 'ghost_writer',
      itinerarySummary:
        'Día 1 llegada a Oaxaca y recorrido histórico. Día 2 mercados y gastronomía en Oaxaca con actividades guiadas.',
      destination: 'Oaxaca',
      days: 2
    },
    'es-MX'
  );
}

test('renderProposalHtml localizes structural labels for es-MX', () => {
  const proposal = sampleProposal();
  const html = renderProposalHtml(proposal, 'es-MX');

  assert.match(html, /Vista previa de propuesta/);
  assert.match(html, /<strong>Esquema:<\/strong>/);
  assert.match(html, /<strong>Generado:<\/strong>/);
  assert.match(html, /<strong>Perfil:<\/strong>/);
  assert.match(html, /<h3>Validaciones<\/h3>/);
  assert.match(html, /<h3>Alertas de calidad<\/h3>/);
});

test('renderProposalHtml localizes structural labels for en-US', () => {
  const proposal = sampleProposal();
  const html = renderProposalHtml(proposal, 'en-US');

  assert.match(html, /Proposal preview/);
  assert.match(html, /<strong>Schema:<\/strong>/);
  assert.match(html, /<strong>Generated:<\/strong>/);
  assert.match(html, /<strong>Profile:<\/strong>/);
  assert.match(html, /<h3>Checks<\/h3>/);
  assert.match(html, /<h3>Quality warnings<\/h3>/);
});

test('renderProposalPdfDraft localizes summary lines by locale', () => {
  const proposal = sampleProposal();

  const pdfEs = renderProposalPdfDraft(proposal, 'es-MX').toString('utf8');
  assert.match(pdfEs, /Borrador de propuesta/);
  assert.match(pdfEs, /Esquema:/);

  const pdfEn = renderProposalPdfDraft(proposal, 'en-US').toString('utf8');
  assert.match(pdfEn, /Proposal Draft/);
  assert.match(pdfEn, /Schema:/);
});

test('renderProposalHtml honors includeWarnings=false option', () => {
  const proposal = sampleProposal();
  const html = renderProposalHtml(proposal, 'es-MX', { includeWarnings: false });

  assert.doesNotMatch(html, /Alertas de calidad/);
});

test('renderProposalHtml honors compactMode=true option', () => {
  const proposal = sampleProposal();
  const html = renderProposalHtml(proposal, 'es-MX', { compactMode: true });

  assert.doesNotMatch(html, /<h3>Validaciones<\/h3>/);
});

test('renderProposalPdfDraft honors includeWarnings=false and compactMode=true options', () => {
  const proposal = sampleProposal();
  const pdf = renderProposalPdfDraft(proposal, 'es-MX', {
    includeWarnings: false,
    compactMode: true
  }).toString('utf8');

  assert.doesNotMatch(pdf, /Alertas:/);
  assert.doesNotMatch(pdf, /Validaciones de calidad:/);
  assert.doesNotMatch(pdf, /Tips locales:/);
});
