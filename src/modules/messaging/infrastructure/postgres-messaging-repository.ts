import { pgQuery } from '../../../core/db/pg-client';
import type { CommunicationLog } from '../domain/communication-log';
import type { MessagingRepository } from '../domain/messaging-repository';

interface CommunicationLogRow {
  id: string;
  client_id: string;
  agent_id: string | null;
  channel: CommunicationLog['channel'];
  direction: CommunicationLog['direction'];
  content: string;
  status: CommunicationLog['status'];
  metadata_json: Record<string, unknown> | null;
  thread_id: string;
  created_at: string;
  updated_at: string;
}

function mapRow(row: CommunicationLogRow): CommunicationLog {
  return {
    id: row.id,
    clientId: row.client_id,
    agentId: row.agent_id ?? undefined,
    channel: row.channel,
    direction: row.direction,
    content: row.content,
    status: row.status,
    metadataJson: row.metadata_json ?? undefined,
    threadId: row.thread_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export class PostgresMessagingRepository implements MessagingRepository {
  async list(): Promise<CommunicationLog[]> {
    const sql = 'select * from communication_logs order by created_at desc';
    const result = await pgQuery<CommunicationLogRow>(sql);
    return result.rows.map(mapRow);
  }

  async getById(id: string): Promise<CommunicationLog | null> {
    const sql = 'select * from communication_logs where id = $1';
    const result = await pgQuery<CommunicationLogRow>(sql, [id]);
    return result.rows[0] ? mapRow(result.rows[0]) : null;
  }

  async create(entity: CommunicationLog): Promise<CommunicationLog> {
    const sql = `
      insert into communication_logs (
        id, client_id, agent_id, channel, direction,
        content, status, metadata_json, thread_id,
        created_at, updated_at
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11
      ) returning *
    `;

    const params = [
      entity.id,
      entity.clientId,
      entity.agentId ?? null,
      entity.channel,
      entity.direction,
      entity.content,
      entity.status,
      entity.metadataJson ?? null,
      entity.threadId,
      entity.createdAt,
      entity.updatedAt
    ];

    const result = await pgQuery<CommunicationLogRow>(sql, params);
    return mapRow(result.rows[0]);
  }

  async update(entity: CommunicationLog): Promise<CommunicationLog> {
    const sql = `
      update communication_logs set
        content = $2,
        status = $3,
        metadata_json = $4,
        updated_at = $5
      where id = $1
      returning *
    `;

    const params = [
      entity.id,
      entity.content,
      entity.status,
      entity.metadataJson ?? null,
      entity.updatedAt
    ];

    const result = await pgQuery<CommunicationLogRow>(sql, params);
    return mapRow(result.rows[0]);
  }
}
