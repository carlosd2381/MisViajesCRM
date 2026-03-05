import type { RequestContext } from '../../../core/http/http-types';
import { sendJson } from '../../../core/http/http-utils';
import { asOptionalText, isIsoDateTime, parseBoundedInt } from '../../../core/http/http-query-params';
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
  const invoiceId = asOptionalText(searchParams.get('invoiceId'));
  const from = asOptionalText(searchParams.get('from'));
  const to = asOptionalText(searchParams.get('to'));
  const limit = parseBoundedInt(searchParams.get('limit'), 20, 1, 100);

  if (!invoiceId) {
    sendJson(context.res, 400, {
      message: messageByLocale(context.locale, 'Solicitud inválida'),
      errors: ['invoiceId es requerido']
    });
    return;
  }

  if (from && !isIsoDateTime(from)) {
    sendJson(context.res, 400, {
      message: messageByLocale(context.locale, 'Solicitud inválida'),
      errors: ['from inválido']
    });
    return;
  }

  if (to && !isIsoDateTime(to)) {
    sendJson(context.res, 400, {
      message: messageByLocale(context.locale, 'Solicitud inválida'),
      errors: ['to inválido']
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
    const filters: string[] = ['cfdi_invoice_id = $1'];
    const params: unknown[] = [invoiceId];

    if (from) {
      params.push(from);
      filters.push(`event_at >= $${params.length}::timestamptz`);
    }

    if (to) {
      params.push(to);
      filters.push(`event_at <= $${params.length}::timestamptz`);
    }

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
        order by event_at desc
        limit $${params.length}
      `,
      params
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

export async function handleManagementCfdiSigningErrors(context: RequestContext): Promise<void> {
  if (context.req.method !== 'GET') {
    sendJson(context.res, 405, { message: messageByLocale(context.locale, 'Método no permitido') });
    return;
  }

  const storageMode = process.env.STORAGE_MODE ?? 'memory';
  const searchParams = new URL(context.req.url ?? '/', 'http://localhost').searchParams;
  const reason = asOptionalText(searchParams.get('reason'));
  const invoiceId = asOptionalText(searchParams.get('invoiceId'));
  const from = asOptionalText(searchParams.get('from'));
  const to = asOptionalText(searchParams.get('to'));
  const limit = parseBoundedInt(searchParams.get('limit'), 20, 1, 200);

  if (from && !isIsoDateTime(from)) {
    sendJson(context.res, 400, {
      message: messageByLocale(context.locale, 'Solicitud inválida'),
      errors: ['from inválido']
    });
    return;
  }

  if (to && !isIsoDateTime(to)) {
    sendJson(context.res, 400, {
      message: messageByLocale(context.locale, 'Solicitud inválida'),
      errors: ['to inválido']
    });
    return;
  }

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

  if (from) {
    params.push(from);
    filters.push(`event_at >= $${params.length}::timestamptz`);
  }

  if (to) {
    params.push(to);
    filters.push(`event_at <= $${params.length}::timestamptz`);
  }

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
        order by e.event_at desc
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

export async function handleManagementCfdiSigningErrorTrends(context: RequestContext): Promise<void> {
  if (context.req.method !== 'GET') {
    sendJson(context.res, 405, { message: messageByLocale(context.locale, 'Método no permitido') });
    return;
  }

  const storageMode = process.env.STORAGE_MODE ?? 'memory';
  const searchParams = new URL(context.req.url ?? '/', 'http://localhost').searchParams;
  const reason = asOptionalText(searchParams.get('reason'));
  const from = asOptionalText(searchParams.get('from'));
  const to = asOptionalText(searchParams.get('to'));
  const windowDays = parseBoundedInt(searchParams.get('windowDays'), 14, 1, 90);

  if (from && !isIsoDateTime(from)) {
    sendJson(context.res, 400, {
      message: messageByLocale(context.locale, 'Solicitud inválida'),
      errors: ['from inválido']
    });
    return;
  }

  if (to && !isIsoDateTime(to)) {
    sendJson(context.res, 400, {
      message: messageByLocale(context.locale, 'Solicitud inválida'),
      errors: ['to inválido']
    });
    return;
  }

  if (storageMode !== 'postgres') {
    sendJson(context.res, 200, {
      data: {
        storageMode,
        totalErrors: 0,
        bucketCount: 0,
        buckets: [],
        totals: []
      },
      message: messageByLocale(context.locale, 'Tendencias de errores de firmado CFDI no disponibles en modo memoria')
    });
    return;
  }

  const filters: string[] = ["event_type = 'error'", "detail_json->>'operation' = 'sign'"];
  const params: unknown[] = [];

  if (reason) {
    params.push(reason);
    filters.push(`detail_json->>'reason' = $${params.length}`);
  }

  if (from) {
    params.push(from);
    filters.push(`event_at >= $${params.length}::timestamptz`);
  } else {
    params.push(windowDays);
    filters.push(`event_at >= now() - make_interval(days => $${params.length}::int)`);
  }

  if (to) {
    params.push(to);
    filters.push(`event_at <= $${params.length}::timestamptz`);
  }

  try {
    const result = await pgQuery<{
      day_bucket: string;
      reason: string | null;
      total_count: number;
    }>(
      `
        select
          to_char(date_trunc('day', event_at at time zone 'UTC'), 'YYYY-MM-DD') as day_bucket,
          coalesce(detail_json->>'reason', 'unknown') as reason,
          count(*)::int as total_count
        from cfdi_invoice_events
        where ${filters.join(' and ')}
        group by day_bucket, reason
        order by day_bucket desc, total_count desc
      `,
      params
    );

    const bucketMap = new Map<string, { day: string; totalCount: number; reasons: Array<{ reason: string; count: number }> }>();
    const reasonTotals = new Map<string, number>();
    let totalErrors = 0;

    for (const row of result.rows) {
      const day = row.day_bucket;
      const reasonValue = row.reason ?? 'unknown';
      const count = Number(row.total_count);

      totalErrors += count;
      reasonTotals.set(reasonValue, (reasonTotals.get(reasonValue) ?? 0) + count);

      const existingBucket = bucketMap.get(day);
      if (!existingBucket) {
        bucketMap.set(day, {
          day,
          totalCount: count,
          reasons: [{ reason: reasonValue, count }]
        });
        continue;
      }

      existingBucket.totalCount += count;
      existingBucket.reasons.push({ reason: reasonValue, count });
    }

    const buckets = Array.from(bucketMap.values());
    const totals = Array.from(reasonTotals.entries())
      .map(([reasonKey, count]) => ({ reason: reasonKey, count }))
      .sort((left, right) => right.count - left.count);

    sendJson(context.res, 200, {
      data: {
        storageMode,
        totalErrors,
        bucketCount: buckets.length,
        buckets,
        totals
      },
      message: messageByLocale(context.locale, 'Tendencias de errores de firmado CFDI consultadas')
    });
  } catch (error) {
    sendJson(context.res, 503, {
      data: {
        storageMode,
        totalErrors: 0,
        bucketCount: 0,
        buckets: [],
        totals: []
      },
      message: messageByLocale(context.locale, 'No fue posible consultar tendencias de errores de firmado CFDI'),
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
  const invoiceId = asOptionalText(context.pathSegments[3]);
  const searchParams = new URL(context.req.url ?? '/', 'http://localhost').searchParams;
  const from = asOptionalText(searchParams.get('from'));
  const to = asOptionalText(searchParams.get('to'));
  const limit = parseBoundedInt(searchParams.get('limit'), 10, 1, 100);

  if (!invoiceId) {
    sendJson(context.res, 400, {
      message: messageByLocale(context.locale, 'Solicitud inválida'),
      errors: ['invoiceId es requerido']
    });
    return;
  }

  if (from && !isIsoDateTime(from)) {
    sendJson(context.res, 400, {
      message: messageByLocale(context.locale, 'Solicitud inválida'),
      errors: ['from inválido']
    });
    return;
  }

  if (to && !isIsoDateTime(to)) {
    sendJson(context.res, 400, {
      message: messageByLocale(context.locale, 'Solicitud inválida'),
      errors: ['to inválido']
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

    if (from) {
      eventParams.push(from);
      eventFilters.push(`event_at >= $${eventParams.length}::timestamptz`);
    }

    if (to) {
      eventParams.push(to);
      eventFilters.push(`event_at <= $${eventParams.length}::timestamptz`);
    }

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
        order by event_at desc
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

