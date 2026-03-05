import test from 'node:test';
import assert from 'node:assert/strict';
import { applyTimestampRangeFilters } from './pg-filter-builders';

test('applyTimestampRangeFilters adds from and to predicates in order', () => {
  const filters: string[] = ['base = $1'];
  const params: unknown[] = ['abc'];

  applyTimestampRangeFilters({
    filters,
    params,
    column: 'event_at',
    from: '2026-03-01T00:00:00.000Z',
    to: '2026-03-31T23:59:59.000Z'
  });

  assert.deepEqual(filters, ['base = $1', 'event_at >= $2::timestamptz', 'event_at <= $3::timestamptz']);
  assert.deepEqual(params, ['abc', '2026-03-01T00:00:00.000Z', '2026-03-31T23:59:59.000Z']);
});

test('applyTimestampRangeFilters adds no predicates when range is undefined', () => {
  const filters: string[] = ['base = $1'];
  const params: unknown[] = ['abc'];

  applyTimestampRangeFilters({
    filters,
    params,
    column: 'event_at'
  });

  assert.deepEqual(filters, ['base = $1']);
  assert.deepEqual(params, ['abc']);
});
