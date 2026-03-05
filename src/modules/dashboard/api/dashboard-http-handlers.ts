import type { RequestContext } from '../../../core/http/http-types';
import { readJsonBody, sendJson } from '../../../core/http/http-utils';
import { asOptionalText, isIsoDateTime, parseBoundedInt } from '../../../core/http/http-query-params';
import { pgQuery } from '../../../core/db/pg-client';
import type { DashboardRepository } from '../domain/dashboard-repository';
import {
  mapCreateDashboardSnapshotToEntity,
  mapUpdateDashboardSnapshotToEntity
} from '../application/dashboard-service';
import {
  validateCreateDashboardSnapshot,
  validateUpdateDashboardSnapshot
} from './dashboard-validation';

export async function handleDashboardCollection(context: RequestContext, repository: DashboardRepository): Promise<void> {
  if (context.req.method === 'GET') {
    const data = await repository.list();
    sendJson(context.res, 200, { data, message: messageByLocale(context.locale, 'Listado de snapshots de dashboard') });
    return;
  }

  if (context.req.method === 'POST') {
    const payload = await readJsonBody(context.req);
    const validation = validateCreateDashboardSnapshot(payload);
    if (!validation.ok) {
      sendJson(context.res, 400, { message: messageByLocale(context.locale, 'Solicitud inválida'), errors: validation.errors });
      return;
    }

    const entity = mapCreateDashboardSnapshotToEntity(validation.value);
    const data = await repository.create(entity);
    sendJson(context.res, 201, { data, message: messageByLocale(context.locale, 'Snapshot de dashboard creado') });
    return;
  }

  sendJson(context.res, 405, { message: messageByLocale(context.locale, 'Método no permitido') });
}

export async function handleDashboardResource(context: RequestContext, repository: DashboardRepository): Promise<void> {
  const snapshotId = context.pathSegments[1];
  const existing = await repository.getById(snapshotId);

  if (!existing) {
    sendJson(context.res, 404, { message: messageByLocale(context.locale, 'Snapshot de dashboard no encontrado') });
    return;
  }

  if (context.req.method === 'GET') {
    sendJson(context.res, 200, { data: existing });
    return;
  }

  if (context.req.method === 'PATCH') {
    const payload = await readJsonBody(context.req);
    const validation = validateUpdateDashboardSnapshot(payload);
    if (!validation.ok) {
      sendJson(context.res, 400, { message: messageByLocale(context.locale, 'Solicitud inválida'), errors: validation.errors });
      return;
    }

    const updated = mapUpdateDashboardSnapshotToEntity(existing, validation.value);
    const data = await repository.update(updated);
    sendJson(context.res, 200, { data, message: messageByLocale(context.locale, 'Snapshot de dashboard actualizado') });
    return;
  }

  sendJson(context.res, 405, { message: messageByLocale(context.locale, 'Método no permitido') });
}

export async function handleDashboardCfdiSigningErrorSummary(context: RequestContext): Promise<void> {
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
  const limit = parseBoundedInt(searchParams.get('limit'), 30, 1, 90);

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
        activeDays: 0,
        topReasons: [],
        daily: []
      },
      message: messageByLocale(context.locale, 'Resumen de errores CFDI no disponible en modo memoria')
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
    const dailyResult = await pgQuery<{ day_bucket: string; total_count: number }>(
      `
        select
          to_char(date_trunc('day', event_at at time zone 'UTC'), 'YYYY-MM-DD') as day_bucket,
          count(*)::int as total_count
        from cfdi_invoice_events
        where ${filters.join(' and ')}
        group by day_bucket
        order by day_bucket desc
        limit $${params.length + 1}
      `,
      [...params, limit]
    );

    const topReasonsResult = await pgQuery<{ reason: string; total_count: number }>(
      `
        select
          coalesce(detail_json->>'reason', 'unknown') as reason,
          count(*)::int as total_count
        from cfdi_invoice_events
        where ${filters.join(' and ')}
        group by reason
        order by total_count desc
        limit 5
      `,
      params
    );

    const daily = dailyResult.rows.map((row) => ({
      day: row.day_bucket,
      count: Number(row.total_count)
    }));

    const totalErrors = daily.reduce((sum, item) => sum + item.count, 0);
    const topReasons = topReasonsResult.rows.map((row) => ({
      reason: row.reason,
      count: Number(row.total_count)
    }));

    sendJson(context.res, 200, {
      data: {
        storageMode,
        totalErrors,
        activeDays: daily.length,
        topReasons,
        daily
      },
      message: messageByLocale(context.locale, 'Resumen de errores CFDI consultado')
    });
  } catch (error) {
    sendJson(context.res, 503, {
      data: {
        storageMode,
        totalErrors: 0,
        activeDays: 0,
        topReasons: [],
        daily: []
      },
      message: messageByLocale(context.locale, 'No fue posible consultar resumen de errores CFDI'),
      errors: [error instanceof Error ? error.message : 'Unknown database error']
    });
  }
}

function messageByLocale(locale: string, spanish: string): string {
  if (locale === 'es-MX') return spanish;
  return englishMessage(spanish);
}

function englishMessage(spanish: string): string {
  const map: Record<string, string> = {
    'Listado de snapshots de dashboard': 'Dashboard snapshots listed',
    'Snapshot de dashboard creado': 'Dashboard snapshot created',
    'Snapshot de dashboard no encontrado': 'Dashboard snapshot not found',
    'Snapshot de dashboard actualizado': 'Dashboard snapshot updated',
    'Resumen de errores CFDI no disponible en modo memoria': 'CFDI error summary is unavailable in memory mode',
    'Resumen de errores CFDI consultado': 'CFDI error summary retrieved',
    'No fue posible consultar resumen de errores CFDI': 'Unable to retrieve CFDI error summary',
    'Solicitud inválida': 'Invalid request',
    'Método no permitido': 'Method not allowed'
  };

  return map[spanish] ?? 'Operation completed';
}

