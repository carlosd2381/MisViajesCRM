import type { RequestContext } from '../../../core/http/http-types';
import { readJsonBody, sendJson } from '../../../core/http/http-utils';
import type { DashboardRepository } from '../domain/dashboard-repository';
import {
  mapCreateDashboardSnapshotToEntity,
  mapUpdateDashboardSnapshotToEntity
} from '../application/dashboard-service';
import {
  validateCreateDashboardSnapshot,
  validateUpdateDashboardSnapshot
} from './dashboard-validation';

export async function handleDashboardCollection(context: RequestContext, repository: DashboardRepository): Promise<void> {
  if (context.req.method === 'GET') {
    const data = await repository.list();
    sendJson(context.res, 200, { data, message: messageByLocale(context.locale, 'Listado de snapshots de dashboard') });
    return;
  }

  if (context.req.method === 'POST') {
    const payload = await readJsonBody(context.req);
    const validation = validateCreateDashboardSnapshot(payload);
    if (!validation.ok) {
      sendJson(context.res, 400, { message: messageByLocale(context.locale, 'Solicitud inválida'), errors: validation.errors });
      return;
    }

    const entity = mapCreateDashboardSnapshotToEntity(validation.value);
    const data = await repository.create(entity);
    sendJson(context.res, 201, { data, message: messageByLocale(context.locale, 'Snapshot de dashboard creado') });
    return;
  }

  sendJson(context.res, 405, { message: messageByLocale(context.locale, 'Método no permitido') });
}

export async function handleDashboardResource(context: RequestContext, repository: DashboardRepository): Promise<void> {
  const snapshotId = context.pathSegments[1];
  const existing = await repository.getById(snapshotId);

  if (!existing) {
    sendJson(context.res, 404, { message: messageByLocale(context.locale, 'Snapshot de dashboard no encontrado') });
    return;
  }

  if (context.req.method === 'GET') {
    sendJson(context.res, 200, { data: existing });
    return;
  }

  if (context.req.method === 'PATCH') {
    const payload = await readJsonBody(context.req);
    const validation = validateUpdateDashboardSnapshot(payload);
    if (!validation.ok) {
      sendJson(context.res, 400, { message: messageByLocale(context.locale, 'Solicitud inválida'), errors: validation.errors });
      return;
    }

    const updated = mapUpdateDashboardSnapshotToEntity(existing, validation.value);
    const data = await repository.update(updated);
    sendJson(context.res, 200, { data, message: messageByLocale(context.locale, 'Snapshot de dashboard actualizado') });
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
    'Listado de snapshots de dashboard': 'Dashboard snapshots listed',
    'Snapshot de dashboard creado': 'Dashboard snapshot created',
    'Snapshot de dashboard no encontrado': 'Dashboard snapshot not found',
    'Snapshot de dashboard actualizado': 'Dashboard snapshot updated',
    'Solicitud inválida': 'Invalid request',
    'Método no permitido': 'Method not allowed'
  };

  return map[spanish] ?? 'Operation completed';
}
