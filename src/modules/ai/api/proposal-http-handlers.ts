import type { RequestContext } from '../../../core/http/http-types';
import { readJsonBody, sendJson } from '../../../core/http/http-utils';
import type { SupportedLocale } from '../../../core/i18n/supported-locales';
import { generateMockProposal } from '../application/proposal-mock-service';
import { buildAiProposalSchemaMetadata } from '../domain/proposal-schema-metadata';
import { validateCreateAiProposal } from './proposal-validation';

export async function handleAiProposalSchema(context: RequestContext): Promise<void> {
  if (context.req.method !== 'GET') {
    sendJson(context.res, 405, { message: messageByLocale(context.locale, 'Método no permitido') });
    return;
  }

  const data = buildAiProposalSchemaMetadata();
  sendJson(context.res, 200, { data, message: messageByLocale(context.locale, 'Esquema AI disponible') });
}

export async function handleAiProposalCollection(context: RequestContext): Promise<void> {
  if (context.req.method !== 'POST') {
    sendJson(context.res, 405, { message: messageByLocale(context.locale, 'Método no permitido') });
    return;
  }

  const payload = await readJsonBody(context.req);
  const validation = validateCreateAiProposal(payload);
  if (!validation.ok) {
    sendJson(context.res, 400, { message: messageByLocale(context.locale, 'Solicitud inválida'), errors: validation.errors });
    return;
  }

  const locale: SupportedLocale = context.locale === 'en-US' ? 'en-US' : 'es-MX';
  const data = generateMockProposal(validation.value, locale);

  if (validation.value.enforceQualityGate === true && data.warnings.some((warning) => warning.severity === 'high')) {
    sendJson(context.res, 422, {
      data,
      message: messageByLocale(context.locale, 'Propuesta bloqueada por quality gate')
    });
    return;
  }

  sendJson(context.res, 200, { data, message: messageByLocale(context.locale, 'Propuesta AI generada (mock)') });
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
