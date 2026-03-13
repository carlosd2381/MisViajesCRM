export const LEADS_LIST_ALL_COLUMNS = [
  'id',
  'name',
  'firstName',
  'paternalLastName',
  'email',
  'phone',
  'destination',
  'status',
  'priority',
  'leadTemperature',
  'probabilityOfSale',
  'lastContactDate',
  'assignedAgentName',
  'source',
  'urgencyTimeframe',
  'travelStartDate',
  'budgetMin',
  'budgetMax',
] as const;

export type LeadListColumnKey = (typeof LEADS_LIST_ALL_COLUMNS)[number];

export const LEADS_LIST_DEFAULT_COLUMNS: LeadListColumnKey[] = [
  'name',
  'destination',
  'status',
  'priority',
  'probabilityOfSale',
  'lastContactDate',
  'leadTemperature',
  'id',
];

export const CLIENTS_LIST_ALL_COLUMNS = [
  'id',
  'name',
  'firstName',
  'paternalLastName',
  'maternalLastName',
  'leadOrigin',
  'contact',
  'email',
  'phone',
  'preferredContactMethod',
  'companyName',
  'jobTitle',
  'birthDate',
] as const;

export type ClientListColumnKey = (typeof CLIENTS_LIST_ALL_COLUMNS)[number];

export const CLIENTS_LIST_DEFAULT_COLUMNS: ClientListColumnKey[] = ['name', 'contact', 'leadOrigin', 'id'];

export const SUPPLIERS_LIST_ALL_COLUMNS = [
  'id',
  'name',
  'tradeName',
  'type',
  'serviceModel',
  'marketFocusTags',
  'tierLevel',
  'status',
  'defaultCurrency',
  'commissionType',
  'commissionRate',
  'payoutTerms',
  'contractExpiryDate',
  'internalRating',
  'responseTimeScore',
  'internalRiskFlag',
  'rfc',
] as const;

export type SupplierListColumnKey = (typeof SUPPLIERS_LIST_ALL_COLUMNS)[number];

export const SUPPLIERS_LIST_DEFAULT_COLUMNS: SupplierListColumnKey[] = ['name', 'type', 'status', 'tierLevel', 'id'];