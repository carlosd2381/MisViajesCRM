import type { CommissionRepository } from '../domain/commission-repository';
import type { Commission } from '../domain/commission';

export class InMemoryCommissionRepository implements CommissionRepository {
  private readonly items = new Map<string, Commission>();

  async list(): Promise<Commission[]> {
    return Array.from(this.items.values());
  }

  async getById(id: string): Promise<Commission | null> {
    return this.items.get(id) ?? null;
  }

  async create(entity: Commission): Promise<Commission> {
    this.items.set(entity.id, entity);
    return entity;
  }

  async update(entity: Commission): Promise<Commission> {
    this.items.set(entity.id, entity);
    return entity;
  }
}
