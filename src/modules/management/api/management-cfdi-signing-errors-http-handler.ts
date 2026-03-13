import type { RequestContext } from '../../../core/http/http-types';
import { sendJson } from '../../../core/http/http-utils';
import { asOptionalText } from '../../../core/http/http-query-params';
import { validateCfdiReadQueryParams } from '../../../core/http/http-query-validation';
import { pgQuery } from '../../../core/db/pg-client';
import { applyTimestampRangeFilters } from '../../../core/db/pg-filter-builders';
import { messageByLocale } from './management-http-handlers';

export async function handleManagementCfdiSigningErrors(context: RequestContext): Promise<void> {
  if (context.req.method !== 'GET') {
    sendJson(context.res, 405, { message: messageByLocale(context.locale, 'Método no permitido') });
    return;
  }

  const storageMode = process.env.STORAGE_MODE ?? 'memory';
  const searchParams = new URL(context.req.url ?? '/', 'http://localhost').searchParams;
  const reason = asOptionalText(searchParams.get('reason'));
  const invoiceId = asOptionalText(searchParams.get('invoiceId'));
  const queryValidation = validateCfdiReadQueryParams(searchParams, {
    limit: { defaultValue: 20, min: 1, max: 200 }
  });

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
        count: 0,
        errors: []
      },
      message: messageByLocale(context.locale, 'Errores de firmado CFDI no disponibles en modo memoria')
    });
    return;
  }

  const filters: string[] = ["event_type = 'error'", "detail_json->>'operation' = 'sign'"];
  const params: unknown[] = [];

  if (reason) {
    params.push(reason);
    filters.push(`detail_json->>'reason' = $${params.length}`);
  }

  if (invoiceId) {
    params.push(invoiceId);
    filters.push(`cfdi_invoice_id = $${params.length}`);
  }

  applyTimestampRangeFilters({ filters, params, column: 'event_at', from, to });

  params.push(limit);

  try {
    const result = await pgQuery<{
      id: string;
      cfdi_invoice_id: string;
      event_at: string;
      created_at: string;
      reason: string | null;
      detail_json: Record<string, unknown> | null;
      invoice_last_error: string | null;
    }>(
      `
        select
          e.id,
          e.cfdi_invoice_id,
          e.event_at,
          e.created_at,
          e.detail_json->>'reason' as reason,
          e.detail_json,
          i.last_error as invoice_last_error
        from cfdi_invoice_events e
        join cfdi_invoices i on i.id = e.cfdi_invoice_id
        where ${filters.join(' and ')}
        order by e.event_at desc, e.id desc
        limit $${params.length}
      `,
      params
    );

    sendJson(context.res, 200, {
      data: {
        storageMode,
        count: result.rows.length,
        errors: result.rows.map((row) => ({
          id: row.id,
          invoiceId: row.cfdi_invoice_id,
          reason: row.reason,
          invoiceLastError: row.invoice_last_error,
          detail: row.detail_json ?? {},
          eventAt: row.event_at,
          createdAt: row.created_at
        }))
      },
      message: messageByLocale(context.locale, 'Errores de firmado CFDI consultados')
    });
  } catch (error) {
    sendJson(context.res, 503, {
      data: {
        storageMode,
        count: 0,
        errors: []
      },
      message: messageByLocale(context.locale, 'No fue posible consultar errores de firmado CFDI'),
      errors: [error instanceof Error ? error.message : 'Unknown database error']
    });
  }
}
