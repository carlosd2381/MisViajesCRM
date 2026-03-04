import test from 'node:test';
import assert from 'node:assert/strict';
import { RefreshTokenMetrics, type RefreshTokenMetricsSink } from './refresh-token-metrics';

class CaptureSink implements RefreshTokenMetricsSink {
  events: Array<{ operation: string; outcome: string; amount: number; total: number }> = [];

  onRecord(event: { operation: string; outcome: string; amount: number; total: number }): void {
    this.events.push(event);
  }
}

test('refresh metrics sends events to sinks', () => {
  const sink = new CaptureSink();
  const metrics = new RefreshTokenMetrics({ sinks: [sink] });

  metrics.record('issue', 'success', 2);

  assert.equal(sink.events.length, 1);
  assert.equal(sink.events[0]?.operation, 'issue');
  assert.equal(sink.events[0]?.outcome, 'success');
  assert.equal(sink.events[0]?.amount, 2);
  assert.equal(sink.events[0]?.total, 2);
});
