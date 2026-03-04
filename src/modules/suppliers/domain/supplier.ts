export const SUPPLIER_TYPE = [
  'wholesaler',
  'hotel',
  'airline',
  'dmc',
  'car_rental',
  'insurance',
  'tour_operator',
  'private_transport',
  'cruise_line'
] as const;

export const SUPPLIER_STATUS = ['active', 'inactive', 'blacklisted'] as const;
export const COMMISSION_TYPE = ['percentage', 'fixed'] as const;
export const PAYOUT_TERMS = ['prepaid', 'post_travel_30', 'post_travel_60', 'upon_booking'] as const;
export const INTERNAL_RISK_FLAG = ['high_risk', 'caution', 'reliable'] as const;

export type SupplierType = (typeof SUPPLIER_TYPE)[number];
export type SupplierStatus = (typeof SUPPLIER_STATUS)[number];
export type CommissionType = (typeof COMMISSION_TYPE)[number];
export type PayoutTerms = (typeof PAYOUT_TERMS)[number];
export type InternalRiskFlag = (typeof INTERNAL_RISK_FLAG)[number];

export interface Supplier {
  id: string;
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
  createdAt: string;
  updatedAt: string;
}
