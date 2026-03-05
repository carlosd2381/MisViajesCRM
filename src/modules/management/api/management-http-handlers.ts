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

export function messageByLocale(locale: string, spanish: string): string {
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
    'Eventos CFDI consultados': 'CFDI events retrieved',
    'Eventos CFDI no disponibles en modo memoria': 'CFDI events are unavailable in memory mode',
    'No fue posible consultar eventos CFDI': 'Unable to retrieve CFDI events',
    'No fue posible evaluar readiness CFDI': 'Unable to evaluate CFDI readiness',
    'Contrato CFDI timbrado válido': 'CFDI stamp contract is valid',
    'Contrato CFDI cancelación válido': 'CFDI cancellation contract is valid',
    'Transición CFDI no disponible en modo memoria': 'CFDI transition is unavailable in memory mode',
    'CFDI no encontrado': 'CFDI invoice not found',
    'CFDI marcado como timbrado': 'CFDI marked as stamped',
    'CFDI marcado como cancelado': 'CFDI marked as cancelled',
    'CFDI de reemplazo no encontrado': 'Replacement CFDI not found',
    'No fue posible confirmar timbrado CFDI': 'Unable to confirm CFDI stamping',
    'No fue posible confirmar cancelación CFDI': 'Unable to confirm CFDI cancellation',
    'Estado CFDI consultado': 'CFDI status retrieved',
    'Estado CFDI no disponible en modo memoria': 'CFDI status is unavailable in memory mode',
    'No fue posible consultar estado CFDI': 'Unable to retrieve CFDI status',
    'Certificados SAT no disponibles en modo memoria': 'SAT certificates are unavailable in memory mode',
    'Creación de certificado SAT no disponible en modo memoria': 'SAT certificate creation is unavailable in memory mode',
    'Certificado SAT no disponible en modo memoria': 'SAT certificate is unavailable in memory mode',
    'Certificados SAT consultados': 'SAT certificates retrieved',
    'Certificado SAT consultado': 'SAT certificate retrieved',
    'Certificado SAT creado': 'SAT certificate created',
    'No fue posible consultar certificados SAT': 'Unable to retrieve SAT certificates',
    'No fue posible consultar certificado SAT': 'Unable to retrieve SAT certificate',
    'No fue posible crear certificado SAT': 'Unable to create SAT certificate',
    'Certificado SAT no encontrado': 'SAT certificate not found',
    'Contrato XML CFDI válido': 'CFDI XML contract is valid',
    'Persistencia XML CFDI no disponible en modo memoria': 'CFDI XML persistence is unavailable in memory mode',
    'XML CFDI persistido': 'CFDI XML persisted',
    'No fue posible persistir XML CFDI': 'Unable to persist CFDI XML',
    'Firmado CFDI no disponible en modo memoria': 'CFDI signing is unavailable in memory mode',
    'Certificado SAT no activo': 'SAT certificate is not active',
    'Certificado SAT incompleto para firmado': 'SAT certificate is missing signing material',
    'RFC emisor de certificado no coincide con CFDI': 'Certificate issuer RFC does not match CFDI',
    'Certificado SAT fuera de vigencia para CFDI': 'SAT certificate is out of validity range for CFDI',
    'XML CFDI requerido para firmado': 'CFDI XML is required for signing',
    'CFDI firmado': 'CFDI signed',
    'No fue posible firmar CFDI': 'Unable to sign CFDI',
    'Solicitud inválida': 'Invalid request',
    'Método no permitido': 'Method not allowed'
  };

  return map[spanish] ?? 'Operation completed';
}