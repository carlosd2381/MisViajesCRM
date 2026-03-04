import type { RequestContext } from '../../../core/http/http-types';
import { readJsonBody, sendJson } from '../../../core/http/http-utils';
import type { ClientRepository } from '../domain/client-repository';
import { mapCreateClientToEntity, mapUpdateClientToEntity } from '../application/client-service';
import { validateCreateClient, validateUpdateClient } from './client-validation';

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
    sendJson(context.res, 200, { data, message: messageByLocale(context.locale, 'Cliente actualizado') });
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
    'Listado de clientes': 'Clients listed',
    'Cliente creado': 'Client created',
    'Cliente no encontrado': 'Client not found',
    'Cliente actualizado': 'Client updated',
    'Solicitud inválida': 'Invalid request',
    'Método no permitido': 'Method not allowed'
  };

  return map[spanish] ?? 'Operation completed';
}
