import type { Commission } from './commission';

export interface CommissionRepository {
  list(): Promise<Commission[]>;
  getById(id: string): Promise<Commission | null>;
  create(entity: Commission): Promise<Commission>;
  update(entity: Commission): Promise<Commission>;
}
