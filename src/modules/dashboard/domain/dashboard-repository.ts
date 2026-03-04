import type { DashboardSnapshot } from './dashboard-snapshot';

export interface DashboardRepository {
  list(): Promise<DashboardSnapshot[]>;
  getById(id: string): Promise<DashboardSnapshot | null>;
  create(entity: DashboardSnapshot): Promise<DashboardSnapshot>;
  update(entity: DashboardSnapshot): Promise<DashboardSnapshot>;
}
