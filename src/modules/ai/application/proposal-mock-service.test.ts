import test from 'node:test';
import assert from 'node:assert/strict';
import { generateMockProposal } from './proposal-mock-service';

test('generateMockProposal returns warnings for short summary and missing destination', () => {
  const result = generateMockProposal({
    promptProfile: 'auditor',
    itinerarySummary: 'Plan general con actividades y traslados.',
    destination: 'Oaxaca',
    days: 3
  }, 'es-MX');

  assert.ok(result.warnings.length >= 2);
  assert.ok(result.warnings.some((warning) => warning.code === 'SUMMARY_TOO_SHORT'));
  assert.ok(result.warnings.some((warning) => warning.code === 'DESTINATION_NOT_REFERENCED'));
});

test('generateMockProposal emits long-trip warning when day breakdown is missing', () => {
  const result = generateMockProposal({
    promptProfile: 'storyteller',
    itinerarySummary: 'Oaxaca cultural con visitas, gastronomía y experiencias locales extendidas.',
    destination: 'Oaxaca',
    days: 8
  }, 'es-MX');

  assert.ok(result.warnings.some((warning) => warning.code === 'DAY_BY_DAY_MISSING'));
});

test('generateMockProposal can return no warnings for complete summary', () => {
  const result = generateMockProposal({
    promptProfile: 'ghost_writer',
    itinerarySummary:
      'Día 1 llegada a Oaxaca y recorrido histórico. Día 2 mercados y gastronomía en Oaxaca con actividades guiadas.',
    destination: 'Oaxaca',
    days: 2
  }, 'es-MX');

  assert.equal(result.warnings.length, 0);
});
