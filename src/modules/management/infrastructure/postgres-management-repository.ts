import { pgQuery } from '../../../core/db/pg-client';
import type { ManagementRepository } from '../domain/management-repository';
import type { ManagementSetting } from '../domain/management-setting';

interface ManagementSettingRow {
  id: string;
  key: string;
  value: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

function mapRow(row: ManagementSettingRow): ManagementSetting {
  return {
    id: row.id,
    key: row.key,
    value: row.value,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export class PostgresManagementRepository implements ManagementRepository {
  async list(): Promise<ManagementSetting[]> {
    const sql = 'select * from management_settings order by key asc';
    const result = await pgQuery<ManagementSettingRow>(sql);
    return result.rows.map(mapRow);
  }

  async getById(id: string): Promise<ManagementSetting | null> {
    const sql = 'select * from management_settings where id = $1';
    const result = await pgQuery<ManagementSettingRow>(sql, [id]);
    return result.rows[0] ? mapRow(result.rows[0]) : null;
  }

  async create(entity: ManagementSetting): Promise<ManagementSetting> {
    const sql = `
      insert into management_settings (id, key, value, description, created_at, updated_at)
      values ($1, $2, $3, $4, $5, $6)
      returning *
    `;

    const params = [
      entity.id,
      entity.key,
      entity.value,
      entity.description,
      entity.createdAt,
      entity.updatedAt
    ];

    const result = await pgQuery<ManagementSettingRow>(sql, params);
    return mapRow(result.rows[0]);
  }

  async update(entity: ManagementSetting): Promise<ManagementSetting> {
    const sql = `
      update management_settings
      set value = $2,
          description = $3,
          updated_at = $4
      where id = $1
      returning *
    `;

    const params = [entity.id, entity.value, entity.description, entity.updatedAt];
    const result = await pgQuery<ManagementSettingRow>(sql, params);
    return mapRow(result.rows[0]);
  }
}