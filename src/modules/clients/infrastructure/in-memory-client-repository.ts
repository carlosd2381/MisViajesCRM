import type { ClientRepository } from '../domain/client-repository';
import type { Client } from '../domain/client';

export class InMemoryClientRepository implements ClientRepository {
  private readonly items = new Map<string, Client>();

  async list(): Promise<Client[]> {
    return Array.from(this.items.values());
  }

  async getById(id: string): Promise<Client | null> {
    return this.items.get(id) ?? null;
  }

  async getByLeadId(leadId: string): Promise<Client | null> {
    for (const item of this.items.values()) {
      if (item.leadId === leadId) return item;
    }

    return null;
  }

  async create(entity: Client): Promise<Client> {
    this.items.set(entity.id, entity);
    return entity;
  }

  async update(entity: Client): Promise<Client> {
    this.items.set(entity.id, entity);
    return entity;
  }
}
