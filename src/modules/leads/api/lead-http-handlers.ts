import type { RequestContext } from '../../../core/http/http-types';
import { readJsonBody, sendJson } from '../../../core/http/http-utils';
import { recordAuditEvent } from '../../../core/audit/audit-event-recorder';
import { getUserContextFromHeaders } from '../../../core/auth/request-auth';
import { verifyAuthToken } from '../../../core/auth/token-service';
import { mapCreateClientToEntity } from '../../clients/application/client-service';
import type { ClientRepository } from '../../clients/domain/client-repository';
import { validateCreateClient } from '../../clients/api/client-validation';
import type { LeadRepository } from '../domain/lead-repository';
import {
  mapConvertLeadToClientRequest,
  mapCreateLeadToEntity,
  mapLeadToClosedWon,
  mapUpdateLeadToEntity
} from '../application/lead-service';
import { validateCreateLead, validateUpdateLead } from './lead-validation';

function actorUserIdFromContext(context: RequestContext): string | null {
  const user = requestUserContext(context.req);
  return user?.userId ?? null;
}

function requestUserContext(req: RequestContext['req']): { userId: string; role: string } | null {
  const fromHeaders = getUserContextFromHeaders(req);
  if (fromHeaders) return fromHeaders;

  const authorization = req.headers.authorization;
  const raw = Array.isArray(authorization) ? authorization[0] : authorization;
  if (!raw || !raw.startsWith('Bearer ')) return null;
  return verifyAuthToken(raw.slice('Bearer '.length));
}

function readCascadeConfirmation(payload: Record<string, unknown>): string {
  return typeof payload.confirmation === 'string' ? payload.confirmation.trim() : '';
}

function isCascadeDeleteConfirmed(locale: string, confirmationText: string): boolean {
  const confirmation = confirmationText.toLowerCase();
  if (locale === 'es-MX') return confirmation === 'eliminar todo';
  return confirmation === 'delete all';
}

function canCascadeDelete(role: string | undefined): boolean {
  return role === 'owner' || role === 'manager';
}

function forbiddenCascadeMessage(locale: string): string {
  return messageByLocale(locale, 'Solo owner o manager pueden ejecutar borrado total');
}

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
    await recordAuditEvent({
      actorUserId: actorUserIdFromContext(context),
      action: 'lead.create',
      resource: 'leads',
      after: data
    });
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
    await recordAuditEvent({
      actorUserId: actorUserIdFromContext(context),
      action: 'lead.update',
      resource: 'leads',
      before: existing,
      after: data
    });
    sendJson(context.res, 200, { data, message: messageByLocale(context.locale, 'Lead actualizado') });
    return;
  }

  if (context.req.method === 'DELETE') {
    const searchParams = new URL(context.req.url ?? '/', 'http://localhost').searchParams;
    const cascade = searchParams.get('cascade') === 'true';
    const user = requestUserContext(context.req);
    let cascadeConfirmedText: string | null = null;

    try {
      if (cascade) {
        if (!canCascadeDelete(user?.role)) {
          sendJson(context.res, 403, { message: forbiddenCascadeMessage(context.locale) });
          return;
        }

        const payload = await readJsonBody(context.req);
        cascadeConfirmedText = readCascadeConfirmation(payload);
        if (!isCascadeDeleteConfirmed(context.locale, cascadeConfirmedText)) {
          sendJson(context.res, 400, { message: messageByLocale(context.locale, 'Confirmación de borrado total inválida') });
          return;
        }
      }

      await repository.delete(existing.id, { cascade });
      await recordAuditEvent({
        actorUserId: actorUserIdFromContext(context),
        action: 'lead.delete',
        resource: 'leads',
        before: existing,
        after: {
          deleted: true,
          cascade,
          cascadeConfirmedText: cascade ? cascadeConfirmedText : null
        }
      });
      sendJson(context.res, 200, {
        message: messageByLocale(context.locale, cascade ? 'Lead eliminado con dependencias' : 'Lead eliminado')
      });
      return;
    } catch (error) {
      const code = (error as { code?: string } | undefined)?.code;
      if (code === '23503') {
        sendJson(context.res, 409, { message: messageByLocale(context.locale, 'Lead no se puede eliminar por dependencias') });
        return;
      }
      throw error;
    }
  }

  sendJson(context.res, 405, { message: messageByLocale(context.locale, 'Método no permitido') });
}

export async function handleLeadConvert(
  context: RequestContext,
  leadRepository: LeadRepository,
  clientRepository: ClientRepository
): Promise<void> {
  const leadId = context.pathSegments[1];
  const existing = await leadRepository.getById(leadId);

  if (!existing) {
    sendJson(context.res, 404, { message: messageByLocale(context.locale, 'Lead no encontrado') });
    return;
  }

  if (context.req.method !== 'POST') {
    sendJson(context.res, 405, { message: messageByLocale(context.locale, 'Método no permitido') });
    return;
  }

  const existingClient = await clientRepository.getByLeadId(existing.id);
  if (existingClient) {
    sendJson(context.res, 409, {
      message: messageByLocale(context.locale, 'Lead ya convertido a cliente'),
      data: {
        lead: existing,
        client: existingClient
      }
    });
    return;
  }

  const payload = await readJsonBody(context.req);
  const validation = validateCreateClient(payload);
  if (!validation.ok) {
    sendJson(context.res, 400, { message: messageByLocale(context.locale, 'Solicitud inválida'), errors: validation.errors });
    return;
  }

  const createClientRequest = mapConvertLeadToClientRequest(existing, validation.value);
  const createdClient = await clientRepository.create(mapCreateClientToEntity(createClientRequest));
  const updatedLead = await leadRepository.update(mapLeadToClosedWon(existing));
  await recordAuditEvent({
    actorUserId: actorUserIdFromContext(context),
    action: 'lead.convert',
    resource: 'leads',
    before: { lead: existing },
    after: { lead: updatedLead, client: createdClient }
  });

  sendJson(context.res, 201, {
    data: {
      lead: updatedLead,
      client: createdClient
    },
    message: messageByLocale(context.locale, 'Lead convertido a cliente')
  });
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
    'Lead eliminado': 'Lead deleted',
    'Lead eliminado con dependencias': 'Lead and related records deleted',
    'Lead no se puede eliminar por dependencias': 'Lead cannot be deleted because dependent records exist',
    'Confirmación de borrado total inválida': 'Invalid full delete confirmation',
    'Solo owner o manager pueden ejecutar borrado total': 'Only owner or manager can execute full delete',
    'Lead convertido a cliente': 'Lead converted to client',
    'Lead ya convertido a cliente': 'Lead already converted to client',
    'Solicitud inválida': 'Invalid request',
    'Método no permitido': 'Method not allowed'
  };

  return map[spanish] ?? 'Operation completed';
}
