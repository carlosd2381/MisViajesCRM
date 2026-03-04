import { pgQuery } from '../db/pg-client';

interface AuditEventInput {
  actorUserId: string | null;
  action: string;
  resource: string;
  before?: unknown;
  after?: unknown;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function toUuidOrNull(value: string | null): string | null {
  if (!value) return null;
  return isUuid(value) ? value : null;
}

export async function recordAuditEvent(event: AuditEventInput): Promise<void> {
  if ((process.env.STORAGE_MODE ?? 'memory') !== 'postgres') return;

  const sql = `
    insert into audit_events (
      actor_user_id, action, resource, resource_id, before_json, after_json
    ) values ($1, $2, $3, $4, $5, $6)
  `;

  try {
    await pgQuery(sql, [
      toUuidOrNull(event.actorUserId),
      event.action,
      event.resource,
      null,
      event.before ?? null,
      event.after ?? null
    ]);
  } catch {
    return;
  }
}
