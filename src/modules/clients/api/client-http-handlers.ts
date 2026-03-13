import type { RequestContext } from '../../../core/http/http-types';
import { readJsonBody, sendJson } from '../../../core/http/http-utils';
import { recordAuditEvent } from '../../../core/audit/audit-event-recorder';
import { getUserContextFromHeaders } from '../../../core/auth/request-auth';
import { verifyAuthToken } from '../../../core/auth/token-service';
import type { ClientRepository } from '../domain/client-repository';
import { mapCreateClientToEntity, mapUpdateClientToEntity } from '../application/client-service';
import { validateCreateClient, validateUpdateClient } from './client-validation';

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

export async function handleClientsCollection(context: RequestContext, repository: ClientRepository): Promise<void> {
  if (context.req.method === 'GET') {
    const data = await repository.list();
    sendJson(context.res, 200, { data, message: messageByLocale(context.locale, 'Listado de clientes') });
    return;
  }

  if (context.req.method === 'POST') {
    const payload = await readJsonBody(context.req);
    const validation = validateCreateClient(payload);
    if (!validation.ok) {
      sendJson(context.res, 400, { message: messageByLocale(context.locale, 'Solicitud inválida'), errors: validation.errors });
      return;
    }

    const entity = mapCreateClientToEntity(validation.value);
    const data = await repository.create(entity);
    await recordAuditEvent({
      actorUserId: actorUserIdFromContext(context),
      action: 'client.create',
      resource: 'clients',
      after: data
    });
    sendJson(context.res, 201, { data, message: messageByLocale(context.locale, 'Cliente creado') });
    return;
  }

  sendJson(context.res, 405, { message: messageByLocale(context.locale, 'Método no permitido') });
}

export async function handleClientResource(context: RequestContext, repository: ClientRepository): Promise<void> {
  const clientId = context.pathSegments[1];
  const existing = await repository.getById(clientId);

  if (!existing) {
    sendJson(context.res, 404, { message: messageByLocale(context.locale, 'Cliente no encontrado') });
    return;
  }

  if (context.req.method === 'GET') {
    sendJson(context.res, 200, { data: existing });
    return;
  }

  if (context.req.method === 'PATCH') {
    const payload = await readJsonBody(context.req);
    const validation = validateUpdateClient(payload);
    if (!validation.ok) {
      sendJson(context.res, 400, { message: messageByLocale(context.locale, 'Solicitud inválida'), errors: validation.errors });
      return;
    }

    const updated = mapUpdateClientToEntity(existing, validation.value);
    const data = await repository.update(updated);
    await recordAuditEvent({
      actorUserId: actorUserIdFromContext(context),
      action: 'client.update',
      resource: 'clients',
      before: existing,
      after: data
    });
    sendJson(context.res, 200, { data, message: messageByLocale(context.locale, 'Cliente actualizado') });
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
        action: 'client.delete',
        resource: 'clients',
        before: existing,
        after: {
          deleted: true,
          cascade,
          cascadeConfirmedText: cascade ? cascadeConfirmedText : null
        }
      });
      sendJson(context.res, 200, {
        message: messageByLocale(context.locale, cascade ? 'Cliente eliminado con dependencias' : 'Cliente eliminado')
      });
      return;
    } catch (error) {
      const code = (error as { code?: string } | undefined)?.code;
      if (code === '23503') {
        sendJson(context.res, 409, { message: messageByLocale(context.locale, 'Cliente no se puede eliminar por dependencias') });
        return;
      }
      throw error;
    }
  }

  sendJson(context.res, 405, { message: messageByLocale(context.locale, 'Método no permitido') });
}

function messageByLocale(locale: string, spanish: string): string {
  if (locale === 'es-MX') return spanish;
  return englishMessage(spanish);
}

function englishMessage(spanish: string): string {
  const map: Record<string, string> = {
    'Listado de clientes': 'Clients listed',
    'Cliente creado': 'Client created',
    'Cliente no encontrado': 'Client not found',
    'Cliente actualizado': 'Client updated',
    'Cliente eliminado': 'Client deleted',
    'Cliente eliminado con dependencias': 'Client and related records deleted',
    'Cliente no se puede eliminar por dependencias': 'Client cannot be deleted because dependent records exist',
    'Confirmación de borrado total inválida': 'Invalid full delete confirmation',
    'Solo owner o manager pueden ejecutar borrado total': 'Only owner or manager can execute full delete',
    'Solicitud inválida': 'Invalid request',
    'Método no permitido': 'Method not allowed'
  };

  return map[spanish] ?? 'Operation completed';
}
