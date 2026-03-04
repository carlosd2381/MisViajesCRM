import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateCreateDashboardSnapshot,
  validateUpdateDashboardSnapshot
} from './dashboard-validation';

test('validateCreateDashboardSnapshot succeeds with required fields', () => {
  const result = validateCreateDashboardSnapshot({
    periodStart: '2026-03-01',
    periodEnd: '2026-03-31',
    leadsTotal: 100,
    leadsWon: 20,
    itinerariesAccepted: 14,
    commissionsPending: 5,
    commissionsPaid: 9,
    revenueMxn: 250000,
    profitMxn: 45000
  });

  assert.equal(result.ok, true);
});

test('validateCreateDashboardSnapshot fails on negative values', () => {
  const result = validateCreateDashboardSnapshot({
    periodStart: '2026-03-01',
    periodEnd: '2026-03-31',
    leadsTotal: -1,
    leadsWon: 20,
    itinerariesAccepted: 14,
    commissionsPending: 5,
    commissionsPaid: 9,
    revenueMxn: 250000,
    profitMxn: 45000
  });

  assert.equal(result.ok, false);
});

test('validateUpdateDashboardSnapshot rejects invalid fields', () => {
  const result = validateUpdateDashboardSnapshot({ leadsTotal: -3 });
  assert.equal(result.ok, false);
});
