import { randomUUID } from 'node:crypto';
import type { RequestContext } from '../../../core/http/http-types';
import { readJsonBody, sendJson } from '../../../core/http/http-utils';
import { pgQuery } from '../../../core/db/pg-client';
import { validateCreateSatCertificateRequest } from './management-validation';
import { messageByLocale } from './management-http-handlers';

interface SatCertificateRow {
  id: string;
  rfc_emisor: string;
  certificate_number: string;
  serial_number: string | null;
  certificate_source: 'csd' | 'fiel' | 'other';
  status: 'pending_validation' | 'active' | 'expired' | 'revoked';
  valid_from: string;
  valid_to: string;
  certificate_pem_ref: string | null;
  private_key_ref: string | null;
  passphrase_ref: string | null;
  created_at: string;
  updated_at: string;
}

function mapSatCertificate(row: SatCertificateRow) {
  return {
    id: row.id,
    rfcEmisor: row.rfc_emisor,
    certificateNumber: row.certificate_number,
    serialNumber: row.serial_number,
    certificateSource: row.certificate_source,
    status: row.status,
    validFrom: row.valid_from,
    validTo: row.valid_to,
    certificatePemRef: row.certificate_pem_ref,
    privateKeyRef: row.private_key_ref,
    passphraseRef: row.passphrase_ref,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function asText(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

export async function handleManagementCfdiCertificatesCollection(context: RequestContext): Promise<void> {
  if (context.req.method !== 'GET' && context.req.method !== 'POST') {
    sendJson(context.res, 405, { message: messageByLocale(context.locale, 'Método no permitido') });
    return;
  }

  const storageMode = process.env.STORAGE_MODE ?? 'memory';
  if (storageMode !== 'postgres') {
    if (context.req.method === 'GET') {
      sendJson(context.res, 200, {
        data: {
          storageMode,
          count: 0,
          certificates: []
        },
        message: messageByLocale(context.locale, 'Certificados SAT no disponibles en modo memoria')
      });
      return;
    }

    sendJson(context.res, 200, {
      data: {
        storageMode,
        created: false,
        reason: 'storage_mode_not_postgres'
      },
      message: messageByLocale(context.locale, 'Creación de certificado SAT no disponible en modo memoria')
    });
    return;
  }

  if (context.req.method === 'GET') {
    const searchParams = new URL(context.req.url ?? '/', 'http://localhost').searchParams;
    const rfcEmisor = asText(searchParams.get('rfcEmisor'))?.toUpperCase();
    const status = asText(searchParams.get('status'));
    const limitInput = Number.parseInt(searchParams.get('limit') ?? '20', 10);
    const limit = Number.isFinite(limitInput) ? Math.min(Math.max(limitInput, 1), 100) : 20;

    const filters: string[] = [];
    const params: unknown[] = [];

    if (rfcEmisor) {
      params.push(rfcEmisor);
      filters.push(`rfc_emisor = $${params.length}`);
    }

    if (status) {
      params.push(status);
      filters.push(`status = $${params.length}`);
    }

    params.push(limit);
    const whereClause = filters.length > 0 ? `where ${filters.join(' and ')}` : '';

    try {
      const result = await pgQuery<SatCertificateRow>(
        `
          select
            id,
            rfc_emisor,
            certificate_number,
            serial_number,
            certificate_source,
            status,
            valid_from::text,
            valid_to::text,
            certificate_pem_ref,
            private_key_ref,
            passphrase_ref,
            created_at::text,
            updated_at::text
          from sat_certificates
          ${whereClause}
          order by created_at desc
          limit $${params.length}
        `,
        params
      );

      sendJson(context.res, 200, {
        data: {
          storageMode,
          count: result.rows.length,
          certificates: result.rows.map(mapSatCertificate)
        },
        message: messageByLocale(context.locale, 'Certificados SAT consultados')
      });
    } catch (error) {
      sendJson(context.res, 503, {
        data: {
          storageMode,
          count: 0,
          certificates: []
        },
        message: messageByLocale(context.locale, 'No fue posible consultar certificados SAT'),
        errors: [error instanceof Error ? error.message : 'Unknown database error']
      });
    }

    return;
  }

  const payload = await readJsonBody(context.req);
  const validation = validateCreateSatCertificateRequest(payload);
  if (!validation.ok) {
    sendJson(context.res, 400, {
      message: messageByLocale(context.locale, 'Solicitud inválida'),
      errors: validation.errors
    });
    return;
  }

  const id = randomUUID();
  const now = new Date().toISOString();

  try {
    const result = await pgQuery<SatCertificateRow>(
      `
        insert into sat_certificates (
          id,
          rfc_emisor,
          certificate_number,
          serial_number,
          certificate_source,
          status,
          valid_from,
          valid_to,
          certificate_pem_ref,
          private_key_ref,
          passphrase_ref,
          created_at,
          updated_at
        ) values ($1, $2, $3, $4, $5, $6, $7::date, $8::date, $9, $10, $11, $12, $13)
        returning
          id,
          rfc_emisor,
          certificate_number,
          serial_number,
          certificate_source,
          status,
          valid_from::text,
          valid_to::text,
          certificate_pem_ref,
          private_key_ref,
          passphrase_ref,
          created_at::text,
          updated_at::text
      `,
      [
        id,
        validation.value.rfcEmisor,
        validation.value.certificateNumber,
        validation.value.serialNumber ?? null,
        validation.value.certificateSource,
        validation.value.status,
        validation.value.validFrom,
        validation.value.validTo,
        validation.value.certificatePemRef ?? null,
        validation.value.privateKeyRef ?? null,
        validation.value.passphraseRef ?? null,
        now,
        now
      ]
    );

    sendJson(context.res, 201, {
      data: mapSatCertificate(result.rows[0]),
      message: messageByLocale(context.locale, 'Certificado SAT creado')
    });
  } catch (error) {
    sendJson(context.res, 503, {
      message: messageByLocale(context.locale, 'No fue posible crear certificado SAT'),
      errors: [error instanceof Error ? error.message : 'Unknown database error']
    });
  }
}

export async function handleManagementCfdiCertificateResource(context: RequestContext): Promise<void> {
  if (context.req.method !== 'GET') {
    sendJson(context.res, 405, { message: messageByLocale(context.locale, 'Método no permitido') });
    return;
  }

  const storageMode = process.env.STORAGE_MODE ?? 'memory';
  const certificateId = asText(context.pathSegments[3]);

  if (!certificateId) {
    sendJson(context.res, 400, {
      message: messageByLocale(context.locale, 'Solicitud inválida'),
      errors: ['certificateId es requerido']
    });
    return;
  }

  if (storageMode !== 'postgres') {
    sendJson(context.res, 200, {
      data: {
        storageMode,
        certificate: null
      },
      message: messageByLocale(context.locale, 'Certificado SAT no disponible en modo memoria')
    });
    return;
  }

  try {
    const result = await pgQuery<SatCertificateRow>(
      `
        select
          id,
          rfc_emisor,
          certificate_number,
          serial_number,
          certificate_source,
          status,
          valid_from::text,
          valid_to::text,
          certificate_pem_ref,
          private_key_ref,
          passphrase_ref,
          created_at::text,
          updated_at::text
        from sat_certificates
        where id = $1
      `,
      [certificateId]
    );

    if (result.rowCount === 0) {
      sendJson(context.res, 404, { message: messageByLocale(context.locale, 'Certificado SAT no encontrado') });
      return;
    }

    sendJson(context.res, 200, {
      data: mapSatCertificate(result.rows[0]),
      message: messageByLocale(context.locale, 'Certificado SAT consultado')
    });
  } catch (error) {
    sendJson(context.res, 503, {
      message: messageByLocale(context.locale, 'No fue posible consultar certificado SAT'),
      errors: [error instanceof Error ? error.message : 'Unknown database error']
    });
  }
}
