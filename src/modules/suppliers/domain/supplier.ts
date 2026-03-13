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
export const COMMISSION_TYPE = ['percentage', 'fixed', 'net_rate'] as const;
export const PAYOUT_TERMS = ['prepaid', 'post_trip_15', 'post_travel_30', 'credit_30', 'upon_booking'] as const;
export const INTERNAL_RISK_FLAG = ['high_risk', 'caution', 'reliable'] as const;
export const SUPPLIER_TIER_LEVEL = ['gold', 'silver', 'bronze'] as const;
export const SUPPLIER_SERVICE_MODEL = ['shared', 'private'] as const;

export type SupplierType = (typeof SUPPLIER_TYPE)[number];
export type SupplierStatus = (typeof SUPPLIER_STATUS)[number];
export type CommissionType = (typeof COMMISSION_TYPE)[number];
export type PayoutTerms = (typeof PAYOUT_TERMS)[number];
export type InternalRiskFlag = (typeof INTERNAL_RISK_FLAG)[number];
export type SupplierTierLevel = (typeof SUPPLIER_TIER_LEVEL)[number];
export type SupplierServiceModel = (typeof SUPPLIER_SERVICE_MODEL)[number];

export interface Supplier {
  id: string;
  name: string;
  tradeName?: string;
  type: SupplierType;
  serviceModel?: SupplierServiceModel;
  marketFocusTags: string[];
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
  createdAt: string;
  updatedAt: string;
}
