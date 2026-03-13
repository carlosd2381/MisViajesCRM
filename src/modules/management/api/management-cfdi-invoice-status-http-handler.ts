import type { RequestContext } from '../../../core/http/http-types';
import { sendJson } from '../../../core/http/http-utils';
import { asOptionalText } from '../../../core/http/http-query-params';
import { validateCfdiReadQueryParams } from '../../../core/http/http-query-validation';
import { pgQuery } from '../../../core/db/pg-client';
import { applyTimestampRangeFilters } from '../../../core/db/pg-filter-builders';
import { mapCfdiEventRow } from '../../../core/db/pg-cfdi-event-mappers';
import { messageByLocale } from './management-http-handlers';

export async function handleManagementCfdiInvoiceStatus(context: RequestContext): Promise<void> {
  if (context.req.method !== 'GET') {
    sendJson(context.res, 405, { message: messageByLocale(context.locale, 'Método no permitido') });
    return;
  }

  const storageMode = process.env.STORAGE_MODE ?? 'memory';
  const invoiceId = asOptionalText(context.pathSegments[3]);
  const searchParams = new URL(context.req.url ?? '/', 'http://localhost').searchParams;
  const queryValidation = validateCfdiReadQueryParams(searchParams, {
    limit: { defaultValue: 10, min: 1, max: 100 }
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
      has_xml_unsigned: boolean;
      has_xml_stamped: boolean;
      xml_unsigned_bytes: number;
      xml_stamped_bytes: number;
      has_cadena_original: boolean;
      has_sello_digital: boolean;
      sat_certificate_id: string | null;
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
          last_error,
          (xml_unsigned is not null) as has_xml_unsigned,
          (xml_stamped is not null) as has_xml_stamped,
          coalesce(length(xml_unsigned), 0) as xml_unsigned_bytes,
          coalesce(length(xml_stamped), 0) as xml_stamped_bytes,
          (cadena_original is not null) as has_cadena_original,
          (sello_digital is not null) as has_sello_digital,
          sat_certificate_id
        from cfdi_invoices
        where id = $1
      `,
      [invoiceId]
    );

    if (invoiceResult.rowCount === 0) {
      sendJson(context.res, 404, { message: messageByLocale(context.locale, 'CFDI no encontrado') });
      return;
    }

    const eventFilters: string[] = ['cfdi_invoice_id = $1'];
    const eventParams: unknown[] = [invoiceId];

    applyTimestampRangeFilters({ filters: eventFilters, params: eventParams, column: 'event_at', from, to });

    eventParams.push(limit);

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
        where ${eventFilters.join(' and ')}
        order by event_at desc, id desc
        limit $${eventParams.length}
      `,
      eventParams
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
          lastError: invoice.last_error,
          xml: {
            hasUnsigned: invoice.has_xml_unsigned,
            hasStamped: invoice.has_xml_stamped,
            unsignedBytes: Number(invoice.xml_unsigned_bytes),
            stampedBytes: Number(invoice.xml_stamped_bytes)
          },
          signing: {
            hasCadenaOriginal: invoice.has_cadena_original,
            hasSelloDigital: invoice.has_sello_digital,
            satCertificateId: invoice.sat_certificate_id
          }
        },
        events: eventsResult.rows.map((row) => mapCfdiEventRow(row))
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
