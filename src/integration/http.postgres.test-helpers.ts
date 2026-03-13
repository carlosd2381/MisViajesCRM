import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createApiServer } from '../app';
import { pgQuery } from '../core/db/pg-client';
import { integrationTestHeaders } from './test-harness';

const REQUIRED_POSTGRES_ENV = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'] as const;
export const ACTOR_USER_ID = '7f8f3d10-49ab-4b5b-8dc8-94fdcf124501';
const ACTOR_USER_EMAIL = 'postgres.audit.actor@misviajes.local';

export function hasRequiredPostgresEnv(): boolean {
  return REQUIRED_POSTGRES_ENV.every((name) => Boolean(process.env[name]));
}

export function actorHeaders(role: string, locale = 'es-MX'): Record<string, string> {
  return integrationTestHeaders(role, locale, ACTOR_USER_ID);
}

export async function isAuditSchemaReady(): Promise<boolean> {
  const result = await pgQuery<{ audit_table: string | null; leads_table: string | null; clients_table: string | null }>(
    `
      select
        to_regclass('public.audit_events')::text as audit_table,
        to_regclass('public.leads')::text as leads_table,
        to_regclass('public.clients')::text as clients_table
    `
  );

  const row = result.rows[0];
  return row.audit_table === 'audit_events' && row.leads_table === 'leads' && row.clients_table === 'clients';
}

export async function isCfdiSchemaReady(): Promise<boolean> {
  const result = await pgQuery<{ cfdi_invoice_events: string | null; cfdi_invoices: string | null }>(
    `
      select
        to_regclass('public.cfdi_invoice_events')::text as cfdi_invoice_events,
        to_regclass('public.cfdi_invoices')::text as cfdi_invoices
    `
  );

  const row = result.rows[0];
  return row.cfdi_invoice_events === 'cfdi_invoice_events' && row.cfdi_invoices === 'cfdi_invoices';
}

export async function isCfdiSatSchemaReady(): Promise<boolean> {
  const result = await pgQuery<{ sat_certificates: string | null }>(
    `
      select
        to_regclass('public.sat_certificates')::text as sat_certificates
    `
  );

  const row = result.rows[0];
  return row.sat_certificates === 'sat_certificates';
}

export function setEnv(key: string, value: string): () => void {
  const previous = process.env[key];
  process.env[key] = value;

  return () => {
    if (previous === undefined) {
      delete process.env[key];
      return;
    }

    process.env[key] = previous;
  };
}

export function startPostgresServer(): Promise<{ server: Server; baseUrl: string }> {
  const server = createApiServer(undefined, { authMode: 'header' });

  return new Promise((resolve) => {
    server.listen(0, () => {
      const address = server.address() as AddressInfo;
      resolve({ server, baseUrl: `http://127.0.0.1:${address.port}` });
    });
  });
}

export async function stopServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

export async function cleanupLeadArtifacts(leadId: string): Promise<void> {
  await pgQuery(
    "delete from audit_events where resource = $1 and action in ($2, $3, $4) and coalesce(after_json->>'id', after_json->'lead'->>'id') = $5",
    ['leads', 'lead.create', 'lead.update', 'lead.convert', leadId]
  );
  await pgQuery('delete from clients where lead_id = $1', [leadId]);
  await pgQuery('delete from leads where id = $1', [leadId]);
}

export async function ensureAuditActorUser(): Promise<void> {
  await pgQuery(
    `
      insert into users (id, full_name, email, role_id, is_active)
      values (
        $1,
        $2,
        $3,
        (select id from roles where code = 'agent' limit 1),
        true
      )
      on conflict (id) do update set
        full_name = excluded.full_name,
        email = excluded.email,
        role_id = excluded.role_id,
        is_active = excluded.is_active,
        updated_at = now()
    `,
    [ACTOR_USER_ID, 'Postgres Audit Actor', ACTOR_USER_EMAIL]
  );
}

export async function cleanupCfdiValidationArtifacts(invoiceId: string): Promise<void> {
  await pgQuery('delete from cfdi_invoice_events where cfdi_invoice_id = $1', [invoiceId]);
  await pgQuery('delete from cfdi_invoices where id = $1', [invoiceId]);
}

export async function cleanupSatCertificateArtifacts(certificateId: string): Promise<void> {
  await pgQuery('delete from sat_certificates where id = $1', [certificateId]);
}

export async function seedSatCertificate(
  certificateId: string,
  options: {
    privateKeyRef?: string | null;
    passphraseRef?: string | null;
    certificatePemRef?: string | null;
  } = {}
): Promise<void> {
  const now = new Date().toISOString();
  const privateKeyRef =
    Object.prototype.hasOwnProperty.call(options, 'privateKeyRef')
      ? options.privateKeyRef
      : 'vault://sat/cert/private-key';
  const passphraseRef =
    Object.prototype.hasOwnProperty.call(options, 'passphraseRef')
      ? options.passphraseRef
      : 'vault://sat/cert/passphrase';
  const certificatePemRef =
    Object.prototype.hasOwnProperty.call(options, 'certificatePemRef')
      ? options.certificatePemRef
      : 'vault://sat/cert/pem';
  await pgQuery(
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
      ) values ($1, $2, $3, null, $4, $5, $6::date, $7::date, $8, $9, $10, $11, $12)
    `,
    [
      certificateId,
      'AAA010101AAA',
      `30001000000500003416-${Date.now()}`,
      'csd',
      'active',
      '2026-01-01',
      '2027-01-01',
      certificatePemRef,
      privateKeyRef,
      passphraseRef,
      now,
      now
    ]
  );
}

export async function seedCfdiInvoice(invoiceId: string): Promise<void> {
  const now = new Date().toISOString();
  await pgQuery(
    `
      insert into cfdi_invoices (
        id,
        rfc_emisor,
        rfc_receptor,
        tipo_comprobante,
        moneda,
        subtotal,
        impuestos_total,
        total,
        status,
        issue_date,
        created_at,
        updated_at
      ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `,
    [
      invoiceId,
      'AAA010101AAA',
      'BBB010101BBB',
      'I',
      'MXN',
      1000,
      160,
      1160,
      'ready_to_stamp',
      now,
      now,
      now
    ]
  );
}

export async function seedStampedCfdiInvoice(invoiceId: string, cfdiUuid: string): Promise<void> {
  const now = new Date().toISOString();
  await pgQuery(
    `
      insert into cfdi_invoices (
        id,
        rfc_emisor,
        rfc_receptor,
        tipo_comprobante,
        moneda,
        subtotal,
        impuestos_total,
        total,
        status,
        issue_date,
        cfdi_uuid,
        stamped_at,
        created_at,
        updated_at
      ) values ($1, $2, $3, $4, $5, $6, $7, $8, 'stamped', $9, $10, $11, $12, $13)
    `,
    [
      invoiceId,
      'AAA010101AAA',
      'BBB010101BBB',
      'I',
      'MXN',
      2000,
      320,
      2320,
      now,
      cfdiUuid,
      now,
      now,
      now
    ]
  );
}

export async function seedCfdiInvoiceErrorEvent(
  invoiceId: string,
  eventId: string,
  eventAt: string,
  reason = 'certificate_signing_material_missing'
): Promise<void> {
  await pgQuery(
    `
      insert into cfdi_invoice_events (
        id,
        cfdi_invoice_id,
        event_type,
        detail_json,
        event_at,
        created_at
      ) values (
        $1,
        $2,
        'error',
        jsonb_build_object('operation', 'sign', 'reason', $3::text),
        $4::timestamptz,
        $4::timestamptz
      )
    `,
    [eventId, invoiceId, reason, eventAt]
  );
}

export async function seedCfdiInvoiceEvent(
  invoiceId: string,
  eventId: string,
  eventType: 'generated' | 'validation_passed' | 'validation_failed' | 'stamped' | 'cancelled' | 'error',
  eventAt: string,
  detail: Record<string, unknown> = {}
): Promise<void> {
  await pgQuery(
    `
      insert into cfdi_invoice_events (
        id,
        cfdi_invoice_id,
        event_type,
        detail_json,
        event_at,
        created_at
      ) values (
        $1,
        $2,
        $3,
        $4::jsonb,
        $5::timestamptz,
        $5::timestamptz
      )
    `,
    [eventId, invoiceId, eventType, JSON.stringify(detail), eventAt]
  );
}
