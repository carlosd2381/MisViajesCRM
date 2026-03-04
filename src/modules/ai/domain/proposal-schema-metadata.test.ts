import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAiProposalSchemaMetadata } from './proposal-schema-metadata';

test('buildAiProposalSchemaMetadata returns spanish warning descriptions for es-MX', () => {
  const metadata = buildAiProposalSchemaMetadata('es-MX');
  const summaryWarning = metadata.warningsCatalog.find((warning) => warning.code === 'SUMMARY_TOO_SHORT');

  assert.equal(summaryWarning?.description.includes('resumen'), true);
  assert.equal(metadata.examples.request.promptProfile, 'storyteller');
  assert.equal(metadata.examples.successResponse.statusCode, 200);
  assert.equal(metadata.examples.blockedResponse.statusCode, 422);
  assert.equal(metadata.examples.blockedResponse.body.message, 'Propuesta bloqueada por quality gate');
});

test('buildAiProposalSchemaMetadata returns english warning descriptions for en-US', () => {
  const metadata = buildAiProposalSchemaMetadata('en-US');
  const summaryWarning = metadata.warningsCatalog.find((warning) => warning.code === 'SUMMARY_TOO_SHORT');

  assert.equal(summaryWarning?.description.includes('summary'), true);
  assert.equal(metadata.examples.blockedResponse.body.message, 'Proposal blocked by quality gate');
});
