import type { RequestContext } from '../../../core/http/http-types';
import { readJsonBody, sendJson } from '../../../core/http/http-utils';
import { pgQuery } from '../../../core/db/pg-client';
import type { ManagementRepository } from '../domain/management-repository';
import {
  mapCreateManagementSettingToEntity,
  mapUpdateManagementSettingToEntity
} from '../application/management-service';
import {
  validateCfdiCancelConfirmRequest,
  validateCfdiCancelRequest,
  validateCfdiStampConfirmRequest,
  validateCfdiStampRequest,
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

export async function handleManagementCfdiEvents(context: RequestContext): Promise<void> {
  if (context.req.method !== 'GET') {
    sendJson(context.res, 405, { message: messageByLocale(context.locale, 'Método no permitido') });
    return;
  }

  const storageMode = process.env.STORAGE_MODE ?? 'memory';
  const searchParams = new URL(context.req.url ?? '/', 'http://localhost').searchParams;
  const invoiceId = asText(searchParams.get('invoiceId'));
  const limitInput = Number.parseInt(searchParams.get('limit') ?? '20', 10);
  const limit = Number.isFinite(limitInput) ? Math.min(Math.max(limitInput, 1), 100) : 20;

  if (!invoiceId) {
    sendJson(context.res, 400, {
      message: messageByLocale(context.locale, 'Solicitud inválida'),
      errors: ['invoiceId es requerido']
    });
    return;
  }

  if (storageMode !== 'postgres') {
    sendJson(context.res, 200, {
      data: {
        storageMode,
        invoiceId,
        count: 0,
        events: []
      },
      message: messageByLocale(context.locale, 'Eventos CFDI no disponibles en modo memoria')
    });
    return;
  }

  try {
    const result = await pgQuery<{
      id: string;
      cfdi_invoice_id: string;
      event_type: string;
      detail_json: Record<string, unknown> | null;
      event_at: string;
      created_at: string;
    }>(
      `
        select
          id,
          cfdi_invoice_id,
          event_type,
          detail_json,
          event_at,
          created_at
        from cfdi_invoice_events
        where cfdi_invoice_id = $1
        order by event_at desc
        limit $2
      `,
      [invoiceId, limit]
    );

    sendJson(context.res, 200, {
      data: {
        storageMode,
        invoiceId,
        count: result.rows.length,
        events: result.rows.map((row) => ({
          id: row.id,
          invoiceId: row.cfdi_invoice_id,
          eventType: row.event_type,
          detail: row.detail_json ?? {},
          eventAt: row.event_at,
          createdAt: row.created_at
        }))
      },
      message: messageByLocale(context.locale, 'Eventos CFDI consultados')
    });
  } catch (error) {
    sendJson(context.res, 503, {
      data: {
        storageMode,
        invoiceId,
        count: 0,
        events: []
      },
      message: messageByLocale(context.locale, 'No fue posible consultar eventos CFDI'),
      errors: [error instanceof Error ? error.message : 'Unknown database error']
    });
  }
}

export async function handleManagementCfdiStampValidation(context: RequestContext): Promise<void> {
  if (context.req.method !== 'POST') {
    sendJson(context.res, 405, { message: messageByLocale(context.locale, 'Método no permitido') });
    return;
  }

  const payload = await readJsonBody(context.req);
  const validation = validateCfdiStampRequest(payload);

  if (!validation.ok) {
    const eventRecorded = await recordCfdiValidationEvent({
      invoiceId: asText(payload.invoiceId),
      eventType: 'validation_failed',
      operation: 'stamp',
      valid: false,
      detail: {
        errors: validation.errors
      }
    });

    sendJson(context.res, 400, {
      message: messageByLocale(context.locale, 'Solicitud inválida'),
      errors: validation.errors,
      metadata: { eventRecorded }
    });
    return;
  }

  const eventRecorded = await recordCfdiValidationEvent({
    invoiceId: validation.value.invoiceId,
    eventType: 'validation_passed',
    operation: 'stamp',
    valid: true,
    detail: {
      satCertificateId: validation.value.satCertificateId,
      rfcEmisor: validation.value.rfcEmisor,
      rfcReceptor: validation.value.rfcReceptor,
      currency: validation.value.currency,
      total: validation.value.total,
      issueDate: validation.value.issueDate
    }
  });

  sendJson(context.res, 200, {
    data: {
      valid: true,
      operation: 'stamp',
      normalizedRequest: validation.value,
      requiredFields: ['invoiceId', 'satCertificateId', 'rfcEmisor', 'rfcReceptor', 'currency', 'total', 'issueDate'],
      eventRecorded
    },
    message: messageByLocale(context.locale, 'Contrato CFDI timbrado válido')
  });
}

export async function handleManagementCfdiCancelValidation(context: RequestContext): Promise<void> {
  if (context.req.method !== 'POST') {
    sendJson(context.res, 405, { message: messageByLocale(context.locale, 'Método no permitido') });
    return;
  }

  const payload = await readJsonBody(context.req);
  const validation = validateCfdiCancelRequest(payload);

  if (!validation.ok) {
    const eventRecorded = await recordCfdiValidationEvent({
      invoiceId: asText(payload.invoiceId),
      eventType: 'validation_failed',
      operation: 'cancel',
      valid: false,
      detail: {
        errors: validation.errors
      }
    });

    sendJson(context.res, 400, {
      message: messageByLocale(context.locale, 'Solicitud inválida'),
      errors: validation.errors,
      metadata: { eventRecorded }
    });
    return;
  }

  const eventRecorded = await recordCfdiValidationEvent({
    invoiceId: validation.value.invoiceId,
    eventType: 'validation_passed',
    operation: 'cancel',
    valid: true,
    detail: {
      cfdiUuid: validation.value.cfdiUuid,
      cancellationReason: validation.value.cancellationReason,
      replacementCfdiUuid: validation.value.replacementCfdiUuid,
      cancelledAt: validation.value.cancelledAt
    }
  });

  sendJson(context.res, 200, {
    data: {
      valid: true,
      operation: 'cancel',
      normalizedRequest: validation.value,
      requiredFields: ['invoiceId', 'cfdiUuid', 'cancellationReason', 'cancelledAt'],
      eventRecorded
    },
    message: messageByLocale(context.locale, 'Contrato CFDI cancelación válido')
  });
}

export async function handleManagementCfdiStampConfirm(context: RequestContext): Promise<void> {
  if (context.req.method !== 'POST') {
    sendJson(context.res, 405, { message: messageByLocale(context.locale, 'Método no permitido') });
    return;
  }

  const payload = await readJsonBody(context.req);
  const validation = validateCfdiStampConfirmRequest(payload);
  if (!validation.ok) {
    sendJson(context.res, 400, { message: messageByLocale(context.locale, 'Solicitud inválida'), errors: validation.errors });
    return;
  }

  if ((process.env.STORAGE_MODE ?? 'memory') !== 'postgres') {
    sendJson(context.res, 200, {
      data: {
        transitionApplied: false,
        storageMode: process.env.STORAGE_MODE ?? 'memory',
        reason: 'storage_mode_not_postgres'
      },
      message: messageByLocale(context.locale, 'Transición CFDI no disponible en modo memoria')
    });
    return;
  }

  try {
    const now = new Date().toISOString();
    const updateResult = await pgQuery<{
      id: string;
      status: string;
      cfdi_uuid: string | null;
      stamped_at: string | null;
    }>(
      `
        update cfdi_invoices
        set
          cfdi_uuid = $2,
          status = 'stamped',
          stamped_at = $3,
          updated_at = $4
        where id = $1
        returning id, status, cfdi_uuid, stamped_at
      `,
      [validation.value.invoiceId, validation.value.cfdiUuid, validation.value.stampedAt, now]
    );

    if (updateResult.rowCount === 0) {
      sendJson(context.res, 404, { message: messageByLocale(context.locale, 'CFDI no encontrado') });
      return;
    }

    const eventRecorded = await recordCfdiLifecycleEvent({
      invoiceId: validation.value.invoiceId,
      eventType: 'stamped',
      detail: {
        cfdiUuid: validation.value.cfdiUuid,
        stampedAt: validation.value.stampedAt
      }
    });

    sendJson(context.res, 200, {
      data: {
        transitionApplied: true,
        operation: 'stamp_confirm',
        invoice: {
          id: updateResult.rows[0].id,
          status: updateResult.rows[0].status,
          cfdiUuid: updateResult.rows[0].cfdi_uuid,
          stampedAt: updateResult.rows[0].stamped_at
        },
        eventRecorded
      },
      message: messageByLocale(context.locale, 'CFDI marcado como timbrado')
    });
  } catch (error) {
    sendJson(context.res, 503, {
      message: messageByLocale(context.locale, 'No fue posible confirmar timbrado CFDI'),
      errors: [error instanceof Error ? error.message : 'Unknown database error']
    });
  }
}

export async function handleManagementCfdiCancelConfirm(context: RequestContext): Promise<void> {
  if (context.req.method !== 'POST') {
    sendJson(context.res, 405, { message: messageByLocale(context.locale, 'Método no permitido') });
    return;
  }

  const payload = await readJsonBody(context.req);
  const validation = validateCfdiCancelConfirmRequest(payload);
  if (!validation.ok) {
    sendJson(context.res, 400, { message: messageByLocale(context.locale, 'Solicitud inválida'), errors: validation.errors });
    return;
  }

  if ((process.env.STORAGE_MODE ?? 'memory') !== 'postgres') {
    sendJson(context.res, 200, {
      data: {
        transitionApplied: false,
        storageMode: process.env.STORAGE_MODE ?? 'memory',
        reason: 'storage_mode_not_postgres'
      },
      message: messageByLocale(context.locale, 'Transición CFDI no disponible en modo memoria')
    });
    return;
  }

  try {
    const now = new Date().toISOString();
    const updateResult = await pgQuery<{
      id: string;
      status: string;
      cfdi_uuid: string | null;
      cancelled_at: string | null;
    }>(
      `
        update cfdi_invoices
        set
          cfdi_uuid = coalesce(cfdi_uuid, $2),
          status = 'cancelled',
          cancelled_at = $3,
          updated_at = $4
        where id = $1
        returning id, status, cfdi_uuid, cancelled_at
      `,
      [validation.value.invoiceId, validation.value.cfdiUuid, validation.value.cancelledAt, now]
    );

    if (updateResult.rowCount === 0) {
      sendJson(context.res, 404, { message: messageByLocale(context.locale, 'CFDI no encontrado') });
      return;
    }

    const eventRecorded = await recordCfdiLifecycleEvent({
      invoiceId: validation.value.invoiceId,
      eventType: 'cancelled',
      detail: {
        cfdiUuid: validation.value.cfdiUuid,
        cancellationReason: validation.value.cancellationReason,
        replacementCfdiUuid: validation.value.replacementCfdiUuid,
        cancelledAt: validation.value.cancelledAt
      }
    });

    sendJson(context.res, 200, {
      data: {
        transitionApplied: true,
        operation: 'cancel_confirm',
        invoice: {
          id: updateResult.rows[0].id,
          status: updateResult.rows[0].status,
          cfdiUuid: updateResult.rows[0].cfdi_uuid,
          cancelledAt: updateResult.rows[0].cancelled_at
        },
        eventRecorded
      },
      message: messageByLocale(context.locale, 'CFDI marcado como cancelado')
    });
  } catch (error) {
    sendJson(context.res, 503, {
      message: messageByLocale(context.locale, 'No fue posible confirmar cancelación CFDI'),
      errors: [error instanceof Error ? error.message : 'Unknown database error']
    });
  }
}

function asText(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

interface CfdiValidationEventInput {
  invoiceId?: string;
  eventType: 'validation_passed' | 'validation_failed';
  operation: 'stamp' | 'cancel';
  valid: boolean;
  detail: Record<string, unknown>;
}

interface CfdiLifecycleEventInput {
  invoiceId: string;
  eventType: 'stamped' | 'cancelled';
  detail: Record<string, unknown>;
}

function createEventId(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${random}`;
}

async function recordCfdiValidationEvent(input: CfdiValidationEventInput): Promise<boolean> {
  if ((process.env.STORAGE_MODE ?? 'memory') !== 'postgres') return false;
  if (!input.invoiceId) return false;

  const now = new Date().toISOString();
  const payload = JSON.stringify({
    operation: input.operation,
    valid: input.valid,
    ...input.detail
  });

  try {
    await pgQuery(
      `
        insert into cfdi_invoice_events (
          id,
          cfdi_invoice_id,
          event_type,
          detail_json,
          event_at,
          created_at
        ) values ($1, $2, $3, $4::jsonb, $5, $6)
      `,
      [createEventId('cfdi_evt'), input.invoiceId, input.eventType, payload, now, now]
    );
    return true;
  } catch {
    return false;
  }
}

async function recordCfdiLifecycleEvent(input: CfdiLifecycleEventInput): Promise<boolean> {
  if ((process.env.STORAGE_MODE ?? 'memory') !== 'postgres') return false;

  const now = new Date().toISOString();
  const payload = JSON.stringify(input.detail);

  try {
    await pgQuery(
      `
        insert into cfdi_invoice_events (
          id,
          cfdi_invoice_id,
          event_type,
          detail_json,
          event_at,
          created_at
        ) values ($1, $2, $3, $4::jsonb, $5, $6)
      `,
      [createEventId('cfdi_evt'), input.invoiceId, input.eventType, payload, now, now]
    );
    return true;
  } catch {
    return false;
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
    'No fue posible confirmar timbrado CFDI': 'Unable to confirm CFDI stamping',
    'No fue posible confirmar cancelación CFDI': 'Unable to confirm CFDI cancellation',
    'Solicitud inválida': 'Invalid request',
    'Método no permitido': 'Method not allowed'
  };

  return map[spanish] ?? 'Operation completed';
}