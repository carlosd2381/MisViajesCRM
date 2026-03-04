import type { SupportedLocale } from '../../../core/i18n/supported-locales';
import type { CreateAiProposalRequest } from '../api/proposal-contracts';
import type { PromptProfile } from '../domain/prompt-profile';

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

  return {
    profile: input.promptProfile,
    narrative,
    qualityChecks,
    warnings: [] as string[]
  };
}
