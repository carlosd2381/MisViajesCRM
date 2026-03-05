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

export interface ValidateCfdiStampRequest {
  invoiceId: string;
  satCertificateId: string;
  rfcEmisor: string;
  rfcReceptor: string;
  currency: string;
  total: number;
  issueDate: string;
}

export interface ValidateCfdiCancelRequest {
  invoiceId: string;
  cfdiUuid: string;
  cancellationReason: '01' | '02' | '03' | '04';
  replacementCfdiUuid?: string;
  cancelledAt: string;
}

export interface ConfirmCfdiStampRequest {
  invoiceId: string;
  cfdiUuid: string;
  stampedAt: string;
}

export interface ConfirmCfdiCancelRequest {
  invoiceId: string;
  cfdiUuid: string;
  cancellationReason: '01' | '02' | '03' | '04';
  replacementCfdiUuid?: string;
  cancelledAt: string;
}

export interface ManagementSettingResponse {
  data: ManagementSetting;
}

export interface ManagementSettingListResponse {
  data: ManagementSetting[];
}