import type {
  CommissionType,
  InternalRiskFlag,
  PayoutTerms,
  Supplier,
  SupplierServiceModel,
  SupplierStatus,
  SupplierTierLevel,
  SupplierType
} from '../domain/supplier';

export interface CreateSupplierRequest {
  name: string;
  tradeName?: string;
  type: SupplierType;
  serviceModel?: SupplierServiceModel;
  marketFocusTags?: string[];
  tierLevel?: SupplierTierLevel;
  rfc?: string;
  billingAddress?: string;
  status: SupplierStatus;
  defaultCurrency: 'MXN' | 'USD' | 'EUR';
  commissionType: CommissionType;
  commissionRate: number;
  payoutTerms: PayoutTerms;
  contractExpiryDate?: string;
  blackoutDates?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  internalRating?: number;
  responseTimeScore?: number;
  internalRiskFlag: InternalRiskFlag;
}

export interface UpdateSupplierRequest {
  name?: string;
  tradeName?: string;
  type?: SupplierType;
  serviceModel?: SupplierServiceModel;
  marketFocusTags?: string[];
  tierLevel?: SupplierTierLevel;
  rfc?: string;
  billingAddress?: string;
  status?: SupplierStatus;
  defaultCurrency?: 'MXN' | 'USD' | 'EUR';
  commissionType?: CommissionType;
  commissionRate?: number;
  payoutTerms?: PayoutTerms;
  contractExpiryDate?: string;
  blackoutDates?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  internalRating?: number;
  responseTimeScore?: number;
  internalRiskFlag?: InternalRiskFlag;
}

export interface SupplierResponse {
  data: Supplier;
}

export interface SupplierListResponse {
  data: Supplier[];
}
