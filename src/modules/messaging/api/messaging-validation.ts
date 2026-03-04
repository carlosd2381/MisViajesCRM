import { failure, success, type ValidationResult } from '../../../core/validation/validation-types';
import {
  MESSAGE_CHANNEL,
  MESSAGE_DIRECTION,
  MESSAGE_STATUS,
  type MessageChannel,
  type MessageDirection,
  type MessageStatus
} from '../domain/communication-log';
import type { CreateMessageRequest, UpdateMessageRequest } from './messaging-contracts';

type UnknownRecord = Record<string, unknown>;

function asText(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function asEnum<T extends string>(value: unknown, values: readonly T[]): T | undefined {
  return typeof value === 'string' && values.includes(value as T) ? (value as T) : undefined;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  return value as Record<string, unknown>;
}

export function validateCreateMessage(payload: UnknownRecord): ValidationResult<CreateMessageRequest> {
  const errors: string[] = [];

  const clientId = asText(payload.clientId);
  const agentId = asText(payload.agentId);
  const channel = asEnum<MessageChannel>(payload.channel, MESSAGE_CHANNEL);
  const direction = asEnum<MessageDirection>(payload.direction, MESSAGE_DIRECTION);
  const content = asText(payload.content);
  const status = asEnum<MessageStatus>(payload.status, MESSAGE_STATUS);
  const metadataJson = asRecord(payload.metadataJson);
  const threadId = asText(payload.threadId);

  if (!clientId) errors.push('clientId es requerido');
  if (!channel) errors.push('channel inválido');
  if (!direction) errors.push('direction inválido');
  if (!content) errors.push('content es requerido');
  if ('status' in payload && !status) errors.push('status inválido');
  if ('metadataJson' in payload && !metadataJson) errors.push('metadataJson inválido');
  if (!threadId) errors.push('threadId es requerido');

  if (errors.length > 0) return failure(errors);

  return success({
    clientId: clientId as string,
    agentId,
    channel: channel as MessageChannel,
    direction: direction as MessageDirection,
    content: content as string,
    status,
    metadataJson,
    threadId: threadId as string
  });
}

export function validateUpdateMessage(payload: UnknownRecord): ValidationResult<UpdateMessageRequest> {
  const result: UpdateMessageRequest = {};
  const errors: string[] = [];

  if ('content' in payload) result.content = asText(payload.content);
  if ('status' in payload) result.status = asEnum(payload.status, MESSAGE_STATUS);
  if ('metadataJson' in payload) result.metadataJson = asRecord(payload.metadataJson);

  if ('status' in payload && !result.status) errors.push('status inválido');
  if ('metadataJson' in payload && !result.metadataJson) errors.push('metadataJson inválido');

  if (errors.length > 0) return failure(errors);
  return success(result);
}
