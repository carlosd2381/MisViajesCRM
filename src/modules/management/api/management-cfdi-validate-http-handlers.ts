import type { RequestContext } from '../../../core/http/http-types';
import { readJsonBody, sendJson } from '../../../core/http/http-utils';
import { pgQuery } from '../../../core/db/pg-client';
import { validateCfdiCancelRequest, validateCfdiStampRequest } from './management-validation';
import { messageByLocale } from './management-http-handlers';

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
