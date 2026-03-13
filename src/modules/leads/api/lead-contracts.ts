import type { Lead, LeadPriority, LeadSource, LeadStatus } from '../domain/lead';

export interface CreateLeadRequest {
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
}

export interface UpdateLeadRequest {
  status?: LeadStatus;
  source?: LeadSource;
  priority?: LeadPriority;
  firstName?: string;
  paternalLastName?: string;
  email?: string;
  phone?: string;
  destination?: string;
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
  adultsCount?: number;
  childrenCount?: number;
  budgetMin?: number;
  budgetMax?: number;
  budgetCurrency?: 'MXN' | 'USD' | 'EUR';
  tripType?: string;
  preferences?: string;
  notes?: string;
  assignedAgentId?: string;
}

export interface LeadResponse {
  data: Lead;
}

export interface LeadListResponse {
  data: Lead[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
}
