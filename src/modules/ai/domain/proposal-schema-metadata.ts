import { PROMPT_PROFILE } from './prompt-profile';
import type { SupportedLocale } from '../../../core/i18n/supported-locales';

type SchemaLocale = 'es-MX' | 'en-US';

function normalizeLocale(locale: SupportedLocale): SchemaLocale {
  return locale === 'en-US' ? 'en-US' : 'es-MX';
}

function warningDescriptionsByLocale(locale: SchemaLocale) {
  if (locale === 'es-MX') {
    return {
      SUMMARY_TOO_SHORT: 'El resumen del itinerario tiene bajo nivel de detalle para generar la propuesta.',
      DESTINATION_NOT_REFERENCED: 'El resumen no menciona explícitamente el destino.',
      DAY_BY_DAY_MISSING: 'Itinerarios largos deben incluir desglose por día.',
      QUALITY_GATE_BLOCKER: 'El resumen no cumple el umbral estricto de calidad para itinerarios largos.'
    };
  }

  return {
    SUMMARY_TOO_SHORT: 'Itinerary summary has low detail density for proposal generation.',
    DESTINATION_NOT_REFERENCED: 'Summary does not explicitly mention the destination.',
    DAY_BY_DAY_MISSING: 'Long itineraries should include day-by-day detail.',
    QUALITY_GATE_BLOCKER: 'Summary does not pass strict quality threshold for long itineraries.'
  };
}

function buildWarningsCatalog(locale: SchemaLocale) {
  const warningDescriptions = warningDescriptionsByLocale(locale);

  return [
    {
      code: 'SUMMARY_TOO_SHORT',
      severity: 'medium',
      description: warningDescriptions.SUMMARY_TOO_SHORT
    },
    {
      code: 'DESTINATION_NOT_REFERENCED',
      severity: 'low',
      description: warningDescriptions.DESTINATION_NOT_REFERENCED
    },
    {
      code: 'DAY_BY_DAY_MISSING',
      severity: 'medium',
      description: warningDescriptions.DAY_BY_DAY_MISSING
    },
    {
      code: 'QUALITY_GATE_BLOCKER',
      severity: 'high',
      description: warningDescriptions.QUALITY_GATE_BLOCKER
    }
  ] as const;
}

function localizedSummary(locale: SchemaLocale): string {
  if (locale === 'es-MX') {
    return 'Día 1 llegada y recorrido cultural. Día 2 gastronomía local y cierre de experiencia en Oaxaca.';
  }

  return 'Day 1 arrival and cultural tour. Day 2 local gastronomy and experience close in Oaxaca.';
}

function blockedMessage(locale: SchemaLocale): string {
  return locale === 'es-MX' ? 'Propuesta bloqueada por quality gate' : 'Proposal blocked by quality gate';
}

function buildExamples(locale: SchemaLocale) {
  return {
    request: {
      promptProfile: 'storyteller',
      itinerarySummary: localizedSummary(locale),
      destination: 'Oaxaca',
      days: 4,
      enforceQualityGate: false
    },
    successResponse: {
      statusCode: 200,
      body: {
        data: {
          schemaVersion: 'ai-proposal.v1',
          profile: 'storyteller',
          qualityChecksCount: 3,
          warningsCount: 0,
          sectionOrder: ['storyteller', 'auditor', 'ghost_writer', 'local_insider']
        }
      }
    },
    blockedResponse: {
      statusCode: 422,
      body: {
        message: blockedMessage(locale),
        blockingWarningCode: 'QUALITY_GATE_BLOCKER'
      }
    }
  };
}

export function buildAiProposalSchemaMetadata(locale: SupportedLocale = 'es-MX') {
  const normalizedLocale = normalizeLocale(locale);

  return {
    schemaVersion: 'ai-proposal.v1' as const,
    endpoint: '/ai/proposal',
    method: 'POST' as const,
    requiredFields: ['promptProfile', 'itinerarySummary', 'destination', 'days'] as const,
    optionalFields: ['enforceQualityGate'] as const,
    profiles: PROMPT_PROFILE,
    warningsCatalog: buildWarningsCatalog(normalizedLocale),
    qualityGate: {
      inputField: 'enforceQualityGate',
      blockOnSeverity: 'high' as const,
      blockedStatusCode: 422
    },
    sectionOrder: ['storyteller', 'auditor', 'ghost_writer', 'local_insider'] as const,
    examples: buildExamples(normalizedLocale)
  };
}