import { randomUUID } from 'node:crypto';
import type { RequestContext } from '../../../core/http/http-types';
import { readJsonBody, sendJson } from '../../../core/http/http-utils';
import { pgQuery } from '../../../core/db/pg-client';
import { validateCfdiXmlRequest, validatePersistCfdiXmlRequest } from './management-validation';
import { messageByLocale } from './management-http-handlers';

interface CfdiXmlEventInput {
  invoiceId: string;
  eventType: 'generated' | 'validation_passed' | 'validation_failed';
  detail: Record<string, unknown>;
}

function createEventId(): string {
  return `cfdi_evt_${randomUUID()}`;
}

async function recordCfdiXmlEvent(input: CfdiXmlEventInput): Promise<boolean> {
  if ((process.env.STORAGE_MODE ?? 'memory') !== 'postgres') return false;

  const now = new Date().toISOString();
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
      [createEventId(), input.invoiceId, input.eventType, JSON.stringify(input.detail), now, now]
    );
    return true;
  } catch {
    return false;
  }
}

export async function handleManagementCfdiXmlValidation(context: RequestContext): Promise<void> {
  if (context.req.method !== 'POST') {
    sendJson(context.res, 405, { message: messageByLocale(context.locale, 'Método no permitido') });
    return;
  }

  const payload = await readJsonBody(context.req);
  const validation = validateCfdiXmlRequest(payload);

  if (!validation.ok) {
    const eventRecorded = await recordCfdiXmlEvent({
      invoiceId: typeof payload.invoiceId === 'string' ? payload.invoiceId : '',
      eventType: 'validation_failed',
      detail: {
        operation: 'xml_validate',
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

  const xmlLength = Buffer.byteLength(validation.value.xmlContent, 'utf8');
  const eventRecorded = await recordCfdiXmlEvent({
    invoiceId: validation.value.invoiceId,
    eventType: 'validation_passed',
    detail: {
      operation: 'xml_validate',
      xmlType: validation.value.xmlType,
      xmlLength
    }
  });

  sendJson(context.res, 200, {
    data: {
      valid: true,
      operation: 'xml_validate',
      normalizedRequest: {
        invoiceId: validation.value.invoiceId,
        xmlType: validation.value.xmlType,
        xmlLength
      },
      eventRecorded
    },
    message: messageByLocale(context.locale, 'Contrato XML CFDI válido')
  });
}

export async function handleManagementCfdiXmlPersist(context: RequestContext): Promise<void> {
  if (context.req.method !== 'POST') {
    sendJson(context.res, 405, { message: messageByLocale(context.locale, 'Método no permitido') });
    return;
  }

  const payload = await readJsonBody(context.req);
  const validation = validatePersistCfdiXmlRequest(payload);

  if (!validation.ok) {
    sendJson(context.res, 400, {
      message: messageByLocale(context.locale, 'Solicitud inválida'),
      errors: validation.errors
    });
    return;
  }

  if ((process.env.STORAGE_MODE ?? 'memory') !== 'postgres') {
    sendJson(context.res, 200, {
      data: {
        persisted: false,
        storageMode: process.env.STORAGE_MODE ?? 'memory',
        reason: 'storage_mode_not_postgres'
      },
      message: messageByLocale(context.locale, 'Persistencia XML CFDI no disponible en modo memoria')
    });
    return;
  }

  const xmlLength = Buffer.byteLength(validation.value.xmlContent, 'utf8');
  const now = new Date().toISOString();

  try {
    const updateSql =
      validation.value.xmlType === 'stamped'
        ? `
            update cfdi_invoices
            set xml_stamped = $2,
                updated_at = $3
            where id = $1
            returning id
          `
        : `
            update cfdi_invoices
            set xml_unsigned = $2,
                updated_at = $3
            where id = $1
            returning id
          `;

    const updateResult = await pgQuery<{ id: string }>(updateSql, [
      validation.value.invoiceId,
      validation.value.xmlContent,
      now
    ]);

    if (updateResult.rowCount === 0) {
      sendJson(context.res, 404, { message: messageByLocale(context.locale, 'CFDI no encontrado') });
      return;
    }

    const eventRecorded = await recordCfdiXmlEvent({
      invoiceId: validation.value.invoiceId,
      eventType: 'generated',
      detail: {
        operation: 'xml_persist',
        xmlType: validation.value.xmlType,
        xmlLength
      }
    });

    sendJson(context.res, 200, {
      data: {
        persisted: true,
        invoiceId: validation.value.invoiceId,
        xmlType: validation.value.xmlType,
        xmlLength,
        eventRecorded
      },
      message: messageByLocale(context.locale, 'XML CFDI persistido')
    });
  } catch (error) {
    sendJson(context.res, 503, {
      message: messageByLocale(context.locale, 'No fue posible persistir XML CFDI'),
      errors: [error instanceof Error ? error.message : 'Unknown database error']
    });
  }
}
