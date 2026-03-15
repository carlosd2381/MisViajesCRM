export type Locale = 'es-MX' | 'en-US';

export type ViewKey = 'dashboard' | 'leads' | 'clients' | 'itineraries' | 'suppliers' | 'settings' | 'placeholder';

export type ItineraryStatus = 'draft' | 'sent' | 'revised' | 'accepted' | 'paid' | 'completed' | 'cancelled';

export interface Itinerary {
  id: string;
  clientId: string;
  agentId: string;
  title: string;
  status: ItineraryStatus;
  startDate?: string;
  endDate?: string;
  grossTotal: number;
  netTotal: number;
  markupAmount: number;
  serviceFeeAmount: number;
  agencyProfit: number;
  currency: 'MXN' | 'USD' | 'EUR';
  createdAt: string;
  updatedAt: string;
}

export interface ItineraryDay {
  id: string;
  itineraryId: string;
  dayIndex: number;
  dayDate?: string;
  title: string;
  summary?: string;
  createdAt: string;
  updatedAt: string;
}

export type ItineraryDayActivityCategory =
  | 'flight'
  | 'hotel'
  | 'transfer'
  | 'tour'
  | 'dining'
  | 'activity'
  | 'insurance'
  | 'fee'
  | 'other';

export interface ItineraryDayActivity {
  id: string;
  itineraryId: string;
  itineraryDayId: string;
  activityIndex: number;
  title: string;
  category: ItineraryDayActivityCategory;
  descriptionEs?: string;
  descriptionEn?: string;
  startsAtLocal?: string;
  durationMinutes?: number;
  priceNet: number;
  priceGross: number;
  optionalEnabled: boolean;
  mediaUrl?: string;
  latitude?: number;
  longitude?: number;
  createdAt: string;
  updatedAt: string;
}

export interface DestinationLibraryItem {
  id: string;
  locationName: string;
  category: 'activity' | 'hotel' | 'dining' | 'transfer' | 'other';
  title: string;
  description: string;
  mediaUrl?: string;
  coordinates: { latitude: number; longitude: number } | null;
  contentSource: 'internal' | 'fallback';
}

export interface ProposalPublicationShare {
  publicationId: string;
  hash: string;
  urlPath: string;
  status: 'active' | 'revoked' | 'expired';
  publishedAt: string;
  expiresAt?: string;
}

export interface PortalProposalActionEvent {
  id: string;
  proposalPublicationId: string;
  itineraryId: string;
  action: 'approve' | 'request_revision' | 'open';
  actorType: 'client' | 'agent' | 'system';
  actorRef?: string;
  message?: string;
  createdAt: string;
}

export interface PortalProposalPublication {
  id: string;
  itineraryId: string;
  hash: string;
  status: 'active' | 'revoked' | 'expired';
  publishedBy?: string;
  publishedAt: string;
  expiresAt?: string;
  revokedAt?: string;
  lastViewedAt?: string;
}

export interface PortalProposalView {
  publication: PortalProposalPublication;
  itinerary: Itinerary;
  actions: PortalProposalActionEvent[];
}

export type ProfileTabKey =
  | 'contact'
  | 'relationships'
  | 'loyalty'
  | 'currentTrips'
  | 'dates'
  | 'preferences'
  | 'documents'
  | 'vaccines'
  | 'files'
  | 'notes'
  | 'trips';

export interface Lead {
  id: string;
  status: string;
  source: string;
  priority: string;
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

export interface Supplier {
  id: string;
  name: string;
  tradeName?: string;
  type: string;
  serviceModel?: 'shared' | 'private';
  marketFocusTags: string[];
  tierLevel?: 'gold' | 'silver' | 'bronze';
  rfc?: string;
  billingAddress?: string;
  status: string;
  defaultCurrency: 'MXN' | 'USD' | 'EUR';
  commissionType: string;
  commissionRate: number;
  payoutTerms: string;
  contractExpiryDate?: string;
  blackoutDates?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  internalRating?: number;
  responseTimeScore?: number;
  internalRiskFlag: string;
}

export interface SupplierIncident {
  id: string;
  supplierId: string;
  occurredAt: string;
  clientName?: string;
  summary: string;
  severity: 'low' | 'medium' | 'high';
  createdAt: string;
}

export interface SupplierRecentBooking {
  itineraryId: string;
  itineraryTitle: string;
  itineraryStatus: string;
  clientId: string;
  clientName: string;
  startDate?: string;
  endDate?: string;
  commissionStatus: string;
}

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
  birthDate?: string;
  anniversaryDate?: string;
  companyName?: string;
  jobTitle?: string;
  website?: string;
  contacts: ClientContact[];
  addresses: ClientAddress[];
  travelPreferences: Record<string, string | number | boolean | string[]>;
  createdAt?: string;
  updatedAt?: string;
}

export interface RepeatPhone {
  type: 'home' | 'cell' | 'office';
  value: string;
}

export interface RepeatEmail {
  type: 'personal' | 'office';
  value: string;
}

export interface RepeatAddress {
  type: 'personal' | 'office';
  street1: string;
  street2: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface Relationship {
  relation: string;
  clientId: string;
}

export interface LoyaltyProgram {
  type: string;
  program: string;
  tier: string;
  number: string;
}

export interface SessionAuth {
  userId: string;
  role: string;
  accessToken: string;
  refreshToken: string;
}

export interface ClientProfileForm {
  firstName: string;
  middleName: string;
  paternalLastName: string;
  maternalLastName: string;
  preferredContactMethod: string;
  companyName: string;
  jobTitle: string;
  website: string;
  facebook: string;
  instagram: string;
  tiktok: string;
  linkedIn: string;
  birthDate: string;
  anniversaryDate: string;
  seatPreference: string;
  bedPreference: string;
  mealPreference: string;
  accommodations: string[];
  vibePreferences: string[];
  activityPreferences: string[];
  passportFullName: string;
  passportNumber: string;
  passportCountry: string;
  passportIssueDate: string;
  passportExpiryDate: string;
  passportSex: string;
  passportBirthPlace: string;
  passportNationality: string;
  passportCitizenship: string;
  visaFullName: string;
  visaNumber: string;
  visaCountry: string;
  visaIssueDate: string;
  visaExpiryDate: string;
  tsaGlobalEntry: string;
  emergencyRelation: string;
  emergencyFirstName: string;
  emergencyLastName: string;
  emergencyPhone: string;
  emergencyEmail: string;
  vaccineInfo: string;
  currentTripDestination: string;
  clientStatus: string;
  currentTripDate: string;
  currentTripTravelers: string;
  currentTripServices: string[];
  currentTripPreferences: string;
  currentTripNotes: string;
  currentTripProposalRef: string;
  currentTripLinkedRefs: string[];
  notes: string;
  pastTrips: string;
}

export const API_BASE = '/api';
export const AUTH_STORAGE_KEY = 'misviajescrm.web.auth';

export const LOYALTY_PROGRAMS_BY_TYPE: string[][] = [
  [
    'Marriott Bonvoy', 'Hilton Honors', 'World of Hyatt', 'IHG One Rewards', 'Accor ALL', 'Wyndham Rewards',
    'Best Western Rewards', 'Choice Privileges', 'Radisson Rewards', 'NH Rewards', 'Grupo Posadas — Fiesta Rewards',
    'City Express — City Premios', 'Grupo Xcaret benefits',
  ],
  [
    'Club Premier (Aeroméxico)', 'VClub (Volaris)', 'VivaFan (Viva Aerobus)', 'AAdvantage (American)',
    'MileagePlus (United)', 'SkyMiles (Delta)', 'Avios', 'Flying Blue', 'Alaska Mileage Plan', 'KrisFlyer',
    'Miles & More', 'Qantas Frequent Flyer', 'ANA Mileage Club',
  ],
  [
    'Captain’s Club', 'Crown & Anchor Society', 'Latitudes Rewards', 'Mariner Society', 'Loyalty Club (MSC)',
    'VIFP Club', 'Silversea Captain’s Club', 'Windstar Star Plus', 'Seabourn Club',
  ],
  [
    'Hertz Gold Plus Rewards', 'Avis Preferred', 'Enterprise Plus', 'National Emerald Club', 'Sixt Loyalty',
    'Dollar Express / Thrifty Rewards', 'Europcar Privilege Club', 'Alamo Insiders', 'Mex Rent a Car loyalty',
  ],
  [
    'Amtrak Guest Rewards', 'Eurail / Interrail', 'VIA Rail points', 'National railcard programs',
    'FlixBus / BlaBlaCar loyalty',
  ],
];

export const LOYALTY_PROGRAMS = LOYALTY_PROGRAMS_BY_TYPE.flat();

export const LOYALTY_TIERS_BY_PROGRAM: Record<string, string[]> = {
  'Marriott Bonvoy': ['Member', 'Silver Elite', 'Gold Elite', 'Platinum Elite', 'Titanium Elite', 'Ambassador Elite'],
  'Hilton Honors': ['Member', 'Silver', 'Gold', 'Diamond'],
  'World of Hyatt': ['Member', 'Discoverist', 'Explorist', 'Globalist'],
  'IHG One Rewards': ['Club Member', 'Silver Elite', 'Gold Elite', 'Platinum Elite', 'Diamond Elite'],
  'Accor ALL': ['Classic', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Limitless'],
  'Wyndham Rewards': ['Blue', 'Gold', 'Platinum', 'Diamond'],
  'Best Western Rewards': ['Blue', 'Gold', 'Platinum', 'Diamond', 'Select'],
  'Choice Privileges': ['Member', 'Gold', 'Platinum', 'Diamond'],
  'Radisson Rewards': ['Club', 'Premium', 'VIP'],
  'NH Rewards': ['Silver', 'Gold', 'Platinum', 'Titanium'],
  'Grupo Posadas — Fiesta Rewards': ['Clásica', 'Gold', 'Platinum', 'Black'],
  'City Express — City Premios': ['Clásica', 'Oro', 'Platino'],
  'Grupo Xcaret benefits': ['Standard', 'Gold', 'Platinum'],

  'Club Premier (Aeroméxico)': ['Member', 'Gold', 'Platinum', 'Titanium'],
  'VClub (Volaris)': ['Individual', 'Grupal'],
  'VivaFan (Viva Aerobus)': ['Standard'],
  'AAdvantage (American)': ['AAdvantage', 'Gold', 'Platinum', 'Platinum Pro', 'Executive Platinum'],
  'MileagePlus (United)': ['Member', 'Premier Silver', 'Premier Gold', 'Premier Platinum', 'Premier 1K'],
  'SkyMiles (Delta)': ['Basic', 'Silver Medallion', 'Gold Medallion', 'Platinum Medallion', 'Diamond Medallion'],
  Avios: ['Blue', 'Bronze', 'Silver', 'Gold'],
  'Flying Blue': ['Explorer', 'Silver', 'Gold', 'Platinum'],
  'Alaska Mileage Plan': ['MVP', 'MVP Gold', 'MVP Gold 75K', 'MVP Gold 100K'],
  KrisFlyer: ['KrisFlyer', 'Elite Silver', 'Elite Gold', 'PPS Club', 'Solitaire PPS Club'],
  'Miles & More': ['Frequent Traveller', 'Senator', 'HON Circle'],
  'Qantas Frequent Flyer': ['Bronze', 'Silver', 'Gold', 'Platinum', 'Platinum One'],
  'ANA Mileage Club': ['Bronze', 'Platinum', 'Diamond'],

  'Captain’s Club': ['Preview', 'Classic', 'Select', 'Elite', 'Elite Plus', 'Zenith'],
  'Crown & Anchor Society': ['Gold', 'Platinum', 'Emerald', 'Diamond', 'Diamond Plus', 'Pinnacle Club'],
  'Latitudes Rewards': ['Bronze', 'Silver', 'Gold', 'Platinum', 'Sapphire', 'Diamond', 'Ambassador'],
  'Mariner Society': ['1-Star', '2-Star', '3-Star', '4-Star', '5-Star'],
  'Loyalty Club (MSC)': ['Classic', 'Silver', 'Gold', 'Diamond'],
  'VIFP Club': ['Blue', 'Red', 'Gold', 'Platinum', 'Diamond'],
  'Silversea Captain’s Club': ['Member', '100 Days at Sea', '250 Days at Sea', '500 Days at Sea'],
  'Windstar Star Plus': ['Member', 'Gold', 'Platinum'],
  'Seabourn Club': ['Member', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Diamond Elite'],

  'Hertz Gold Plus Rewards': ['Gold', 'Five Star', "President's Circle"],
  'Avis Preferred': ['Preferred', 'Preferred Plus', "President's Club"],
  'Enterprise Plus': ['Silver', 'Gold', 'Platinum'],
  'National Emerald Club': ['Emerald Club', 'Executive', 'Executive Elite'],
  'Sixt Loyalty': ['Express', 'Gold', 'Platinum', 'Diamond'],
  'Dollar Express / Thrifty Rewards': ['Member'],
  'Europcar Privilege Club': ['Member'],
  'Alamo Insiders': ['Member'],
  'Mex Rent a Car loyalty': ['Member'],

  'Amtrak Guest Rewards': ['Select', 'Select Plus', 'Select Executive'],
  'Eurail / Interrail': ['Member'],
  'VIA Rail points': ['Member'],
  'National railcard programs': ['Member'],
  'FlixBus / BlaBlaCar loyalty': ['Member'],
};

export function loyaltyProgramsForType(type: string, loyaltyTypes: string[]): string[] {
  const typeIndex = loyaltyTypes.indexOf(type);
  return typeIndex >= 0 ? (LOYALTY_PROGRAMS_BY_TYPE[typeIndex] ?? LOYALTY_PROGRAMS) : LOYALTY_PROGRAMS;
}

export function loyaltyTiersForProgram(program: string): string[] {
  return LOYALTY_TIERS_BY_PROGRAM[program] ?? ['Member'];
}

export const CONTACT_METHOD_CODES = ['phone', 'sms', 'whatsapp', 'email', 'other'] as const;

export const PROFILE_TAB_KEYS: ProfileTabKey[] = [
  'contact', 'relationships', 'loyalty', 'currentTrips', 'dates', 'preferences', 'documents', 'vaccines', 'files', 'notes', 'trips',
];
