import type { RequestContext } from '../../../core/http/http-types';
import { readJsonBody, sendJson } from '../../../core/http/http-utils';
import { pgQuery } from '../../../core/db/pg-client';
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

export async function handleManagementCfdiReadiness(context: RequestContext): Promise<void> {
  if (context.req.method !== 'GET') {
    sendJson(context.res, 405, { message: messageByLocale(context.locale, 'Método no permitido') });
    return;
  }

  const storageMode = process.env.STORAGE_MODE ?? 'memory';
  if (storageMode !== 'postgres') {
    sendJson(context.res, 200, {
      data: {
        ready: false,
        storageMode,
        reason: 'storage_mode_not_postgres',
        checkedTables: ['sat_certificates', 'cfdi_invoices', 'cfdi_invoice_events'],
        missingTables: ['sat_certificates', 'cfdi_invoices', 'cfdi_invoice_events']
      },
      message: messageByLocale(context.locale, 'Readiness CFDI no disponible en modo memoria')
    });
    return;
  }

  try {
    const result = await pgQuery<{
      sat_certificates: string | null;
      cfdi_invoices: string | null;
      cfdi_invoice_events: string | null;
    }>(
      `
        select
          to_regclass('public.sat_certificates')::text as sat_certificates,
          to_regclass('public.cfdi_invoices')::text as cfdi_invoices,
          to_regclass('public.cfdi_invoice_events')::text as cfdi_invoice_events
      `
    );

    const row = result.rows[0] ?? {
      sat_certificates: null,
      cfdi_invoices: null,
      cfdi_invoice_events: null
    };

    const missingTables = [
      row.sat_certificates === 'sat_certificates' ? null : 'sat_certificates',
      row.cfdi_invoices === 'cfdi_invoices' ? null : 'cfdi_invoices',
      row.cfdi_invoice_events === 'cfdi_invoice_events' ? null : 'cfdi_invoice_events'
    ].filter((value): value is string => value !== null);

    sendJson(context.res, 200, {
      data: {
        ready: missingTables.length === 0,
        storageMode,
        checkedTables: ['sat_certificates', 'cfdi_invoices', 'cfdi_invoice_events'],
        missingTables
      },
      message: messageByLocale(context.locale, 'Readiness CFDI evaluado')
    });
  } catch (error) {
    sendJson(context.res, 503, {
      data: {
        ready: false,
        storageMode,
        reason: 'database_unreachable',
        checkedTables: ['sat_certificates', 'cfdi_invoices', 'cfdi_invoice_events']
      },
      message: messageByLocale(context.locale, 'No fue posible evaluar readiness CFDI'),
      errors: [error instanceof Error ? error.message : 'Unknown database error']
    });
  }
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
    'Readiness CFDI evaluado': 'CFDI readiness evaluated',
    'Readiness CFDI no disponible en modo memoria': 'CFDI readiness is unavailable in memory mode',
    'No fue posible evaluar readiness CFDI': 'Unable to evaluate CFDI readiness',
    'Solicitud inválida': 'Invalid request',
    'Método no permitido': 'Method not allowed'
  };

  return map[spanish] ?? 'Operation completed';
}