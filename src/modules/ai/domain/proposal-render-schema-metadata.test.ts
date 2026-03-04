import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAiProposalRenderSchemaMetadata } from './proposal-render-schema-metadata';

test('buildAiProposalRenderSchemaMetadata returns localized spanish descriptions', () => {
  const metadata = buildAiProposalRenderSchemaMetadata('es-MX');

  assert.equal(metadata.schemaVersion, 'ai-proposal-render.v1');
  assert.equal(metadata.sourceSchemaVersion, 'ai-proposal.v1');
  assert.equal(metadata.endpoints.web.path, '/ai/proposal/render/web');
  assert.equal(metadata.endpoints.pdf.path, '/ai/proposal/render/pdf');
  assert.match(metadata.endpoints.web.description, /Vista previa HTML/);
  assert.equal(metadata.examples.webResponse.contentType, 'text/html; charset=utf-8');
  assert.equal(metadata.examples.pdfResponse.contentType, 'application/pdf');
});

test('buildAiProposalRenderSchemaMetadata returns localized english descriptions', () => {
  const metadata = buildAiProposalRenderSchemaMetadata('en-US');

  assert.match(metadata.endpoints.web.description, /HTML preview/);
  assert.match(metadata.endpoints.pdf.description, /PDF draft/);
  assert.equal(metadata.examples.webResponse.message, 'Proposal preview rendered');
  assert.equal(metadata.examples.pdfResponse.message, 'Proposal PDF draft rendered');
});
