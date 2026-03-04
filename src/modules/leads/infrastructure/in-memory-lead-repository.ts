import type { LeadRepository } from '../domain/lead-repository';
import type { Lead } from '../domain/lead';

export class InMemoryLeadRepository implements LeadRepository {
  private readonly items = new Map<string, Lead>();

  async list(): Promise<Lead[]> {
    return Array.from(this.items.values());
  }

  async getById(id: string): Promise<Lead | null> {
    return this.items.get(id) ?? null;
  }

  async create(entity: Lead): Promise<Lead> {
    this.items.set(entity.id, entity);
    return entity;
  }

  async update(entity: Lead): Promise<Lead> {
    this.items.set(entity.id, entity);
    return entity;
  }
}
