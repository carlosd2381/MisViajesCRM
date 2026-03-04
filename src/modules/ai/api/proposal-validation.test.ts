import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCreateAiProposal } from './proposal-validation';

test('validateCreateAiProposal succeeds with required fields', () => {
  const result = validateCreateAiProposal({
    promptProfile: 'storyteller',
    itinerarySummary: 'Llegada, city tour y cena de bienvenida',
    destination: 'Oaxaca',
    days: 4
  });

  assert.equal(result.ok, true);
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
