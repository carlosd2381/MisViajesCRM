import type { MessagingRepository } from '../domain/messaging-repository';
import type { CommunicationLog } from '../domain/communication-log';

export class InMemoryMessagingRepository implements MessagingRepository {
  private readonly items = new Map<string, CommunicationLog>();

  async list(): Promise<CommunicationLog[]> {
    return Array.from(this.items.values());
  }

  async getById(id: string): Promise<CommunicationLog | null> {
    return this.items.get(id) ?? null;
  }

  async create(entity: CommunicationLog): Promise<CommunicationLog> {
    this.items.set(entity.id, entity);
    return entity;
  }

  async update(entity: CommunicationLog): Promise<CommunicationLog> {
    this.items.set(entity.id, entity);
    return entity;
  }
}
