import type { Client, ClientAddress, ClientContact } from '../domain/client';

export interface CreateClientRequest {
  leadId?: string;
  firstName: string;
  middleName?: string;
  paternalLastName: string;
  maternalLastName?: string;
  gender?: string;
  birthDate?: string;
  anniversaryDate?: string;
  companyName?: string;
  jobTitle?: string;
  website?: string;
  contacts?: ClientContact[];
  addresses?: ClientAddress[];
  travelPreferences?: Record<string, string | number | boolean | string[]>;
}

export interface UpdateClientRequest {
  firstName?: string;
  middleName?: string;
  paternalLastName?: string;
  maternalLastName?: string;
  gender?: string;
  birthDate?: string;
  anniversaryDate?: string;
  companyName?: string;
  jobTitle?: string;
  website?: string;
  contacts?: ClientContact[];
  addresses?: ClientAddress[];
  travelPreferences?: Record<string, string | number | boolean | string[]>;
}

export interface ClientResponse {
  data: Client;
}

export interface ClientListResponse {
  data: Client[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
}
