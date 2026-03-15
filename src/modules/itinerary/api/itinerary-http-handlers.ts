import type { RequestContext } from '../../../core/http/http-types';
import { readJsonBody, sendJson } from '../../../core/http/http-utils';
import { recordAuditEvent } from '../../../core/audit/audit-event-recorder';
import type { ItineraryRepository } from '../domain/itinerary-repository';
import type { MessagingRepository } from '../../messaging/domain/messaging-repository';
import { mapCreateMessageToEntity } from '../../messaging/application/messaging-service';
import {
  isValidPipelineTransition,
  mapPipelineMoveToStatusEvent,
  mapCreateItineraryDayActivityToEntity,
  mapCreateItineraryDayToEntity,
  mapCreateItineraryItemToEntity,
  mapCreateItineraryToEntity,
  mapUpdateItineraryDayActivityToEntity,
  mapUpdateItineraryDayToEntity,
  mapUpdateItineraryToEntity,
  recalculateItineraryTotalsFromDayActivities,
  recalculateItineraryTotals
} from '../application/itinerary-service';
import {
  validateCreateItineraryDay,
  validateCreateItineraryDayActivity,
  validateCreateItinerary,
  validateCreateItineraryItem,
  validateDestinationLibraryQuery,
  validatePortalApproveProposal,
  validatePortalRequestRevision,
  validatePipelineMove,
  validatePublishProposal,
  validateUpdateItineraryDay,
  validateUpdateItineraryDayActivity,
  validateUpdateItinerary
} from './itinerary-validation';

const DESTINATION_LIBRARY_FALLBACK_MEDIA = 'https://cdn.misviajescrm.local/placeholders/destination-placeholder.jpg';

function nowIsoDate(): string {
  return new Date().toISOString();
}

function createEntityId(prefix: string): string {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function createPortalHash(): string {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID().replace(/-/g, '')
    : Math.random().toString(36).slice(2, 18);
}

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

export async function handleItineraryPipelineMove(
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

  const payload = await readJsonBody(context.req);
  const validation = validatePipelineMove(payload);
  if (!validation.ok) {
    sendJson(context.res, 400, {
      message: messageByLocale(context.locale, 'Solicitud inválida'),
      errors: validation.errors
    });
    return;
  }

  const move = validation.value;
  if (!isValidPipelineTransition(existing.status, move.toStatus)) {
    sendJson(context.res, 409, {
      message: messageByLocale(context.locale, 'Transición de pipeline inválida')
    });
    return;
  }

  const updated = mapUpdateItineraryToEntity(existing, { status: move.toStatus });
  const itinerary = await repository.update(updated);
  const statusEvent = mapPipelineMoveToStatusEvent(existing, move, actorUserIdFromContext(context));
  const event = await repository.createStatusEvent(statusEvent);

  await recordAuditEvent({
    actorUserId: actorUserIdFromContext(context),
    action: 'itinerary.pipeline.move',
    resource: 'itineraries',
    before: existing,
    after: itinerary
  });

  sendJson(context.res, 200, {
    data: {
      itinerary,
      event
    },
    message: messageByLocale(context.locale, 'Pipeline actualizado')
  });
}

export async function handleItineraryPipelineEvents(
  context: RequestContext,
  repository: ItineraryRepository
): Promise<void> {
  const itineraryId = context.pathSegments[1];
  const existing = await repository.getById(itineraryId);

  if (!existing) {
    sendJson(context.res, 404, { message: messageByLocale(context.locale, 'Itinerario no encontrado') });
    return;
  }

  if (context.req.method !== 'GET') {
    sendJson(context.res, 405, { message: messageByLocale(context.locale, 'Método no permitido') });
    return;
  }

  const data = await repository.listStatusEvents(itineraryId);
  sendJson(context.res, 200, {
    data,
    message: messageByLocale(context.locale, 'Eventos de pipeline listados')
  });
}

export async function handleItineraryDaysCollection(
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
    const data = await repository.listDays(itineraryId);
    sendJson(context.res, 200, { data, message: messageByLocale(context.locale, 'Listado de días del itinerario') });
    return;
  }

  if (context.req.method === 'POST') {
    const payload = await readJsonBody(context.req);
    const validation = validateCreateItineraryDay(payload);
    if (!validation.ok) {
      sendJson(context.res, 400, {
        message: messageByLocale(context.locale, 'Solicitud inválida'),
        errors: validation.errors
      });
      return;
    }

    const entity = mapCreateItineraryDayToEntity(itineraryId, validation.value);
    const data = await repository.createDay(entity);

    await recordAuditEvent({
      actorUserId: actorUserIdFromContext(context),
      action: 'itinerary.day.create',
      resource: 'itineraries',
      before: itinerary,
      after: data
    });

    sendJson(context.res, 201, { data, message: messageByLocale(context.locale, 'Día de itinerario creado') });
    return;
  }

  sendJson(context.res, 405, { message: messageByLocale(context.locale, 'Método no permitido') });
}

export async function handleItineraryDayResource(
  context: RequestContext,
  repository: ItineraryRepository
): Promise<void> {
  const itineraryId = context.pathSegments[1];
  const dayId = context.pathSegments[3];
  const itinerary = await repository.getById(itineraryId);

  if (!itinerary) {
    sendJson(context.res, 404, { message: messageByLocale(context.locale, 'Itinerario no encontrado') });
    return;
  }

  const existingDay = await repository.getDayById(itineraryId, dayId);
  if (!existingDay) {
    sendJson(context.res, 404, { message: messageByLocale(context.locale, 'Día no encontrado') });
    return;
  }

  if (context.req.method !== 'PATCH') {
    sendJson(context.res, 405, { message: messageByLocale(context.locale, 'Método no permitido') });
    return;
  }

  const payload = await readJsonBody(context.req);
  const validation = validateUpdateItineraryDay(payload);
  if (!validation.ok) {
    sendJson(context.res, 400, {
      message: messageByLocale(context.locale, 'Solicitud inválida'),
      errors: validation.errors
    });
    return;
  }

  const updated = mapUpdateItineraryDayToEntity(existingDay, validation.value);
  const data = await repository.updateDay(updated);

  await recordAuditEvent({
    actorUserId: actorUserIdFromContext(context),
    action: 'itinerary.day.update',
    resource: 'itineraries',
    before: existingDay,
    after: data
  });

  sendJson(context.res, 200, { data, message: messageByLocale(context.locale, 'Día de itinerario actualizado') });
}

export async function handleItineraryDayActivitiesCollection(
  context: RequestContext,
  repository: ItineraryRepository
): Promise<void> {
  const itineraryId = context.pathSegments[1];
  const dayId = context.pathSegments[3];
  const itinerary = await repository.getById(itineraryId);

  if (!itinerary) {
    sendJson(context.res, 404, { message: messageByLocale(context.locale, 'Itinerario no encontrado') });
    return;
  }

  const day = await repository.getDayById(itineraryId, dayId);
  if (!day) {
    sendJson(context.res, 404, { message: messageByLocale(context.locale, 'Día no encontrado') });
    return;
  }

  if (context.req.method === 'GET') {
    const data = await repository.listDayActivities(itineraryId, dayId);
    sendJson(context.res, 200, { data, message: messageByLocale(context.locale, 'Listado de actividades del día') });
    return;
  }

  if (context.req.method === 'POST') {
    const payload = await readJsonBody(context.req);
    const validation = validateCreateItineraryDayActivity(payload);
    if (!validation.ok) {
      sendJson(context.res, 400, {
        message: messageByLocale(context.locale, 'Solicitud inválida'),
        errors: validation.errors
      });
      return;
    }

    const entity = mapCreateItineraryDayActivityToEntity(itineraryId, dayId, validation.value);
    const activity = await repository.createDayActivity(entity);
    const allActivities = await repository.listAllDayActivities(itineraryId);
    const updatedItinerary = recalculateItineraryTotalsFromDayActivities(itinerary, allActivities);
    const itineraryData = await repository.update(updatedItinerary);

    await recordAuditEvent({
      actorUserId: actorUserIdFromContext(context),
      action: 'itinerary.day.activity.create',
      resource: 'itineraries',
      before: itinerary,
      after: itineraryData
    });

    sendJson(context.res, 201, {
      data: {
        activity,
        itinerary: itineraryData
      },
      message: messageByLocale(context.locale, 'Actividad de día creada')
    });
    return;
  }

  sendJson(context.res, 405, { message: messageByLocale(context.locale, 'Método no permitido') });
}

export async function handleItineraryDayActivityResource(
  context: RequestContext,
  repository: ItineraryRepository
): Promise<void> {
  const itineraryId = context.pathSegments[1];
  const dayId = context.pathSegments[3];
  const activityId = context.pathSegments[5];
  const itinerary = await repository.getById(itineraryId);

  if (!itinerary) {
    sendJson(context.res, 404, { message: messageByLocale(context.locale, 'Itinerario no encontrado') });
    return;
  }

  const day = await repository.getDayById(itineraryId, dayId);
  if (!day) {
    sendJson(context.res, 404, { message: messageByLocale(context.locale, 'Día no encontrado') });
    return;
  }

  const existingActivity = await repository.getDayActivityById(itineraryId, dayId, activityId);
  if (!existingActivity) {
    sendJson(context.res, 404, { message: messageByLocale(context.locale, 'Actividad no encontrada') });
    return;
  }

  if (context.req.method !== 'PATCH') {
    sendJson(context.res, 405, { message: messageByLocale(context.locale, 'Método no permitido') });
    return;
  }

  const payload = await readJsonBody(context.req);
  const validation = validateUpdateItineraryDayActivity(payload);
  if (!validation.ok) {
    sendJson(context.res, 400, {
      message: messageByLocale(context.locale, 'Solicitud inválida'),
      errors: validation.errors
    });
    return;
  }

  const updated = mapUpdateItineraryDayActivityToEntity(existingActivity, validation.value);
  const activity = await repository.updateDayActivity(updated);
  const allActivities = await repository.listAllDayActivities(itineraryId);
  const updatedItinerary = recalculateItineraryTotalsFromDayActivities(itinerary, allActivities);
  const itineraryData = await repository.update(updatedItinerary);

  await recordAuditEvent({
    actorUserId: actorUserIdFromContext(context),
    action: 'itinerary.day.activity.update',
    resource: 'itineraries',
    before: existingActivity,
    after: activity
  });

  sendJson(context.res, 200, {
    data: {
      activity,
      itinerary: itineraryData
    },
    message: messageByLocale(context.locale, 'Actividad de día actualizada')
  });
}

export async function handleDestinationLibrarySearch(
  context: RequestContext,
  repository: ItineraryRepository
): Promise<void> {
  if (context.req.method !== 'GET') {
    sendJson(context.res, 405, { message: messageByLocale(context.locale, 'Método no permitido') });
    return;
  }

  const searchParams = new URL(context.req.url ?? '/', 'http://localhost').searchParams;
  const queryValidation = validateDestinationLibraryQuery(searchParams);
  if (!queryValidation.ok) {
    sendJson(context.res, 400, {
      message: messageByLocale(context.locale, 'Solicitud inválida'),
      errors: queryValidation.errors
    });
    return;
  }

  const query = queryValidation.value;
  const results = await repository.searchDestinationLibrary(query);
  if (results.length === 0) {
    const fallbackLocation = query.location ?? 'Destino sugerido';
    sendJson(context.res, 200, {
      data: [
        {
          id: `fallback_${fallbackLocation.toLowerCase().replace(/\s+/g, '_')}`,
          locationName: fallbackLocation,
          category: query.category ?? 'other',
          title: fallbackLocation,
          description: context.locale === 'es-MX'
            ? 'Contenido curado pendiente para este destino. Mostrando referencia temporal.'
            : 'Curated content pending for this destination. Showing temporary reference.',
          mediaUrl: DESTINATION_LIBRARY_FALLBACK_MEDIA,
          coordinates: null,
          contentSource: 'fallback'
        }
      ],
      message: messageByLocale(context.locale, 'Biblioteca de destinos consultada')
    });
    return;
  }

  const data = results.map((entry) => {
    const description = context.locale === 'es-MX'
      ? (entry.customDescriptionEs ?? entry.customDescriptionEn ?? '')
      : (entry.customDescriptionEn ?? entry.customDescriptionEs ?? '');

    return {
      id: entry.id,
      locationName: entry.locationName,
      category: entry.category,
      title: entry.title,
      description,
      mediaUrl: entry.highResMediaUrl ?? DESTINATION_LIBRARY_FALLBACK_MEDIA,
      coordinates: entry.latitude !== undefined && entry.longitude !== undefined
        ? { latitude: entry.latitude, longitude: entry.longitude }
        : null,
      contentSource: 'internal'
    };
  });

  sendJson(context.res, 200, {
    data,
    message: messageByLocale(context.locale, 'Biblioteca de destinos consultada')
  });
}

export async function handleItineraryPublish(
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

  const payload = await readJsonBody(context.req);
  const validation = validatePublishProposal(payload);
  if (!validation.ok) {
    sendJson(context.res, 400, {
      message: messageByLocale(context.locale, 'Solicitud inválida'),
      errors: validation.errors
    });
    return;
  }

  const publishInput = validation.value;
  const publishedItinerary = existing.status === 'sent'
    ? existing
    : mapUpdateItineraryToEntity(existing, { status: 'sent' });
  const itinerary = await repository.update(publishedItinerary);

  const publication = await repository.createProposalPublication({
    id: createEntityId('proposal_pub'),
    itineraryId: itinerary.id,
    hash: createPortalHash(),
    status: 'active',
    publishedBy: actorUserIdFromContext(context) ?? undefined,
    publishedAt: nowIsoDate(),
    expiresAt: publishInput.expiresAt,
    revokedAt: undefined,
    lastViewedAt: undefined
  });

  sendJson(context.res, 201, {
    data: {
      publicationId: publication.id,
      hash: publication.hash,
      status: publication.status,
      publishedAt: publication.publishedAt,
      expiresAt: publication.expiresAt,
      urlPath: `/view/p/${publication.hash}`
    },
    message: messageByLocale(context.locale, 'Propuesta publicada')
  });
}

export async function handlePortalProposalView(
  context: RequestContext,
  repository: ItineraryRepository
): Promise<void> {
  if (context.req.method !== 'GET') {
    sendJson(context.res, 405, { message: messageByLocale(context.locale, 'Método no permitido') });
    return;
  }

  const hash = context.pathSegments[2];
  const publication = await repository.getProposalPublicationByHash(hash);
  if (!publication || publication.status !== 'active') {
    sendJson(context.res, 404, { message: messageByLocale(context.locale, 'Propuesta no encontrada') });
    return;
  }

  const itinerary = await repository.getById(publication.itineraryId);
  if (!itinerary) {
    sendJson(context.res, 404, { message: messageByLocale(context.locale, 'Itinerario no encontrado') });
    return;
  }

  const touchedPublication = await repository.updateProposalPublication({
    ...publication,
    lastViewedAt: nowIsoDate()
  });

  await repository.createProposalActionEvent({
    id: createEntityId('proposal_evt'),
    proposalPublicationId: publication.id,
    itineraryId: itinerary.id,
    action: 'open',
    actorType: 'client',
    createdAt: nowIsoDate()
  });

  const actionEvents = await repository.listProposalActionEvents(publication.id);
  sendJson(context.res, 200, {
    data: {
      publication: touchedPublication,
      itinerary,
      actions: actionEvents
    },
    message: messageByLocale(context.locale, 'Portal de propuesta consultado')
  });
}

async function createPortalNotification(
  messagingRepository: MessagingRepository,
  itinerary: { id: string; clientId: string; agentId: string; title: string },
  action: 'approve' | 'request_revision',
  note?: string
): Promise<void> {
  const content = action === 'approve'
    ? `proposal.approve | itinerary=${itinerary.id} | title=${itinerary.title}${note ? ` | note=${note}` : ''}`
    : `proposal.request_revision | itinerary=${itinerary.id} | title=${itinerary.title} | feedback=${note ?? ''}`;

  const message = mapCreateMessageToEntity({
    clientId: itinerary.clientId,
    agentId: itinerary.agentId,
    channel: 'internal_note',
    direction: 'inbound',
    content,
    status: 'sent',
    metadataJson: {
      source: 'proposal_portal',
      action,
      itineraryId: itinerary.id
    },
    threadId: `proposal_${itinerary.id}`
  });

  await messagingRepository.create(message);
}

export async function handlePortalProposalApprove(
  context: RequestContext,
  itineraryRepository: ItineraryRepository,
  messagingRepository: MessagingRepository
): Promise<void> {
  if (context.req.method !== 'POST') {
    sendJson(context.res, 405, { message: messageByLocale(context.locale, 'Método no permitido') });
    return;
  }

  const hash = context.pathSegments[2];
  const publication = await itineraryRepository.getProposalPublicationByHash(hash);
  if (!publication || publication.status !== 'active') {
    sendJson(context.res, 404, { message: messageByLocale(context.locale, 'Propuesta no encontrada') });
    return;
  }

  const itinerary = await itineraryRepository.getById(publication.itineraryId);
  if (!itinerary) {
    sendJson(context.res, 404, { message: messageByLocale(context.locale, 'Itinerario no encontrado') });
    return;
  }

  const payload = await readJsonBody(context.req);
  const validation = validatePortalApproveProposal(payload);
  if (!validation.ok) {
    sendJson(context.res, 400, {
      message: messageByLocale(context.locale, 'Solicitud inválida'),
      errors: validation.errors
    });
    return;
  }

  if (!isValidPipelineTransition(itinerary.status, 'accepted')) {
    sendJson(context.res, 409, { message: messageByLocale(context.locale, 'Transición de pipeline inválida') });
    return;
  }

  const updatedItinerary = mapUpdateItineraryToEntity(itinerary, { status: 'accepted' });
  const itineraryData = await itineraryRepository.update(updatedItinerary);
  await itineraryRepository.createStatusEvent(mapPipelineMoveToStatusEvent(itinerary, { toStatus: 'accepted', notes: validation.value.message }, null));

  const actionEvent = await itineraryRepository.createProposalActionEvent({
    id: createEntityId('proposal_evt'),
    proposalPublicationId: publication.id,
    itineraryId: itinerary.id,
    action: 'approve',
    actorType: 'client',
    message: validation.value.message,
    createdAt: nowIsoDate()
  });

  await createPortalNotification(messagingRepository, itinerary, 'approve', validation.value.message);

  sendJson(context.res, 200, {
    data: {
      itinerary: itineraryData,
      action: actionEvent
    },
    message: messageByLocale(context.locale, 'Propuesta aprobada por cliente')
  });
}

export async function handlePortalProposalRequestRevision(
  context: RequestContext,
  itineraryRepository: ItineraryRepository,
  messagingRepository: MessagingRepository
): Promise<void> {
  if (context.req.method !== 'POST') {
    sendJson(context.res, 405, { message: messageByLocale(context.locale, 'Método no permitido') });
    return;
  }

  const hash = context.pathSegments[2];
  const publication = await itineraryRepository.getProposalPublicationByHash(hash);
  if (!publication || publication.status !== 'active') {
    sendJson(context.res, 404, { message: messageByLocale(context.locale, 'Propuesta no encontrada') });
    return;
  }

  const itinerary = await itineraryRepository.getById(publication.itineraryId);
  if (!itinerary) {
    sendJson(context.res, 404, { message: messageByLocale(context.locale, 'Itinerario no encontrado') });
    return;
  }

  const payload = await readJsonBody(context.req);
  const validation = validatePortalRequestRevision(payload);
  if (!validation.ok) {
    sendJson(context.res, 400, {
      message: messageByLocale(context.locale, 'Solicitud inválida'),
      errors: validation.errors
    });
    return;
  }

  if (!isValidPipelineTransition(itinerary.status, 'revised')) {
    sendJson(context.res, 409, { message: messageByLocale(context.locale, 'Transición de pipeline inválida') });
    return;
  }

  const updatedItinerary = mapUpdateItineraryToEntity(itinerary, { status: 'revised' });
  const itineraryData = await itineraryRepository.update(updatedItinerary);
  await itineraryRepository.createStatusEvent(mapPipelineMoveToStatusEvent(itinerary, { toStatus: 'revised', notes: validation.value.feedback }, null));

  const actionEvent = await itineraryRepository.createProposalActionEvent({
    id: createEntityId('proposal_evt'),
    proposalPublicationId: publication.id,
    itineraryId: itinerary.id,
    action: 'request_revision',
    actorType: 'client',
    message: validation.value.feedback,
    createdAt: nowIsoDate()
  });

  await createPortalNotification(messagingRepository, itinerary, 'request_revision', validation.value.feedback);

  sendJson(context.res, 200, {
    data: {
      itinerary: itineraryData,
      action: actionEvent
    },
    message: messageByLocale(context.locale, 'Cliente solicitó revisión')
  });
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
    'Transición de pipeline inválida': 'Invalid pipeline transition',
    'Pipeline actualizado': 'Pipeline updated',
    'Eventos de pipeline listados': 'Pipeline events listed',
    'Listado de días del itinerario': 'Itinerary days listed',
    'Día de itinerario creado': 'Itinerary day created',
    'Día no encontrado': 'Day not found',
    'Día de itinerario actualizado': 'Itinerary day updated',
    'Listado de actividades del día': 'Day activities listed',
    'Actividad de día creada': 'Day activity created',
    'Actividad no encontrada': 'Activity not found',
    'Actividad de día actualizada': 'Day activity updated',
    'Biblioteca de destinos consultada': 'Destination library queried',
    'Propuesta publicada': 'Proposal published',
    'Propuesta no encontrada': 'Proposal not found',
    'Portal de propuesta consultado': 'Proposal portal viewed',
    'Propuesta aprobada por cliente': 'Proposal approved by client',
    'Cliente solicitó revisión': 'Client requested revision',
    'Solicitud inválida': 'Invalid request',
    'Método no permitido': 'Method not allowed'
  };

  return map[spanish] ?? 'Operation completed';
}
