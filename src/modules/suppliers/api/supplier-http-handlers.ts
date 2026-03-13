import type { RequestContext } from '../../../core/http/http-types';
import { readJsonBody, sendJson } from '../../../core/http/http-utils';
import { recordAuditEvent } from '../../../core/audit/audit-event-recorder';
import { getUserContextFromHeaders } from '../../../core/auth/request-auth';
import { verifyAuthToken } from '../../../core/auth/token-service';
import { pgQuery } from '../../../core/db/pg-client';
import type { SupplierRepository } from '../domain/supplier-repository';
import { mapCreateSupplierToEntity, mapUpdateSupplierToEntity } from '../application/supplier-service';
import { validateCreateSupplier, validateUpdateSupplier } from './supplier-validation';

interface SupplierIncident {
  id: string;
  supplierId: string;
  occurredAt: string;
  clientName?: string;
  summary: string;
  severity: 'low' | 'medium' | 'high';
  createdAt: string;
}

interface SupplierRecentBooking {
  itineraryId: string;
  itineraryTitle: string;
  itineraryStatus: string;
  clientId: string;
  clientName: string;
  startDate?: string;
  endDate?: string;
  commissionStatus: string;
}

const supplierIncidentsMemory = new Map<string, SupplierIncident[]>();

function createEntityId(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${random}`;
}

function actorUserIdFromContext(context: RequestContext): string | null {
  const user = requestUserContext(context.req);
  return user?.userId ?? null;
}

function requestUserContext(req: RequestContext['req']): { userId: string; role: string } | null {
  const fromHeaders = getUserContextFromHeaders(req);
  if (fromHeaders) return fromHeaders;

  const authorization = req.headers.authorization;
  const raw = Array.isArray(authorization) ? authorization[0] : authorization;
  if (!raw || !raw.startsWith('Bearer ')) return null;
  return verifyAuthToken(raw.slice('Bearer '.length));
}

function readCascadeConfirmation(payload: Record<string, unknown>): string {
  return typeof payload.confirmation === 'string' ? payload.confirmation.trim() : '';
}

function isCascadeDeleteConfirmed(locale: string, confirmationText: string): boolean {
  const confirmation = confirmationText.toLowerCase();
  if (locale === 'es-MX') return confirmation === 'eliminar todo';
  return confirmation === 'delete all';
}

function canCascadeDelete(role: string | undefined): boolean {
  return role === 'owner' || role === 'manager';
}

function forbiddenCascadeMessage(locale: string): string {
  return messageByLocale(locale, 'Solo owner o manager pueden ejecutar borrado total');
}

function isPostgresStorage(): boolean {
  return (process.env.STORAGE_MODE ?? 'memory') === 'postgres';
}

function parseIncidentSeverity(value: unknown): SupplierIncident['severity'] | null {
  if (value === 'low' || value === 'medium' || value === 'high') return value;
  return null;
}

function parseIncidentDate(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const parsed = new Date(value.trim());
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

export async function handleSuppliersCollection(context: RequestContext, repository: SupplierRepository): Promise<void> {
  if (context.req.method === 'GET') {
    const data = await repository.list();
    sendJson(context.res, 200, { data, message: messageByLocale(context.locale, 'Listado de proveedores') });
    return;
  }

  if (context.req.method === 'POST') {
    const payload = await readJsonBody(context.req);
    const validation = validateCreateSupplier(payload);
    if (!validation.ok) {
      sendJson(context.res, 400, { message: messageByLocale(context.locale, 'Solicitud inválida'), errors: validation.errors });
      return;
    }

    const entity = mapCreateSupplierToEntity(validation.value);
    const data = await repository.create(entity);
    await recordAuditEvent({
      actorUserId: actorUserIdFromContext(context),
      action: 'supplier.create',
      resource: 'suppliers',
      after: data
    });
    sendJson(context.res, 201, { data, message: messageByLocale(context.locale, 'Proveedor creado') });
    return;
  }

  sendJson(context.res, 405, { message: messageByLocale(context.locale, 'Método no permitido') });
}

export async function handleSupplierResource(context: RequestContext, repository: SupplierRepository): Promise<void> {
  const supplierId = context.pathSegments[1];
  const existing = await repository.getById(supplierId);

  if (!existing) {
    sendJson(context.res, 404, { message: messageByLocale(context.locale, 'Proveedor no encontrado') });
    return;
  }

  if (context.req.method === 'GET') {
    sendJson(context.res, 200, { data: existing });
    return;
  }

  if (context.req.method === 'PATCH') {
    const payload = await readJsonBody(context.req);
    const validation = validateUpdateSupplier(payload);
    if (!validation.ok) {
      sendJson(context.res, 400, { message: messageByLocale(context.locale, 'Solicitud inválida'), errors: validation.errors });
      return;
    }

    const updated = mapUpdateSupplierToEntity(existing, validation.value);
    const data = await repository.update(updated);
    await recordAuditEvent({
      actorUserId: actorUserIdFromContext(context),
      action: 'supplier.update',
      resource: 'suppliers',
      before: existing,
      after: data
    });
    sendJson(context.res, 200, { data, message: messageByLocale(context.locale, 'Proveedor actualizado') });
    return;
  }

  if (context.req.method === 'DELETE') {
    const searchParams = new URL(context.req.url ?? '/', 'http://localhost').searchParams;
    const cascade = searchParams.get('cascade') === 'true';
    const user = requestUserContext(context.req);
    let cascadeConfirmedText: string | null = null;

    try {
      if (cascade) {
        if (!canCascadeDelete(user?.role)) {
          sendJson(context.res, 403, { message: forbiddenCascadeMessage(context.locale) });
          return;
        }

        const payload = await readJsonBody(context.req);
        cascadeConfirmedText = readCascadeConfirmation(payload);
        if (!isCascadeDeleteConfirmed(context.locale, cascadeConfirmedText)) {
          sendJson(context.res, 400, { message: messageByLocale(context.locale, 'Confirmación de borrado total inválida') });
          return;
        }
      }

      await repository.delete(existing.id, { cascade });
      await recordAuditEvent({
        actorUserId: actorUserIdFromContext(context),
        action: 'supplier.delete',
        resource: 'suppliers',
        before: existing,
        after: {
          deleted: true,
          cascade,
          cascadeConfirmedText: cascade ? cascadeConfirmedText : null
        }
      });
      sendJson(context.res, 200, {
        message: messageByLocale(context.locale, cascade ? 'Proveedor eliminado con dependencias' : 'Proveedor eliminado')
      });
      return;
    } catch (error) {
      const code = (error as { code?: string } | undefined)?.code;
      if (code === '23503') {
        sendJson(context.res, 409, { message: messageByLocale(context.locale, 'Proveedor no se puede eliminar por dependencias') });
        return;
      }
      throw error;
    }
  }

  sendJson(context.res, 405, { message: messageByLocale(context.locale, 'Método no permitido') });
}

export async function handleSupplierIncidentsCollection(context: RequestContext, repository: SupplierRepository): Promise<void> {
  const supplierId = context.pathSegments[1];
  const existing = await repository.getById(supplierId);

  if (!existing) {
    sendJson(context.res, 404, { message: messageByLocale(context.locale, 'Proveedor no encontrado') });
    return;
  }

  if (context.req.method === 'GET') {
    if (isPostgresStorage()) {
      const result = await pgQuery<{
        id: string;
        supplier_id: string;
        occurred_at: string;
        client_name: string | null;
        summary: string;
        severity: 'low' | 'medium' | 'high';
        created_at: string;
      }>(
        `
          select id, supplier_id, occurred_at, client_name, summary, severity, created_at
          from supplier_incidents
          where supplier_id = $1
          order by occurred_at desc
          limit 100
        `,
        [supplierId]
      );

      const data: SupplierIncident[] = result.rows.map((row) => ({
        id: row.id,
        supplierId: row.supplier_id,
        occurredAt: row.occurred_at,
        clientName: row.client_name ?? undefined,
        summary: row.summary,
        severity: row.severity,
        createdAt: row.created_at
      }));

      sendJson(context.res, 200, { data, message: messageByLocale(context.locale, 'Incidentes de proveedor listados') });
      return;
    }

    const data = supplierIncidentsMemory.get(supplierId) ?? [];
    sendJson(context.res, 200, { data, message: messageByLocale(context.locale, 'Incidentes de proveedor listados') });
    return;
  }

  if (context.req.method === 'POST') {
    const payload = await readJsonBody(context.req);
    const summary = typeof payload.summary === 'string' ? payload.summary.trim() : '';
    const severity = parseIncidentSeverity(payload.severity);
    const occurredAt = parseIncidentDate(payload.occurredAt) ?? new Date().toISOString();
    const clientName = typeof payload.clientName === 'string' && payload.clientName.trim() ? payload.clientName.trim() : undefined;

    if (!summary) {
      sendJson(context.res, 400, { message: messageByLocale(context.locale, 'Solicitud inválida'), errors: ['summary es requerido'] });
      return;
    }

    if (!severity) {
      sendJson(context.res, 400, { message: messageByLocale(context.locale, 'Solicitud inválida'), errors: ['severity inválido'] });
      return;
    }

    if (isPostgresStorage()) {
      const nowIso = new Date().toISOString();
      const entityId = createEntityId('supplier_incident');
      const result = await pgQuery<{
        id: string;
        supplier_id: string;
        occurred_at: string;
        client_name: string | null;
        summary: string;
        severity: 'low' | 'medium' | 'high';
        created_at: string;
      }>(
        `
          insert into supplier_incidents (
            id, supplier_id, occurred_at, client_name, summary, severity, created_at
          ) values ($1,$2,$3,$4,$5,$6,$7)
          returning id, supplier_id, occurred_at, client_name, summary, severity, created_at
        `,
        [entityId, supplierId, occurredAt, clientName ?? null, summary, severity, nowIso]
      );

      const row = result.rows[0];
      const data: SupplierIncident = {
        id: row.id,
        supplierId: row.supplier_id,
        occurredAt: row.occurred_at,
        clientName: row.client_name ?? undefined,
        summary: row.summary,
        severity: row.severity,
        createdAt: row.created_at
      };

      sendJson(context.res, 201, { data, message: messageByLocale(context.locale, 'Incidente de proveedor creado') });
      return;
    }

    const data: SupplierIncident = {
      id: createEntityId('supplier_incident'),
      supplierId,
      occurredAt,
      clientName,
      summary,
      severity,
      createdAt: new Date().toISOString()
    };
    const existingItems = supplierIncidentsMemory.get(supplierId) ?? [];
    supplierIncidentsMemory.set(supplierId, [data, ...existingItems]);
    sendJson(context.res, 201, { data, message: messageByLocale(context.locale, 'Incidente de proveedor creado') });
    return;
  }

  sendJson(context.res, 405, { message: messageByLocale(context.locale, 'Método no permitido') });
}

export async function handleSupplierRecentBookings(context: RequestContext, repository: SupplierRepository): Promise<void> {
  const supplierId = context.pathSegments[1];
  const existing = await repository.getById(supplierId);

  if (!existing) {
    sendJson(context.res, 404, { message: messageByLocale(context.locale, 'Proveedor no encontrado') });
    return;
  }

  if (context.req.method !== 'GET') {
    sendJson(context.res, 405, { message: messageByLocale(context.locale, 'Método no permitido') });
    return;
  }

  if (!isPostgresStorage()) {
    sendJson(context.res, 200, { data: [] as SupplierRecentBooking[], message: messageByLocale(context.locale, 'Reservas recientes de proveedor listadas') });
    return;
  }

  const result = await pgQuery<{
    itinerary_id: string;
    itinerary_title: string;
    itinerary_status: string;
    client_id: string;
    first_name: string;
    last_name_paternal: string;
    start_date: string | null;
    end_date: string | null;
    commission_status: string;
  }>(
    `
      select
        i.id::text as itinerary_id,
        i.title as itinerary_title,
        i.status as itinerary_status,
        c.id::text as client_id,
        c.first_name,
        c.last_name_paternal,
        i.start_date::text as start_date,
        i.end_date::text as end_date,
        cm.status as commission_status
      from commissions cm
      inner join itineraries i on i.id::text = cm.itinerary_id
      inner join clients c on c.id = i.client_id
      where cm.supplier_id = $1
        and i.status in ('draft', 'sent', 'accepted', 'paid')
      order by coalesce(i.start_date, current_date) asc, i.created_at desc
      limit 200
    `,
    [supplierId]
  );

  const data: SupplierRecentBooking[] = result.rows.map((row) => ({
    itineraryId: row.itinerary_id,
    itineraryTitle: row.itinerary_title,
    itineraryStatus: row.itinerary_status,
    clientId: row.client_id,
    clientName: `${row.first_name} ${row.last_name_paternal}`.trim(),
    startDate: row.start_date ?? undefined,
    endDate: row.end_date ?? undefined,
    commissionStatus: row.commission_status
  }));

  sendJson(context.res, 200, { data, message: messageByLocale(context.locale, 'Reservas recientes de proveedor listadas') });
}

function messageByLocale(locale: string, spanish: string): string {
  if (locale === 'es-MX') return spanish;
  return englishMessage(spanish);
}

function englishMessage(spanish: string): string {
  const map: Record<string, string> = {
    'Listado de proveedores': 'Suppliers listed',
    'Proveedor creado': 'Supplier created',
    'Proveedor no encontrado': 'Supplier not found',
    'Proveedor actualizado': 'Supplier updated',
    'Proveedor eliminado': 'Supplier deleted',
    'Proveedor eliminado con dependencias': 'Supplier and related records deleted',
    'Proveedor no se puede eliminar por dependencias': 'Supplier cannot be deleted because dependent records exist',
    'Incidentes de proveedor listados': 'Supplier incidents listed',
    'Incidente de proveedor creado': 'Supplier incident created',
    'Reservas recientes de proveedor listadas': 'Supplier recent bookings listed',
    'Confirmación de borrado total inválida': 'Invalid full delete confirmation',
    'Solo owner o manager pueden ejecutar borrado total': 'Only owner or manager can execute full delete',
    'Solicitud inválida': 'Invalid request',
    'Método no permitido': 'Method not allowed'
  };

  return map[spanish] ?? 'Operation completed';
}
