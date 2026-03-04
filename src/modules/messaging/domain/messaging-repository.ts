import type { CommunicationLog } from './communication-log';

export interface MessagingRepository {
  list(): Promise<CommunicationLog[]>;
  getById(id: string): Promise<CommunicationLog | null>;
  create(entity: CommunicationLog): Promise<CommunicationLog>;
  update(entity: CommunicationLog): Promise<CommunicationLog>;
}
