import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateCreateItineraryDay,
  validateCreateItineraryDayActivity,
  validateCreateItinerary,
  validateCreateItineraryItem,
  validateDestinationLibraryQuery,
  validatePortalApproveProposal,
  validatePortalRequestRevision,
  validatePipelineMove,
  validatePublishProposal,
  validateUpdateItineraryDay,
  validateUpdateItineraryDayActivity,
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

test('validatePipelineMove succeeds with valid status', () => {
  const result = validatePipelineMove({ toStatus: 'sent', notes: 'Enviar al cliente' });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.toStatus, 'sent');
  }
});

test('validatePipelineMove fails with invalid status', () => {
  const result = validatePipelineMove({ toStatus: 'in_review' });

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.ok(result.errors.includes('toStatus inválido'));
  }
});

test('validateCreateItineraryDay succeeds with required fields', () => {
  const result = validateCreateItineraryDay({ dayIndex: 1, title: 'Día 1' });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.dayIndex, 1);
  }
});

test('validateUpdateItineraryDay fails for invalid dayIndex', () => {
  const result = validateUpdateItineraryDay({ dayIndex: 0 });

  assert.equal(result.ok, false);
});

test('validateCreateItineraryDayActivity succeeds with required fields', () => {
  const result = validateCreateItineraryDayActivity({
    activityIndex: 1,
    title: 'Check-in hotel',
    category: 'hotel',
    priceNet: 100,
    priceGross: 130,
    optionalEnabled: true
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.category, 'hotel');
  }
});

test('validateUpdateItineraryDayActivity fails for invalid activityIndex', () => {
  const result = validateUpdateItineraryDayActivity({ activityIndex: 0 });

  assert.equal(result.ok, false);
});

test('validateDestinationLibraryQuery succeeds with defaults', () => {
  const query = new URLSearchParams();
  const result = validateDestinationLibraryQuery(query);

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.limit, 20);
  }
});

test('validateDestinationLibraryQuery fails for invalid category', () => {
  const query = new URLSearchParams({ category: 'museum' });
  const result = validateDestinationLibraryQuery(query);

  assert.equal(result.ok, false);
});

test('validatePublishProposal accepts optional expiresAt', () => {
  const result = validatePublishProposal({ expiresAt: '2026-04-01T00:00:00.000Z' });

  assert.equal(result.ok, true);
});

test('validatePortalApproveProposal accepts optional message', () => {
  const result = validatePortalApproveProposal({ message: 'Looks great' });

  assert.equal(result.ok, true);
});

test('validatePortalRequestRevision requires feedback', () => {
  const result = validatePortalRequestRevision({});

  assert.equal(result.ok, false);
});
