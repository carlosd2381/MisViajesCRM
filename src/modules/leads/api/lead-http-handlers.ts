import type { RequestContext } from '../../../core/http/http-types';
import { readJsonBody, sendJson } from '../../../core/http/http-utils';
import type { LeadRepository } from '../domain/lead-repository';
import { mapCreateLeadToEntity, mapUpdateLeadToEntity } from '../application/lead-service';
import { validateCreateLead, validateUpdateLead } from './lead-validation';

export async function handleLeadsCollection(context: RequestContext, repository: LeadRepository): Promise<void> {
  if (context.req.method === 'GET') {
    const data = await repository.list();
    sendJson(context.res, 200, { data, message: messageByLocale(context.locale, 'Listado de leads') });
    return;
  }

  if (context.req.method === 'POST') {
    const payload = await readJsonBody(context.req);
    const validation = validateCreateLead(payload);
    if (!validation.ok) {
      sendJson(context.res, 400, { message: messageByLocale(context.locale, 'Solicitud inválida'), errors: validation.errors });
      return;
    }

    const entity = mapCreateLeadToEntity(validation.value);
    const data = await repository.create(entity);
    sendJson(context.res, 201, { data, message: messageByLocale(context.locale, 'Lead creado') });
    return;
  }

  sendJson(context.res, 405, { message: messageByLocale(context.locale, 'Método no permitido') });
}

export async function handleLeadResource(context: RequestContext, repository: LeadRepository): Promise<void> {
  const leadId = context.pathSegments[1];
  const existing = await repository.getById(leadId);

  if (!existing) {
    sendJson(context.res, 404, { message: messageByLocale(context.locale, 'Lead no encontrado') });
    return;
  }

  if (context.req.method === 'GET') {
    sendJson(context.res, 200, { data: existing });
    return;
  }

  if (context.req.method === 'PATCH') {
    const payload = await readJsonBody(context.req);
    const validation = validateUpdateLead(payload);
    if (!validation.ok) {
      sendJson(context.res, 400, { message: messageByLocale(context.locale, 'Solicitud inválida'), errors: validation.errors });
      return;
    }

    const updated = mapUpdateLeadToEntity(existing, validation.value);
    const data = await repository.update(updated);
    sendJson(context.res, 200, { data, message: messageByLocale(context.locale, 'Lead actualizado') });
    return;
  }

  sendJson(context.res, 405, { message: messageByLocale(context.locale, 'Método no permitido') });
}

function messageByLocale(locale: string, spanish: string): string {
  if (locale === 'es-MX') return spanish;
  return englishMessage(spanish);
}

function englishMessage(spanish: string): string {
  const map: Record<string, string> = {
    'Listado de leads': 'Leads listed',
    'Lead creado': 'Lead created',
    'Lead no encontrado': 'Lead not found',
    'Lead actualizado': 'Lead updated',
    'Solicitud inválida': 'Invalid request',
    'Método no permitido': 'Method not allowed'
  };

  return map[spanish] ?? 'Operation completed';
}
