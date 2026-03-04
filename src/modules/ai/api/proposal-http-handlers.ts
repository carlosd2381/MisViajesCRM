import type { RequestContext } from '../../../core/http/http-types';
import { readJsonBody, sendJson } from '../../../core/http/http-utils';
import { resolveLocale } from '../../../core/i18n/resolve-locale';
import type { SupportedLocale } from '../../../core/i18n/supported-locales';
import { generateMockProposal } from '../application/proposal-mock-service';
import { renderProposalHtml, renderProposalPdfDraft } from '../application/proposal-render-service';
import { buildAiProposalSchemaMetadata } from '../domain/proposal-schema-metadata';
import { validateCreateAiProposal } from './proposal-validation';

export async function handleAiProposalSchema(context: RequestContext): Promise<void> {
  if (context.req.method !== 'GET') {
    sendJson(context.res, 405, { message: messageByLocale(context.locale, 'Método no permitido') });
    return;
  }

  const requestedLocale = new URL(context.req.url ?? '/', 'http://localhost').searchParams.get('locale');
  const schemaLocale = resolveLocale(requestedLocale ?? context.locale);
  const data = buildAiProposalSchemaMetadata(schemaLocale);
  sendJson(context.res, 200, { data, message: messageByLocale(context.locale, 'Esquema AI disponible') });
}

export async function handleAiProposalCollection(context: RequestContext): Promise<void> {
  if (context.req.method !== 'POST') {
    sendJson(context.res, 405, { message: messageByLocale(context.locale, 'Método no permitido') });
    return;
  }

  const data = await buildProposalOrRespondError(context);
  if (!data) return;

  sendJson(context.res, 200, { data, message: messageByLocale(context.locale, 'Propuesta AI generada (mock)') });
}

export async function handleAiProposalWebRender(context: RequestContext): Promise<void> {
  if (context.req.method !== 'POST') {
    sendJson(context.res, 405, { message: messageByLocale(context.locale, 'Método no permitido') });
    return;
  }

  const data = await buildProposalOrRespondError(context);
  if (!data) return;

  const html = renderProposalHtml(data, context.locale);
  context.res.statusCode = 200;
  context.res.setHeader('Content-Type', 'text/html; charset=utf-8');
  context.res.end(html);
}

export async function handleAiProposalPdfDraft(context: RequestContext): Promise<void> {
  if (context.req.method !== 'POST') {
    sendJson(context.res, 405, { message: messageByLocale(context.locale, 'Método no permitido') });
    return;
  }

  const data = await buildProposalOrRespondError(context);
  if (!data) return;

  const pdf = renderProposalPdfDraft(data);
  context.res.statusCode = 200;
  context.res.setHeader('Content-Type', 'application/pdf');
  context.res.setHeader('Content-Disposition', 'inline; filename="proposal-draft.pdf"');
  context.res.end(pdf);
}

async function buildProposalOrRespondError(context: RequestContext) {
  const payload = await readJsonBody(context.req);
  const validation = validateCreateAiProposal(payload);
  if (!validation.ok) {
    sendJson(context.res, 400, { message: messageByLocale(context.locale, 'Solicitud inválida'), errors: validation.errors });
    return null;
  }

  const locale: SupportedLocale = context.locale === 'en-US' ? 'en-US' : 'es-MX';
  const data = generateMockProposal(validation.value, locale);
  if (validation.value.enforceQualityGate === true && data.warnings.some((warning) => warning.severity === 'high')) {
    sendJson(context.res, 422, {
      data,
      message: messageByLocale(context.locale, 'Propuesta bloqueada por quality gate')
    });
    return null;
  }

  return data;
}

function messageByLocale(locale: string, spanish: string): string {
  if (locale === 'es-MX') return spanish;
  return englishMessage(spanish);
}

function englishMessage(spanish: string): string {
  const map: Record<string, string> = {
    'Método no permitido': 'Method not allowed',
    'Esquema AI disponible': 'AI schema available',
    'Solicitud inválida': 'Invalid request',
    'Propuesta bloqueada por quality gate': 'Proposal blocked by quality gate',
    'Propuesta AI generada (mock)': 'AI proposal generated (mock)'
  };

  return map[spanish] ?? 'Operation completed';
}
