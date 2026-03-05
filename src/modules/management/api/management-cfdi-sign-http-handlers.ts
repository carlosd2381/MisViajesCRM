import { createHash, randomUUID } from 'node:crypto';
import type { RequestContext } from '../../../core/http/http-types';
import { readJsonBody, sendJson } from '../../../core/http/http-utils';
import { pgQuery } from '../../../core/db/pg-client';
import { validateSignCfdiRequest } from './management-validation';
import { messageByLocale } from './management-http-handlers';

interface InvoiceSignatureRow {
  id: string;
  rfc_emisor: string;
  rfc_receptor: string;
  issue_date: string;
  xml_unsigned: string | null;
  xml_stamped: string | null;
}

interface SatCertificateRow {
  id: string;
  rfc_emisor: string;
  certificate_number: string;
  status: 'pending_validation' | 'active' | 'expired' | 'revoked';
  valid_from: string;
  valid_to: string;
}

function createEventId(): string {
  return `cfdi_evt_${randomUUID()}`;
}

function hashDigest(value: string, digestAlgorithm: 'sha256' | 'sha384' | 'sha512'): string {
  return createHash(digestAlgorithm).update(value, 'utf8').digest('base64');
}

function withinCertificateRange(issueDate: string, validFrom: string, validTo: string): boolean {
  const issue = Date.parse(issueDate);
  const from = Date.parse(validFrom);
  const to = Date.parse(validTo);
  if (!Number.isFinite(issue) || !Number.isFinite(from) || !Number.isFinite(to)) return false;
  return issue >= from && issue <= to;
}

export async function handleManagementCfdiSign(context: RequestContext): Promise<void> {
  if (context.req.method !== 'POST') {
    sendJson(context.res, 405, { message: messageByLocale(context.locale, 'Método no permitido') });
    return;
  }

  const payload = await readJsonBody(context.req);
  const validation = validateSignCfdiRequest(payload);

  if (!validation.ok) {
    sendJson(context.res, 400, {
      message: messageByLocale(context.locale, 'Solicitud inválida'),
      errors: validation.errors
    });
    return;
  }

  const storageMode = process.env.STORAGE_MODE ?? 'memory';
  if (storageMode !== 'postgres') {
    sendJson(context.res, 200, {
      data: {
        signed: false,
        storageMode,
        reason: 'storage_mode_not_postgres'
      },
      message: messageByLocale(context.locale, 'Firmado CFDI no disponible en modo memoria')
    });
    return;
  }

  try {
    const invoiceResult = await pgQuery<InvoiceSignatureRow>(
      `
        select
          id,
          rfc_emisor,
          rfc_receptor,
          issue_date::text,
          xml_unsigned,
          xml_stamped
        from cfdi_invoices
        where id = $1
      `,
      [validation.value.invoiceId]
    );

    if (invoiceResult.rowCount === 0) {
      sendJson(context.res, 404, { message: messageByLocale(context.locale, 'CFDI no encontrado') });
      return;
    }

    const certificateResult = await pgQuery<SatCertificateRow>(
      `
        select
          id,
          rfc_emisor,
          certificate_number,
          status,
          valid_from::text,
          valid_to::text
        from sat_certificates
        where id = $1
      `,
      [validation.value.satCertificateId]
    );

    if (certificateResult.rowCount === 0) {
      sendJson(context.res, 404, { message: messageByLocale(context.locale, 'Certificado SAT no encontrado') });
      return;
    }

    const invoice = invoiceResult.rows[0];
    const certificate = certificateResult.rows[0];

    if (certificate.status !== 'active') {
      sendJson(context.res, 409, { message: messageByLocale(context.locale, 'Certificado SAT no activo') });
      return;
    }

    if (certificate.rfc_emisor !== invoice.rfc_emisor) {
      sendJson(context.res, 409, { message: messageByLocale(context.locale, 'RFC emisor de certificado no coincide con CFDI') });
      return;
    }

    if (!withinCertificateRange(invoice.issue_date, certificate.valid_from, certificate.valid_to)) {
      sendJson(context.res, 409, { message: messageByLocale(context.locale, 'Certificado SAT fuera de vigencia para CFDI') });
      return;
    }

    const xmlContent = validation.value.xmlType === 'stamped' ? invoice.xml_stamped : invoice.xml_unsigned;
    if (!xmlContent) {
      sendJson(context.res, 409, { message: messageByLocale(context.locale, 'XML CFDI requerido para firmado') });
      return;
    }

    const digestAlgorithm = validation.value.digestAlgorithm ?? 'sha256';
    const xmlLength = Buffer.byteLength(xmlContent, 'utf8');
    const cadenaOriginal = `||4.0|${invoice.id}|${invoice.rfc_emisor}|${invoice.rfc_receptor}|${validation.value.xmlType}|${xmlLength}||`;
    const selloDigital = hashDigest(
      `${cadenaOriginal}|${certificate.certificate_number}|${digestAlgorithm}`,
      digestAlgorithm
    );

    const now = new Date().toISOString();
    await pgQuery(
      `
        update cfdi_invoices
        set sat_certificate_id = $2,
            cadena_original = $3,
            sello_digital = $4,
            updated_at = $5
        where id = $1
      `,
      [validation.value.invoiceId, validation.value.satCertificateId, cadenaOriginal, selloDigital, now]
    );

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
      [
        createEventId(),
        validation.value.invoiceId,
        'generated',
        JSON.stringify({
          operation: 'sign',
          satCertificateId: validation.value.satCertificateId,
          xmlType: validation.value.xmlType,
          digestAlgorithm,
          xmlLength
        }),
        now,
        now
      ]
    );

    sendJson(context.res, 200, {
      data: {
        signed: true,
        invoiceId: validation.value.invoiceId,
        satCertificateId: validation.value.satCertificateId,
        xmlType: validation.value.xmlType,
        digestAlgorithm,
        xmlLength
      },
      message: messageByLocale(context.locale, 'CFDI firmado')
    });
  } catch (error) {
    sendJson(context.res, 503, {
      message: messageByLocale(context.locale, 'No fue posible firmar CFDI'),
      errors: [error instanceof Error ? error.message : 'Unknown database error']
    });
  }
}
