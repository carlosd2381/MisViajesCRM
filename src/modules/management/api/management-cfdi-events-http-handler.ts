import type { RequestContext } from '../../../core/http/http-types';
import { sendJson } from '../../../core/http/http-utils';
import { asOptionalText } from '../../../core/http/http-query-params';
import { validateCfdiReadQueryParams } from '../../../core/http/http-query-validation';
import { pgQuery } from '../../../core/db/pg-client';
import { applyTimestampRangeFilters } from '../../../core/db/pg-filter-builders';
import { mapCfdiEventRowWithInvoice } from '../../../core/db/pg-cfdi-event-mappers';
import { messageByLocale } from './management-http-handlers';

export async function handleManagementCfdiEvents(context: RequestContext): Promise<void> {
  if (context.req.method !== 'GET') {
    sendJson(context.res, 405, { message: messageByLocale(context.locale, 'Método no permitido') });
    return;
  }

  const storageMode = process.env.STORAGE_MODE ?? 'memory';
  const searchParams = new URL(context.req.url ?? '/', 'http://localhost').searchParams;
  const invoiceId = asOptionalText(searchParams.get('invoiceId'));
  const queryValidation = validateCfdiReadQueryParams(searchParams, {
    limit: { defaultValue: 20, min: 1, max: 100 }
  });

  if (!invoiceId) {
    sendJson(context.res, 400, {
      message: messageByLocale(context.locale, 'Solicitud inválida'),
      errors: ['invoiceId es requerido']
    });
    return;
  }

  if (!queryValidation.ok) {
    sendJson(context.res, 400, {
      message: messageByLocale(context.locale, 'Solicitud inválida'),
      errors: queryValidation.errors
    });
    return;
  }

  const { from, to, limit } = queryValidation.value;

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
    const filters: string[] = ['cfdi_invoice_id = $1'];
    const params: unknown[] = [invoiceId];

    applyTimestampRangeFilters({ filters, params, column: 'event_at', from, to });

    params.push(limit);

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
        where ${filters.join(' and ')}
        order by event_at desc, id desc
        limit $${params.length}
      `,
      params
    );

    sendJson(context.res, 200, {
      data: {
        storageMode,
        invoiceId,
        count: result.rows.length,
        events: result.rows.map((row) => mapCfdiEventRowWithInvoice(row))
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
