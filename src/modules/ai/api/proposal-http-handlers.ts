import type { RequestContext } from '../../../core/http/http-types';
import { readJsonBody, sendJson } from '../../../core/http/http-utils';
import { resolveLocale } from '../../../core/i18n/resolve-locale';
import type { SupportedLocale } from '../../../core/i18n/supported-locales';
import { aiProposalObservability } from '../application/ai-observability';
import { generateMockProposal } from '../application/proposal-mock-service';
import { renderProposalHtml, renderProposalPdfDraft } from '../application/proposal-render-service';
import { buildAiProposalRenderSchemaMetadata } from '../domain/proposal-render-schema-metadata';
import { buildAiProposalSchemaMetadata } from '../domain/proposal-schema-metadata';
import { validateCreateAiProposal } from './proposal-validation';

export async function handleAiProposalSchema(context: RequestContext): Promise<void> {
  const startedAt = Date.now();
  if (context.req.method !== 'GET') {
    sendJson(context.res, 405, { message: messageByLocale(context.locale, 'Método no permitido') });
    trackAiOperation('schema', context, startedAt);
    return;
  }

  const requestedLocale = new URL(context.req.url ?? '/', 'http://localhost').searchParams.get('locale');
  const schemaLocale = resolveLocale(requestedLocale ?? context.locale);
  const data = buildAiProposalSchemaMetadata(schemaLocale);
  sendJson(context.res, 200, { data, message: messageByLocale(context.locale, 'Esquema AI disponible') });
  trackAiOperation('schema', context, startedAt);
}

export async function handleAiProposalCollection(context: RequestContext): Promise<void> {
  const startedAt = Date.now();

  if (context.req.method !== 'POST') {
    sendJson(context.res, 405, { message: messageByLocale(context.locale, 'Método no permitido') });
    trackAiOperation('proposal', context, startedAt);
    return;
  }

  const result = await buildProposalOrRespondError(context);
  const data = result?.data;
  if (!data) {
    trackAiOperation('proposal', context, startedAt);
    return;
  }

  sendJson(context.res, 200, { data, message: messageByLocale(context.locale, 'Propuesta AI generada (mock)') });
  trackAiOperation('proposal', context, startedAt, result.estimation);
}

export async function handleAiProposalRenderSchema(context: RequestContext): Promise<void> {
  const startedAt = Date.now();
  if (context.req.method !== 'GET') {
    sendJson(context.res, 405, { message: messageByLocale(context.locale, 'Método no permitido') });
    trackAiOperation('render_schema', context, startedAt);
    return;
  }

  const requestedLocale = new URL(context.req.url ?? '/', 'http://localhost').searchParams.get('locale');
  const schemaLocale = resolveLocale(requestedLocale ?? context.locale);
  const data = buildAiProposalRenderSchemaMetadata(schemaLocale);
  sendJson(context.res, 200, { data, message: messageByLocale(context.locale, 'Esquema de render AI disponible') });
  trackAiOperation('render_schema', context, startedAt);
}

export async function handleAiProposalWebRender(context: RequestContext): Promise<void> {
  const startedAt = Date.now();
  if (context.req.method !== 'POST') {
    sendJson(context.res, 405, { message: messageByLocale(context.locale, 'Método no permitido') });
    trackAiOperation('render_web', context, startedAt);
    return;
  }

  const payload = await readJsonBody(context.req);
  const validation = validateCreateAiProposal(payload);
  if (!validation.ok) {
    sendJson(context.res, 400, { message: messageByLocale(context.locale, 'Solicitud inválida'), errors: validation.errors });
    return;
  }

  const result = await buildProposalOrRespondError(context, validation);
  const data = result?.data;
  if (!data) {
    trackAiOperation('render_web', context, startedAt);
    return;
  }

  const html = renderProposalHtml(data, context.locale, validation.value.renderOptions);
  context.res.statusCode = 200;
  context.res.setHeader('Content-Type', 'text/html; charset=utf-8');
  context.res.end(html);
  trackAiOperation('render_web', context, startedAt, result?.estimation);
}

export async function handleAiProposalPdfDraft(context: RequestContext): Promise<void> {
  const startedAt = Date.now();
  if (context.req.method !== 'POST') {
    sendJson(context.res, 405, { message: messageByLocale(context.locale, 'Método no permitido') });
    trackAiOperation('render_pdf', context, startedAt);
    return;
  }

  const payload = await readJsonBody(context.req);
  const validation = validateCreateAiProposal(payload);
  if (!validation.ok) {
    sendJson(context.res, 400, { message: messageByLocale(context.locale, 'Solicitud inválida'), errors: validation.errors });
    return;
  }

  const result = await buildProposalOrRespondError(context, validation);
  const data = result?.data;
  if (!data) {
    trackAiOperation('render_pdf', context, startedAt);
    return;
  }

  const pdf = renderProposalPdfDraft(data, context.locale, validation.value.renderOptions);
  context.res.statusCode = 200;
  context.res.setHeader('Content-Type', 'application/pdf');
  context.res.setHeader('Content-Disposition', 'inline; filename="proposal-draft.pdf"');
  context.res.end(pdf);
  trackAiOperation('render_pdf', context, startedAt, result?.estimation);
}

export async function handleAiMetrics(context: RequestContext): Promise<void> {
  if (context.req.method !== 'GET') {
    sendJson(context.res, 405, { message: messageByLocale(context.locale, 'Método no permitido') });
    return;
  }

  const snapshot = aiProposalObservability.snapshot();
  const configuredProvider = process.env.AI_PROVIDER ?? 'mock';
  const configuredFallbackProvider = process.env.AI_PROVIDER_FALLBACK ?? null;
  const data = {
    ...snapshot,
    configuration: {
      provider: configuredProvider,
      fallbackProvider: configuredFallbackProvider
    }
  };
  sendJson(context.res, 200, { data, message: messageByLocale(context.locale, 'Métricas AI disponibles') });
}

interface UsageEstimation {
  estimatedTokens: number;
  estimatedCostUsd: number;
}

async function buildProposalOrRespondError(
  context: RequestContext,
  existingValidation?: ReturnType<typeof validateCreateAiProposal>
) {
  const validation = existingValidation ?? validateCreateAiProposal(await readJsonBody(context.req));
  if (!validation.ok) {
    sendJson(context.res, 400, { message: messageByLocale(context.locale, 'Solicitud inválida'), errors: validation.errors });
    return null;
  }

  const locale: SupportedLocale = context.locale === 'en-US' ? 'en-US' : 'es-MX';
  const data = generateMockProposal(validation.value, locale);
  const estimation = estimateUsage(validation.value.itinerarySummary);
  if (validation.value.enforceQualityGate === true && data.warnings.some((warning) => warning.severity === 'high')) {
    sendJson(context.res, 422, {
      data,
      message: messageByLocale(context.locale, 'Propuesta bloqueada por quality gate')
    });
    return null;
  }

  return {
    data,
    estimation
  };
}

function estimateUsage(summary: string): UsageEstimation {
  const estimatedTokens = Math.max(120, Math.ceil(summary.length / 3));
  const estimatedCostUsd = Number(((estimatedTokens / 1000) * 0.003).toFixed(6));

  return {
    estimatedTokens,
    estimatedCostUsd
  };
}

function trackAiOperation(
  operation: 'proposal' | 'render_web' | 'render_pdf' | 'schema' | 'render_schema',
  context: RequestContext,
  startedAt: number,
  estimation?: UsageEstimation
): void {
  const statusCode = context.res.statusCode > 0 ? context.res.statusCode : 200;
  aiProposalObservability.record({
    operation,
    statusCode,
    durationMs: Date.now() - startedAt,
    estimatedTokens: estimation?.estimatedTokens,
    estimatedCostUsd: estimation?.estimatedCostUsd,
    provider: process.env.AI_PROVIDER ?? 'mock'
  });
}

function messageByLocale(locale: string, spanish: string): string {
  if (locale === 'es-MX') return spanish;
  return englishMessage(spanish);
}

function englishMessage(spanish: string): string {
  const map: Record<string, string> = {
    'Método no permitido': 'Method not allowed',
    'Esquema AI disponible': 'AI schema available',
    'Esquema de render AI disponible': 'AI render schema available',
    'Métricas AI disponibles': 'AI metrics available',
    'Solicitud inválida': 'Invalid request',
    'Propuesta bloqueada por quality gate': 'Proposal blocked by quality gate',
    'Propuesta AI generada (mock)': 'AI proposal generated (mock)'
  };

  return map[spanish] ?? 'Operation completed';
}
