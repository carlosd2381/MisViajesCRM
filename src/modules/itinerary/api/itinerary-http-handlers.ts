import type { RequestContext } from '../../../core/http/http-types';
import { readJsonBody, sendJson } from '../../../core/http/http-utils';
import { recordAuditEvent } from '../../../core/audit/audit-event-recorder';
import type { ItineraryRepository } from '../domain/itinerary-repository';
import {
  mapCreateItineraryItemToEntity,
  mapCreateItineraryToEntity,
  mapUpdateItineraryToEntity,
  recalculateItineraryTotals
} from '../application/itinerary-service';
import {
  validateCreateItinerary,
  validateCreateItineraryItem,
  validateUpdateItinerary
} from './itinerary-validation';

function actorUserIdFromContext(context: RequestContext): string | null {
  const header = context.req.headers['x-user-id'];
  if (!header) return null;
  return Array.isArray(header) ? (header[0] ?? null) : header;
}

export async function handleItinerariesCollection(
  context: RequestContext,
  repository: ItineraryRepository
): Promise<void> {
  if (context.req.method === 'GET') {
    const data = await repository.list();
    sendJson(context.res, 200, { data, message: messageByLocale(context.locale, 'Listado de itinerarios') });
    return;
  }

  if (context.req.method === 'POST') {
    const payload = await readJsonBody(context.req);
    const validation = validateCreateItinerary(payload);
    if (!validation.ok) {
      sendJson(context.res, 400, {
        message: messageByLocale(context.locale, 'Solicitud inválida'),
        errors: validation.errors
      });
      return;
    }

    const entity = mapCreateItineraryToEntity(validation.value);
    const data = await repository.create(entity);
    await recordAuditEvent({
      actorUserId: actorUserIdFromContext(context),
      action: 'itinerary.create',
      resource: 'itineraries',
      after: data
    });
    sendJson(context.res, 201, { data, message: messageByLocale(context.locale, 'Itinerario creado') });
    return;
  }

  sendJson(context.res, 405, { message: messageByLocale(context.locale, 'Método no permitido') });
}

export async function handleItineraryResource(
  context: RequestContext,
  repository: ItineraryRepository
): Promise<void> {
  const itineraryId = context.pathSegments[1];
  const existing = await repository.getById(itineraryId);

  if (!existing) {
    sendJson(context.res, 404, { message: messageByLocale(context.locale, 'Itinerario no encontrado') });
    return;
  }

  if (context.req.method === 'GET') {
    sendJson(context.res, 200, { data: existing });
    return;
  }

  if (context.req.method === 'PATCH') {
    const payload = await readJsonBody(context.req);
    const validation = validateUpdateItinerary(payload);
    if (!validation.ok) {
      sendJson(context.res, 400, {
        message: messageByLocale(context.locale, 'Solicitud inválida'),
        errors: validation.errors
      });
      return;
    }

    const updated = mapUpdateItineraryToEntity(existing, validation.value);
    const data = await repository.update(updated);
    await recordAuditEvent({
      actorUserId: actorUserIdFromContext(context),
      action: 'itinerary.update',
      resource: 'itineraries',
      before: existing,
      after: data
    });
    sendJson(context.res, 200, { data, message: messageByLocale(context.locale, 'Itinerario actualizado') });
    return;
  }

  sendJson(context.res, 405, { message: messageByLocale(context.locale, 'Método no permitido') });
}

export async function handleItineraryApprove(
  context: RequestContext,
  repository: ItineraryRepository
): Promise<void> {
  const itineraryId = context.pathSegments[1];
  const existing = await repository.getById(itineraryId);

  if (!existing) {
    sendJson(context.res, 404, { message: messageByLocale(context.locale, 'Itinerario no encontrado') });
    return;
  }

  if (context.req.method !== 'POST') {
    sendJson(context.res, 405, { message: messageByLocale(context.locale, 'Método no permitido') });
    return;
  }

  const approved = mapUpdateItineraryToEntity(existing, { status: 'accepted' });
  const data = await repository.update(approved);
  await recordAuditEvent({
    actorUserId: actorUserIdFromContext(context),
    action: 'itinerary.approve',
    resource: 'itineraries',
    before: existing,
    after: data
  });

  sendJson(context.res, 200, { data, message: messageByLocale(context.locale, 'Itinerario aprobado') });
}

export async function handleItineraryItemsCollection(
  context: RequestContext,
  repository: ItineraryRepository
): Promise<void> {
  const itineraryId = context.pathSegments[1];
  const itinerary = await repository.getById(itineraryId);

  if (!itinerary) {
    sendJson(context.res, 404, { message: messageByLocale(context.locale, 'Itinerario no encontrado') });
    return;
  }

  if (context.req.method === 'GET') {
    const data = await repository.listItems(itineraryId);
    sendJson(context.res, 200, { data, message: messageByLocale(context.locale, 'Listado de items del itinerario') });
    return;
  }

  if (context.req.method === 'POST') {
    const payload = await readJsonBody(context.req);
    const validation = validateCreateItineraryItem(payload);
    if (!validation.ok) {
      sendJson(context.res, 400, {
        message: messageByLocale(context.locale, 'Solicitud inválida'),
        errors: validation.errors
      });
      return;
    }

    const itemEntity = mapCreateItineraryItemToEntity(itineraryId, validation.value);
    const item = await repository.createItem(itemEntity);
    const items = await repository.listItems(itineraryId);
    const updatedItinerary = recalculateItineraryTotals(itinerary, items);
    await repository.update(updatedItinerary);

    await recordAuditEvent({
      actorUserId: actorUserIdFromContext(context),
      action: 'itinerary.item.create',
      resource: 'itineraries',
      before: itinerary,
      after: updatedItinerary
    });

    sendJson(context.res, 201, {
      data: {
        item,
        itinerary: updatedItinerary
      },
      message: messageByLocale(context.locale, 'Item de itinerario creado')
    });
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
    'Listado de itinerarios': 'Itineraries listed',
    'Itinerario creado': 'Itinerary created',
    'Itinerario no encontrado': 'Itinerary not found',
    'Itinerario actualizado': 'Itinerary updated',
    'Itinerario aprobado': 'Itinerary approved',
    'Listado de items del itinerario': 'Itinerary items listed',
    'Item de itinerario creado': 'Itinerary item created',
    'Solicitud inválida': 'Invalid request',
    'Método no permitido': 'Method not allowed'
  };

  return map[spanish] ?? 'Operation completed';
}
