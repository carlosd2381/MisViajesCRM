export const LEAD_STATUS = [
  'new',
  'contacted',
  'proposal_sent',
  'follow_up',
  'closed_won',
  'closed_lost'
] as const;

export const LEAD_SOURCE = [
  'whatsapp',
  'instagram',
  'facebook',
  'referral',
  'website',
  'walk_in'
] as const;

export const LEAD_PRIORITY = ['low', 'medium', 'high', 'vip'] as const;

export type LeadStatus = (typeof LEAD_STATUS)[number];
export type LeadSource = (typeof LEAD_SOURCE)[number];
export type LeadPriority = (typeof LEAD_PRIORITY)[number];

export interface Lead {
  id: string;
  status: LeadStatus;
  source: LeadSource;
  priority: LeadPriority;
  firstName?: string;
  paternalLastName?: string;
  email?: string;
  phone?: string;
  destination: string;
  travelStartDate?: string;
  travelEndDate?: string;
  urgencyTimeframe?: string;
  tripOccasion?: string;
  campaignId?: string;
  referralName?: string;
  assignedAgentName?: string;
  lastContactDate?: string;
  probabilityOfSale?: number;
  leadTemperature?: string;
  dateFlexibility?: string;
  preferredContactMethod?: string;
  adultsCount: number;
  childrenCount: number;
  budgetMin?: number;
  budgetMax?: number;
  budgetCurrency?: 'MXN' | 'USD' | 'EUR';
  tripType?: string;
  preferences?: string;
  notes?: string;
  assignedAgentId?: string;
  createdAt: string;
  updatedAt: string;
}
