import type { RequestContext } from '../../../core/http/http-types';
import { readJsonBody, sendJson } from '../../../core/http/http-utils';
import type { ManagementRepository } from '../domain/management-repository';
import {
  mapCreateManagementSettingToEntity,
  mapUpdateManagementSettingToEntity
} from '../application/management-service';
import {
  validateCreateManagementSetting,
  validateUpdateManagementSetting
} from './management-validation';

export async function handleManagementCollection(context: RequestContext, repository: ManagementRepository): Promise<void> {
  if (context.req.method === 'GET') {
    const data = await repository.list();
    sendJson(context.res, 200, { data, message: messageByLocale(context.locale, 'Listado de configuraciones') });
    return;
  }

  if (context.req.method === 'POST') {
    const payload = await readJsonBody(context.req);
    const validation = validateCreateManagementSetting(payload);
    if (!validation.ok) {
      sendJson(context.res, 400, { message: messageByLocale(context.locale, 'Solicitud inválida'), errors: validation.errors });
      return;
    }

    const entity = mapCreateManagementSettingToEntity(validation.value);
    const data = await repository.create(entity);
    sendJson(context.res, 201, { data, message: messageByLocale(context.locale, 'Configuración creada') });
    return;
  }

  sendJson(context.res, 405, { message: messageByLocale(context.locale, 'Método no permitido') });
}

export async function handleManagementResource(context: RequestContext, repository: ManagementRepository): Promise<void> {
  const settingId = context.pathSegments[1];
  const existing = await repository.getById(settingId);

  if (!existing) {
    sendJson(context.res, 404, { message: messageByLocale(context.locale, 'Configuración no encontrada') });
    return;
  }

  if (context.req.method === 'GET') {
    sendJson(context.res, 200, { data: existing });
    return;
  }

  if (context.req.method === 'PATCH') {
    const payload = await readJsonBody(context.req);
    const validation = validateUpdateManagementSetting(payload);
    if (!validation.ok) {
      sendJson(context.res, 400, { message: messageByLocale(context.locale, 'Solicitud inválida'), errors: validation.errors });
      return;
    }

    const updated = mapUpdateManagementSettingToEntity(existing, validation.value);
    const data = await repository.update(updated);
    sendJson(context.res, 200, { data, message: messageByLocale(context.locale, 'Configuración actualizada') });
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
    'Listado de configuraciones': 'Settings listed',
    'Configuración creada': 'Setting created',
    'Configuración no encontrada': 'Setting not found',
    'Configuración actualizada': 'Setting updated',
    'Solicitud inválida': 'Invalid request',
    'Método no permitido': 'Method not allowed'
  };

  return map[spanish] ?? 'Operation completed';
}