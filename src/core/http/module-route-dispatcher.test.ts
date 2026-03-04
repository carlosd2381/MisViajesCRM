import test from 'node:test';
import assert from 'node:assert/strict';
import { MODULE_ROUTE_DISPATCH_ORDER } from './module-route-dispatcher';

test('module route dispatch order contract remains stable', () => {
  assert.deepEqual(MODULE_ROUTE_DISPATCH_ORDER, [
    'leads',
    'clients',
    'suppliers',
    'commissions',
    'financials',
    'messaging',
    'dashboard',
    'management',
    'ai',
    'itineraries'
  ]);

  assert.equal(new Set(MODULE_ROUTE_DISPATCH_ORDER).size, MODULE_ROUTE_DISPATCH_ORDER.length);
});
