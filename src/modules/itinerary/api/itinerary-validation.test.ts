import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateCreateItinerary,
  validateCreateItineraryItem,
  validateUpdateItinerary
} from './itinerary-validation';

test('validateCreateItinerary succeeds with required fields', () => {
  const payload = {
    clientId: 'client_1',
    agentId: 'agent_1',
    title: 'Escapada Oaxaca',
    currency: 'MXN',
    grossTotal: 12000,
    netTotal: 10000
  };

  const result = validateCreateItinerary(payload);

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.title, 'Escapada Oaxaca');
  }
});

test('validateCreateItinerary fails with missing fields', () => {
  const payload = { title: 'Sin mínimos' };
  const result = validateCreateItinerary(payload);

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.ok(result.errors.length > 0);
  }
});

test('validateUpdateItinerary keeps only valid status values', () => {
  const payload = { status: 'invalid_status' };
  const result = validateUpdateItinerary(payload);

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.status, undefined);
  }
});

test('validateCreateItineraryItem succeeds with required fields', () => {
  const payload = {
    title: 'Vuelo CDMX-CUN',
    category: 'flight',
    quantity: 2,
    unitNet: 2500,
    unitGross: 3200
  };

  const result = validateCreateItineraryItem(payload);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.category, 'flight');
  }
});

test('validateCreateItineraryItem rejects invalid quantity', () => {
  const payload = {
    title: 'Hotel',
    category: 'hotel',
    quantity: 0,
    unitNet: 1000,
    unitGross: 1300
  };

  const result = validateCreateItineraryItem(payload);
  assert.equal(result.ok, false);
});
