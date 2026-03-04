export const MESSAGE_CHANNEL = ['whatsapp', 'email', 'sms', 'internal_note'] as const;
export const MESSAGE_DIRECTION = ['inbound', 'outbound'] as const;
export const MESSAGE_STATUS = ['sent', 'delivered', 'read', 'replied'] as const;

export type MessageChannel = (typeof MESSAGE_CHANNEL)[number];
export type MessageDirection = (typeof MESSAGE_DIRECTION)[number];
export type MessageStatus = (typeof MESSAGE_STATUS)[number];

export interface CommunicationLog {
  id: string;
  clientId: string;
  agentId?: string;
  channel: MessageChannel;
  direction: MessageDirection;
  content: string;
  status: MessageStatus;
  metadataJson?: Record<string, unknown>;
  threadId: string;
  createdAt: string;
  updatedAt: string;
}
