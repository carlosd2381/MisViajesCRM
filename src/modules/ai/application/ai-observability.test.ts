import test from 'node:test';
import assert from 'node:assert/strict';
import { AiObservability } from './ai-observability';

test('ai observability aggregates metrics by operation and totals', () => {
  const observability = new AiObservability();

  observability.record({ operation: 'proposal', statusCode: 200, durationMs: 120, estimatedTokens: 500, estimatedCostUsd: 0.0015, provider: 'azure-openai' });
  observability.record({ operation: 'proposal', statusCode: 422, durationMs: 80, estimatedTokens: 450, estimatedCostUsd: 0.0012, provider: 'azure-openai' });
  observability.record({ operation: 'schema', statusCode: 200, durationMs: 20, provider: 'azure-openai' });

  const snapshot = observability.snapshot();

  assert.equal(snapshot.provider, 'azure-openai');
  assert.equal(snapshot.totals.requests, 3);
  assert.equal(snapshot.totals.errors, 1);
  assert.equal(snapshot.totals.blockedByQualityGate, 1);
  assert.equal(snapshot.byOperation.proposal.count, 2);
  assert.equal(snapshot.byOperation.proposal.blockedByQualityGate, 1);
  assert.equal(snapshot.byOperation.schema.count, 1);
  assert.equal(snapshot.totals.totalEstimatedTokens, 950);
  assert.ok(snapshot.totals.totalEstimatedCostUsd > 0);
});
