import type { DashboardRepository } from '../domain/dashboard-repository';
import type { DashboardSnapshot } from '../domain/dashboard-snapshot';

export class InMemoryDashboardRepository implements DashboardRepository {
  private readonly items = new Map<string, DashboardSnapshot>();

  async list(): Promise<DashboardSnapshot[]> {
    return Array.from(this.items.values());
  }

  async getById(id: string): Promise<DashboardSnapshot | null> {
    return this.items.get(id) ?? null;
  }

  async create(entity: DashboardSnapshot): Promise<DashboardSnapshot> {
    this.items.set(entity.id, entity);
    return entity;
  }

  async update(entity: DashboardSnapshot): Promise<DashboardSnapshot> {
    this.items.set(entity.id, entity);
    return entity;
  }
}
