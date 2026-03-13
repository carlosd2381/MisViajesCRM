import type { RequestContext } from '../../../core/http/http-types';
import { sendJson } from '../../../core/http/http-utils';
import { asOptionalText } from '../../../core/http/http-query-params';
import { validateCfdiReadQueryParams } from '../../../core/http/http-query-validation';
import { pgQuery } from '../../../core/db/pg-client';
import { applyTimestampRangeFilters } from '../../../core/db/pg-filter-builders';
import { messageByLocale } from './management-http-handlers';

export async function handleManagementCfdiSigningErrorTrends(context: RequestContext): Promise<void> {
  if (context.req.method !== 'GET') {
    sendJson(context.res, 405, { message: messageByLocale(context.locale, 'Método no permitido') });
    return;
  }

  const storageMode = process.env.STORAGE_MODE ?? 'memory';
  const searchParams = new URL(context.req.url ?? '/', 'http://localhost').searchParams;
  const reason = asOptionalText(searchParams.get('reason'));
  const queryValidation = validateCfdiReadQueryParams(searchParams, {
    windowDays: { defaultValue: 14, min: 1, max: 90 }
  });

  if (!queryValidation.ok) {
    sendJson(context.res, 400, {
      message: messageByLocale(context.locale, 'Solicitud inválida'),
      errors: queryValidation.errors
    });
    return;
  }

  const { from, to, windowDays } = queryValidation.value;

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

  applyTimestampRangeFilters({ filters, params, column: 'event_at', to });

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
