import type { SupportedLocale } from '../../../core/i18n/supported-locales';
import type { CreateAiProposalRequest } from '../api/proposal-contracts';
import type { PromptProfile } from '../domain/prompt-profile';
import type { AiProfileSections, AiProposalWarning } from '../api/proposal-contracts';

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
  const sections = buildSections(input, locale);

  return {
    profile: input.promptProfile,
    narrative,
    qualityChecks,
    warnings,
    sections
  };
}

function buildSections(input: CreateAiProposalRequest, locale: SupportedLocale): AiProfileSections {
  const storytellerTripHook =
    locale === 'es-MX'
      ? `${input.destination} en ${input.days} días con enfoque emocional y ritmo equilibrado.`
      : `${input.destination} in ${input.days} days with emotional storytelling and balanced pacing.`;

  const storytellerDayNarrative =
    locale === 'es-MX'
      ? `Día 1 de conexión con ${input.destination}, seguido por experiencias locales y cierre memorable.`
      : `Day 1 introduces ${input.destination}, followed by local experiences and a memorable close.`;

  const checklist =
    locale === 'es-MX'
      ? ['Validar ventanas de traslado', 'Confirmar políticas de proveedor', 'Revisar hitos de pago']
      : ['Validate transfer windows', 'Confirm supplier policies', 'Review payment milestones'];

  const riskNotes =
    locale === 'es-MX'
      ? ['Posible saturación de agenda en días pico', 'Dependencia de disponibilidad de proveedor']
      : ['Possible schedule saturation on peak days', 'Dependency on supplier availability'];

  const headline =
    locale === 'es-MX'
      ? `Propuesta premium para ${input.destination}`
      : `Premium proposal for ${input.destination}`;

  const callToAction =
    locale === 'es-MX'
      ? 'Autoriza esta versión para emitir PDF y bloquear disponibilidad.'
      : 'Approve this version to issue PDF and lock availability.';

  const localTips =
    locale === 'es-MX'
      ? ['Reservar experiencias culinarias con anticipación', 'Priorizar traslados temprano en temporada alta']
      : ['Book culinary experiences in advance', 'Prioritize early transfers during high season'];

  const signatureExperience =
    locale === 'es-MX'
      ? `Experiencia distintiva sugerida en ${input.destination}: recorrido privado de identidad local.`
      : `Recommended signature experience in ${input.destination}: private local-identity tour.`;

  return {
    storyteller: {
      tripHook: storytellerTripHook,
      dayNarrative: storytellerDayNarrative
    },
    auditor: {
      operationalChecklist: checklist,
      riskNotes
    },
    ghost_writer: {
      headline,
      callToAction
    },
    local_insider: {
      localTips,
      signatureExperience
    }
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
