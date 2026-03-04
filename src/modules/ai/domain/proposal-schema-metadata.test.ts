import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAiProposalSchemaMetadata } from './proposal-schema-metadata';

test('buildAiProposalSchemaMetadata returns spanish warning descriptions for es-MX', () => {
  const metadata = buildAiProposalSchemaMetadata('es-MX');
  const summaryWarning = metadata.warningsCatalog.find((warning) => warning.code === 'SUMMARY_TOO_SHORT');

  assert.equal(summaryWarning?.description.includes('resumen'), true);
});

test('buildAiProposalSchemaMetadata returns english warning descriptions for en-US', () => {
  const metadata = buildAiProposalSchemaMetadata('en-US');
  const summaryWarning = metadata.warningsCatalog.find((warning) => warning.code === 'SUMMARY_TOO_SHORT');

  assert.equal(summaryWarning?.description.includes('summary'), true);
});
