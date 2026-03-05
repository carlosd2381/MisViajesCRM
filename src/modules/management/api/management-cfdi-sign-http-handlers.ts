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
  private_key_ref: string | null;
  passphrase_ref: string | null;
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

async function persistSigningError(invoiceId: string, reason: string, detail: Record<string, unknown> = {}): Promise<void> {
  const now = new Date().toISOString();
  try {
    await pgQuery(
      `
        update cfdi_invoices
        set last_error = $2,
            updated_at = $3
        where id = $1
      `,
      [invoiceId, reason, now]
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
        invoiceId,
        'error',
        JSON.stringify({
          operation: 'sign',
          reason,
          ...detail
        }),
        now,
        now
      ]
    );
  } catch {
  }
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
          valid_to::text,
          private_key_ref,
          passphrase_ref
        from sat_certificates
        where id = $1
      `,
      [validation.value.satCertificateId]
    );

    if (certificateResult.rowCount === 0) {
      await persistSigningError(validation.value.invoiceId, 'certificate_not_found', {
        satCertificateId: validation.value.satCertificateId
      });
      sendJson(context.res, 404, { message: messageByLocale(context.locale, 'Certificado SAT no encontrado') });
      return;
    }

    const invoice = invoiceResult.rows[0];
    const certificate = certificateResult.rows[0];

    if (certificate.status !== 'active') {
      await persistSigningError(validation.value.invoiceId, 'certificate_not_active', {
        satCertificateId: validation.value.satCertificateId,
        certificateStatus: certificate.status
      });
      sendJson(context.res, 409, { message: messageByLocale(context.locale, 'Certificado SAT no activo') });
      return;
    }

    if (certificate.rfc_emisor !== invoice.rfc_emisor) {
      await persistSigningError(validation.value.invoiceId, 'certificate_rfc_mismatch', {
        satCertificateId: validation.value.satCertificateId,
        invoiceRfcEmisor: invoice.rfc_emisor,
        certificateRfcEmisor: certificate.rfc_emisor
      });
      sendJson(context.res, 409, { message: messageByLocale(context.locale, 'RFC emisor de certificado no coincide con CFDI') });
      return;
    }

    if (!withinCertificateRange(invoice.issue_date, certificate.valid_from, certificate.valid_to)) {
      await persistSigningError(validation.value.invoiceId, 'certificate_out_of_validity_range', {
        satCertificateId: validation.value.satCertificateId,
        issueDate: invoice.issue_date,
        certificateValidFrom: certificate.valid_from,
        certificateValidTo: certificate.valid_to
      });
      sendJson(context.res, 409, { message: messageByLocale(context.locale, 'Certificado SAT fuera de vigencia para CFDI') });
      return;
    }

    if (!certificate.private_key_ref || !certificate.passphrase_ref) {
      await persistSigningError(validation.value.invoiceId, 'certificate_signing_material_missing', {
        satCertificateId: validation.value.satCertificateId,
        hasPrivateKeyRef: Boolean(certificate.private_key_ref),
        hasPassphraseRef: Boolean(certificate.passphrase_ref)
      });
      sendJson(context.res, 409, { message: messageByLocale(context.locale, 'Certificado SAT incompleto para firmado') });
      return;
    }

    const xmlContent = validation.value.xmlType === 'stamped' ? invoice.xml_stamped : invoice.xml_unsigned;
    if (!xmlContent) {
      await persistSigningError(validation.value.invoiceId, 'xml_required_for_signing', {
        satCertificateId: validation.value.satCertificateId,
        xmlType: validation.value.xmlType
      });
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
          last_error = null,
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
    await persistSigningError(validation.value.invoiceId, 'sign_operation_failed', {
      satCertificateId: validation.value.satCertificateId,
      xmlType: validation.value.xmlType
    });
    sendJson(context.res, 503, {
      message: messageByLocale(context.locale, 'No fue posible firmar CFDI'),
      errors: [error instanceof Error ? error.message : 'Unknown database error']
    });
  }
}
