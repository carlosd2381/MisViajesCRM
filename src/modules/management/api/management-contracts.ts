import type { ManagementSetting } from '../domain/management-setting';

export interface CreateManagementSettingRequest {
  key: string;
  value: string;
  description?: string;
}

export interface UpdateManagementSettingRequest {
  value?: string;
  description?: string;
}

export interface ManagementSettingResponse {
  data: ManagementSetting;
}

export interface ManagementSettingListResponse {
  data: ManagementSetting[];
}