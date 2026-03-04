import { PROMPT_PROFILE } from './prompt-profile';
import type { SupportedLocale } from '../../../core/i18n/supported-locales';

export function buildAiProposalSchemaMetadata(locale: SupportedLocale = 'es-MX') {
  const warningDescriptions =
    locale === 'es-MX'
      ? {
          SUMMARY_TOO_SHORT: 'El resumen del itinerario tiene bajo nivel de detalle para generar la propuesta.',
          DESTINATION_NOT_REFERENCED: 'El resumen no menciona explícitamente el destino.',
          DAY_BY_DAY_MISSING: 'Itinerarios largos deben incluir desglose por día.',
          QUALITY_GATE_BLOCKER: 'El resumen no cumple el umbral estricto de calidad para itinerarios largos.'
        }
      : {
          SUMMARY_TOO_SHORT: 'Itinerary summary has low detail density for proposal generation.',
          DESTINATION_NOT_REFERENCED: 'Summary does not explicitly mention the destination.',
          DAY_BY_DAY_MISSING: 'Long itineraries should include day-by-day detail.',
          QUALITY_GATE_BLOCKER: 'Summary does not pass strict quality threshold for long itineraries.'
        };

  return {
    schemaVersion: 'ai-proposal.v1' as const,
    endpoint: '/ai/proposal',
    method: 'POST' as const,
    requiredFields: ['promptProfile', 'itinerarySummary', 'destination', 'days'] as const,
    optionalFields: ['enforceQualityGate'] as const,
    profiles: PROMPT_PROFILE,
    warningsCatalog: [
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
    ] as const,
    qualityGate: {
      inputField: 'enforceQualityGate',
      blockOnSeverity: 'high' as const,
      blockedStatusCode: 422
    },
    sectionOrder: ['storyteller', 'auditor', 'ghost_writer', 'local_insider'] as const
  };
}