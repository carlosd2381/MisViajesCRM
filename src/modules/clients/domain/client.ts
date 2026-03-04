export interface ClientContact {
  type: 'home' | 'cell' | 'office' | 'whatsapp_primary' | 'email';
  value: string;
}

export interface ClientAddress {
  type: 'personal' | 'office' | 'billing';
  street1: string;
  street2?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface Client {
  id: string;
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
  contacts: ClientContact[];
  addresses: ClientAddress[];
  travelPreferences: Record<string, string | number | boolean | string[]>;
  createdAt: string;
  updatedAt: string;
}
