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
  assert.equal(typeof result.sections.storyteller.tripHook, 'string');
  assert.ok(Array.isArray(result.sections.auditor.operationalChecklist));
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
  assert.equal(typeof result.sections.ghost_writer.headline, 'string');
  assert.equal(typeof result.sections.local_insider.signatureExperience, 'string');
});

test('generateMockProposal exposes all profile sections for downstream rendering', () => {
  const result = generateMockProposal({
    promptProfile: 'local_insider',
    itinerarySummary: 'Día 1 llegada a Oaxaca y experiencia gastronómica local con guía.',
    destination: 'Oaxaca',
    days: 1
  }, 'es-MX');

  assert.ok(result.sections.storyteller.dayNarrative.length > 0);
  assert.ok(result.sections.auditor.riskNotes.length > 0);
  assert.ok(result.sections.ghost_writer.callToAction.length > 0);
  assert.ok(result.sections.local_insider.localTips.length > 0);
});
