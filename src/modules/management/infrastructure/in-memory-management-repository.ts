import type { ManagementRepository } from '../domain/management-repository';
import type { ManagementSetting } from '../domain/management-setting';

export class InMemoryManagementRepository implements ManagementRepository {
  private readonly items = new Map<string, ManagementSetting>();

  async list(): Promise<ManagementSetting[]> {
    return Array.from(this.items.values());
  }

  async getById(id: string): Promise<ManagementSetting | null> {
    return this.items.get(id) ?? null;
  }

  async create(entity: ManagementSetting): Promise<ManagementSetting> {
    this.items.set(entity.id, entity);
    return entity;
  }

  async update(entity: ManagementSetting): Promise<ManagementSetting> {
    this.items.set(entity.id, entity);
    return entity;
  }
}