import type { SupportedLocale } from '../../../core/i18n/supported-locales';
import type { CreateAiProposalRequest } from '../api/proposal-contracts';
import type { PromptProfile } from '../domain/prompt-profile';
import type { AiProposalWarning } from '../api/proposal-contracts';

function prefixByProfile(profile: PromptProfile, locale: SupportedLocale): string {
  const es: Record<PromptProfile, string> = {
    storyteller: 'Narrativa de viaje',
    auditor: 'Revisión operativa',
    ghost_writer: 'Borrador comercial',
    local_insider: 'Recomendaciones locales'
  };

  const en: Record<PromptProfile, string> = {
    storyteller: 'Travel narrative',
    auditor: 'Operational review',
    ghost_writer: 'Sales draft',
    local_insider: 'Local recommendations'
  };

  return locale === 'es-MX' ? es[profile] : en[profile];
}

export function generateMockProposal(input: CreateAiProposalRequest, locale: SupportedLocale) {
  const prefix = prefixByProfile(input.promptProfile, locale);
  const narrative =
    locale === 'es-MX'
      ? `${prefix}: Itinerario de ${input.days} días para ${input.destination}. ${input.itinerarySummary}`
      : `${prefix}: ${input.days}-day itinerary for ${input.destination}. ${input.itinerarySummary}`;

  const qualityChecks =
    locale === 'es-MX'
      ? ['Fechas consistentes', 'Totales revisados', 'Tono de propuesta validado']
      : ['Date consistency checked', 'Totals reviewed', 'Proposal tone validated'];

  const warnings = buildWarnings(input, locale);

  return {
    profile: input.promptProfile,
    narrative,
    qualityChecks,
    warnings
  };
}

function buildWarnings(input: CreateAiProposalRequest, locale: SupportedLocale): AiProposalWarning[] {
  const warnings: AiProposalWarning[] = [];
  const normalizedSummary = input.itinerarySummary.toLowerCase();
  const normalizedDestination = input.destination.toLowerCase();

  if (input.itinerarySummary.length < 60) {
    warnings.push({
      code: 'SUMMARY_TOO_SHORT',
      severity: 'medium',
      message:
        locale === 'es-MX'
          ? 'El resumen es corto; agrega más detalle por día para mejorar la propuesta.'
          : 'The summary is short; add more day-by-day detail to improve the proposal.'
    });
  }

  if (!normalizedSummary.includes(normalizedDestination)) {
    warnings.push({
      code: 'DESTINATION_NOT_REFERENCED',
      severity: 'low',
      message:
        locale === 'es-MX'
          ? 'El resumen no menciona explícitamente el destino principal.'
          : 'The summary does not explicitly mention the main destination.'
    });
  }

  if (input.days >= 7 && !/(día|day)/i.test(input.itinerarySummary)) {
    warnings.push({
      code: 'DAY_BY_DAY_MISSING',
      severity: 'medium',
      message:
        locale === 'es-MX'
          ? 'Para viajes largos se recomienda incluir un desglose por día.'
          : 'For long trips, include a day-by-day breakdown.'
    });
  }

  return warnings;
}
