import type { RequestContext } from '../../../core/http/http-types';
import { sendJson } from '../../../core/http/http-utils';
import { pgQuery } from '../../../core/db/pg-client';
import { messageByLocale } from './management-http-handlers';

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

export async function handleManagementCfdiInvoiceStatus(context: RequestContext): Promise<void> {
  if (context.req.method !== 'GET') {
    sendJson(context.res, 405, { message: messageByLocale(context.locale, 'Método no permitido') });
    return;
  }

  const storageMode = process.env.STORAGE_MODE ?? 'memory';
  const invoiceId = asText(context.pathSegments[3]);
  const searchParams = new URL(context.req.url ?? '/', 'http://localhost').searchParams;
  const limitInput = Number.parseInt(searchParams.get('limit') ?? '10', 10);
  const limit = Number.isFinite(limitInput) ? Math.min(Math.max(limitInput, 1), 100) : 10;

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
        invoice: null,
        events: []
      },
      message: messageByLocale(context.locale, 'Estado CFDI no disponible en modo memoria')
    });
    return;
  }

  try {
    const invoiceResult = await pgQuery<{
      id: string;
      status: string;
      cfdi_uuid: string | null;
      issue_date: string;
      stamped_at: string | null;
      cancelled_at: string | null;
      updated_at: string;
      last_error: string | null;
    }>(
      `
        select
          id,
          status,
          cfdi_uuid,
          issue_date,
          stamped_at,
          cancelled_at,
          updated_at,
          last_error
        from cfdi_invoices
        where id = $1
      `,
      [invoiceId]
    );

    if (invoiceResult.rowCount === 0) {
      sendJson(context.res, 404, { message: messageByLocale(context.locale, 'CFDI no encontrado') });
      return;
    }

    const eventsResult = await pgQuery<{
      id: string;
      event_type: string;
      detail_json: Record<string, unknown> | null;
      event_at: string;
      created_at: string;
    }>(
      `
        select
          id,
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

    const invoice = invoiceResult.rows[0];
    sendJson(context.res, 200, {
      data: {
        storageMode,
        invoiceId,
        invoice: {
          id: invoice.id,
          status: invoice.status,
          cfdiUuid: invoice.cfdi_uuid,
          issueDate: invoice.issue_date,
          stampedAt: invoice.stamped_at,
          cancelledAt: invoice.cancelled_at,
          updatedAt: invoice.updated_at,
          lastError: invoice.last_error
        },
        events: eventsResult.rows.map((row) => ({
          id: row.id,
          eventType: row.event_type,
          detail: row.detail_json ?? {},
          eventAt: row.event_at,
          createdAt: row.created_at
        }))
      },
      message: messageByLocale(context.locale, 'Estado CFDI consultado')
    });
  } catch (error) {
    sendJson(context.res, 503, {
      data: {
        storageMode,
        invoiceId,
        invoice: null,
        events: []
      },
      message: messageByLocale(context.locale, 'No fue posible consultar estado CFDI'),
      errors: [error instanceof Error ? error.message : 'Unknown database error']
    });
  }
}

function asText(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}
