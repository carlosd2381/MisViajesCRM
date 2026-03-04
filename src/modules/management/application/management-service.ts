import type {
  CreateManagementSettingRequest,
  UpdateManagementSettingRequest
} from '../api/management-contracts';
import type { ManagementSetting } from '../domain/management-setting';

function nowIsoDate(): string {
  return new Date().toISOString();
}

function createEntityId(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${random}`;
}

export function mapCreateManagementSettingToEntity(input: CreateManagementSettingRequest): ManagementSetting {
  const timestamp = nowIsoDate();

  return {
    id: createEntityId('mgmt'),
    key: input.key,
    value: input.value,
    description: input.description ?? null,
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

export function mapUpdateManagementSettingToEntity(
  current: ManagementSetting,
  input: UpdateManagementSettingRequest
): ManagementSetting {
  return {
    ...current,
    value: input.value ?? current.value,
    description: input.description === '' ? null : (input.description ?? current.description),
    updatedAt: nowIsoDate()
  };
}