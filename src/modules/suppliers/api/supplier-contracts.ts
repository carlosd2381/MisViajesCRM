import type {
  CommissionType,
  InternalRiskFlag,
  PayoutTerms,
  Supplier,
  SupplierStatus,
  SupplierType
} from '../domain/supplier';

export interface CreateSupplierRequest {
  name: string;
  tradeName?: string;
  type: SupplierType;
  rfc?: string;
  status: SupplierStatus;
  defaultCurrency: 'MXN' | 'USD' | 'EUR';
  commissionType: CommissionType;
  commissionRate: number;
  payoutTerms: PayoutTerms;
  internalRiskFlag: InternalRiskFlag;
}

export interface UpdateSupplierRequest {
  name?: string;
  tradeName?: string;
  type?: SupplierType;
  rfc?: string;
  status?: SupplierStatus;
  defaultCurrency?: 'MXN' | 'USD' | 'EUR';
  commissionType?: CommissionType;
  commissionRate?: number;
  payoutTerms?: PayoutTerms;
  internalRiskFlag?: InternalRiskFlag;
}

export interface SupplierResponse {
  data: Supplier;
}

export interface SupplierListResponse {
  data: Supplier[];
}
