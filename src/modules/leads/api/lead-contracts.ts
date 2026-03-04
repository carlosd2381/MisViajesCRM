import type { Lead, LeadPriority, LeadSource, LeadStatus } from '../domain/lead';

export interface CreateLeadRequest {
  status: LeadStatus;
  source: LeadSource;
  priority: LeadPriority;
  destination: string;
  travelStartDate?: string;
  travelEndDate?: string;
  adultsCount: number;
  childrenCount: number;
  budgetMin?: number;
  budgetMax?: number;
  budgetCurrency?: 'MXN' | 'USD' | 'EUR';
  tripType?: string;
  notes?: string;
  assignedAgentId?: string;
}

export interface UpdateLeadRequest {
  status?: LeadStatus;
  source?: LeadSource;
  priority?: LeadPriority;
  destination?: string;
  travelStartDate?: string;
  travelEndDate?: string;
  adultsCount?: number;
  childrenCount?: number;
  budgetMin?: number;
  budgetMax?: number;
  budgetCurrency?: 'MXN' | 'USD' | 'EUR';
  tripType?: string;
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
