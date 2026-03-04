import type {
  CommunicationLog,
  MessageChannel,
  MessageDirection,
  MessageStatus
} from '../domain/communication-log';

export interface CreateMessageRequest {
  clientId: string;
  agentId?: string;
  channel: MessageChannel;
  direction: MessageDirection;
  content: string;
  status?: MessageStatus;
  metadataJson?: Record<string, unknown>;
  threadId: string;
}

export interface UpdateMessageRequest {
  content?: string;
  status?: MessageStatus;
  metadataJson?: Record<string, unknown>;
}

export interface MessageResponse {
  data: CommunicationLog;
}

export interface MessageListResponse {
  data: CommunicationLog[];
}
