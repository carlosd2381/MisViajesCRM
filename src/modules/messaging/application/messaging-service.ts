import type { CreateMessageRequest, UpdateMessageRequest } from '../api/messaging-contracts';
import type { CommunicationLog } from '../domain/communication-log';

function nowIsoDate(): string {
  return new Date().toISOString();
}

function createEntityId(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${random}`;
}

export function mapCreateMessageToEntity(input: CreateMessageRequest): CommunicationLog {
  const timestamp = nowIsoDate();

  return {
    id: createEntityId('msg'),
    clientId: input.clientId,
    agentId: input.agentId,
    channel: input.channel,
    direction: input.direction,
    content: input.content,
    status: input.status ?? 'sent',
    metadataJson: input.metadataJson,
    threadId: input.threadId,
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

export function mapUpdateMessageToEntity(current: CommunicationLog, input: UpdateMessageRequest): CommunicationLog {
  return {
    ...current,
    ...input,
    updatedAt: nowIsoDate()
  };
}
