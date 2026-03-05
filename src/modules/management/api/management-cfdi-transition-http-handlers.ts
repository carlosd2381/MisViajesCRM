import type { RequestContext } from '../../../core/http/http-types';
import { readJsonBody, sendJson } from '../../../core/http/http-utils';
import { pgQuery } from '../../../core/db/pg-client';
import { validateCfdiCancelConfirmRequest, validateCfdiStampConfirmRequest } from './management-validation';
import { messageByLocale } from './management-http-handlers';

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
    if (validation.value.cancellationReason === '01') {
      const replacementValidation = await validateReplacementCfdiForCancellation(
        validation.value.invoiceId,
        validation.value.replacementCfdiUuid
      );

      if (!replacementValidation.ok) {
        sendJson(context.res, 409, { message: messageByLocale(context.locale, 'CFDI de reemplazo no encontrado') });
        return;
      }
    }

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

interface CfdiLifecycleEventInput {
  invoiceId: string;
  eventType: 'stamped' | 'cancelled';
  detail: Record<string, unknown>;
}

function createEventId(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${random}`;
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

async function validateReplacementCfdiForCancellation(
  invoiceId: string,
  replacementCfdiUuid: string | undefined
): Promise<{ ok: boolean }> {
  if (!replacementCfdiUuid) return { ok: false };

  const result = await pgQuery<{ id: string }>(
    `
      select id
      from cfdi_invoices
      where cfdi_uuid = $1
        and status = 'stamped'
        and id <> $2
      limit 1
    `,
    [replacementCfdiUuid, invoiceId]
  );

  return { ok: (result.rowCount ?? 0) > 0 };
}
