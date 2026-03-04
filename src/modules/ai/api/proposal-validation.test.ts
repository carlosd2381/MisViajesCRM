import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCreateAiProposal } from './proposal-validation';

test('validateCreateAiProposal succeeds with required fields', () => {
  const result = validateCreateAiProposal({
    promptProfile: 'storyteller',
    itinerarySummary: 'Llegada, city tour y cena de bienvenida',
    destination: 'Oaxaca',
    days: 4,
    enforceQualityGate: true
  });

  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.value.enforceQualityGate, true);
});

test('validateCreateAiProposal fails with invalid profile', () => {
  const result = validateCreateAiProposal({
    promptProfile: 'invalid_profile',
    itinerarySummary: 'Plan básico',
    destination: 'Oaxaca',
    days: 3
  });

  assert.equal(result.ok, false);
});

test('validateCreateAiProposal fails with invalid days', () => {
  const result = validateCreateAiProposal({
    promptProfile: 'auditor',
    itinerarySummary: 'Plan básico',
    destination: 'Oaxaca',
    days: 0
  });

  assert.equal(result.ok, false);
});

test('validateCreateAiProposal accepts optional renderOptions flags', () => {
  const result = validateCreateAiProposal({
    promptProfile: 'storyteller',
    itinerarySummary: 'Llegada, city tour y cena de bienvenida',
    destination: 'Oaxaca',
    days: 4,
    renderOptions: {
      includeWarnings: false,
      compactMode: true
    }
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.renderOptions?.includeWarnings, false);
    assert.equal(result.value.renderOptions?.compactMode, true);
  }
});

test('validateCreateAiProposal rejects invalid renderOptions payload', () => {
  const result = validateCreateAiProposal({
    promptProfile: 'storyteller',
    itinerarySummary: 'Llegada, city tour y cena de bienvenida',
    destination: 'Oaxaca',
    days: 4,
    renderOptions: {
      includeWarnings: 'false'
    }
  } as unknown as Record<string, unknown>);

  assert.equal(result.ok, false);
});
