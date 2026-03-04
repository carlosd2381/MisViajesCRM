import type { Commission, CommissionStatus } from '../domain/commission';

export interface CreateCommissionRequest {
  itineraryId: string;
  supplierId: string;
  expectedAmount: number;
  actualReceived?: number;
  receivedDate?: string;
  dueDate: string;
  status?: CommissionStatus;
}

export interface UpdateCommissionRequest {
  expectedAmount?: number;
  actualReceived?: number;
  receivedDate?: string;
  dueDate?: string;
  status?: CommissionStatus;
}

export interface CommissionResponse {
  data: Commission;
}

export interface CommissionListResponse {
  data: Commission[];
}
