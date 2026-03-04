import type { SupportedLocale } from '../../../core/i18n/supported-locales';

type SchemaLocale = 'es-MX' | 'en-US';

function normalizeLocale(locale: SupportedLocale): SchemaLocale {
  return locale === 'en-US' ? 'en-US' : 'es-MX';
}

function localizedLabels(locale: SchemaLocale) {
  if (locale === 'en-US') {
    return {
      webDescription: 'HTML preview generated from ai-proposal.v1 contract payload.',
      pdfDescription: 'Lightweight PDF draft generated from ai-proposal.v1 contract payload.',
      webSuccessMessage: 'Proposal preview rendered',
      pdfSuccessMessage: 'Proposal PDF draft rendered'
    };
  }

  return {
    webDescription: 'Vista previa HTML generada a partir del contrato ai-proposal.v1.',
    pdfDescription: 'Borrador PDF ligero generado a partir del contrato ai-proposal.v1.',
    webSuccessMessage: 'Vista previa de propuesta renderizada',
    pdfSuccessMessage: 'Borrador PDF de propuesta renderizado'
  };
}

export function buildAiProposalRenderSchemaMetadata(locale: SupportedLocale = 'es-MX') {
  const schemaLocale = normalizeLocale(locale);
  const labels = localizedLabels(schemaLocale);

  return {
    schemaVersion: 'ai-proposal-render.v1' as const,
    sourceSchemaVersion: 'ai-proposal.v1' as const,
    endpoints: buildRenderEndpoints(labels),
    requestContractRef: '/ai/schema/proposal',
    examples: buildRenderExamples(schemaLocale, labels)
  };
}

function buildRenderEndpoints(labels: ReturnType<typeof localizedLabels>) {
  const renderOptions = {
    supported: ['includeWarnings', 'compactMode'] as const,
    defaults: {
      includeWarnings: true,
      compactMode: false
    }
  };

  return {
    web: {
      path: '/ai/proposal/render/web',
      method: 'POST' as const,
      contentType: 'text/html; charset=utf-8',
      description: labels.webDescription,
      renderOptions
    },
    pdf: {
      path: '/ai/proposal/render/pdf',
      method: 'POST' as const,
      contentType: 'application/pdf',
      description: labels.pdfDescription,
      renderOptions
    }
  };
}

function buildRenderExamples(schemaLocale: SchemaLocale, labels: ReturnType<typeof localizedLabels>) {
  return {
    request: {
      promptProfile: 'storyteller',
      itinerarySummary:
        schemaLocale === 'es-MX'
          ? 'Día 1 llegada a Oaxaca y recorrido cultural. Día 2 gastronomía local.'
          : 'Day 1 arrival in Oaxaca and cultural walk. Day 2 local gastronomy.',
      destination: 'Oaxaca',
      days: 2,
      enforceQualityGate: false,
      renderOptions: {
        includeWarnings: true,
        compactMode: false
      }
    },
    webResponse: {
      statusCode: 200,
      contentType: 'text/html; charset=utf-8',
      message: labels.webSuccessMessage
    },
    pdfResponse: {
      statusCode: 200,
      contentType: 'application/pdf',
      message: labels.pdfSuccessMessage
    }
  };
}
