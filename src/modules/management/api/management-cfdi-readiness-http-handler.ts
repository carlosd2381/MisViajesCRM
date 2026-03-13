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
