import type { ManagementSetting } from './management-setting';

export interface ManagementRepository {
  list(): Promise<ManagementSetting[]>;
  getById(id: string): Promise<ManagementSetting | null>;
  create(entity: ManagementSetting): Promise<ManagementSetting>;
  update(entity: ManagementSetting): Promise<ManagementSetting>;
}