import { LOYALTY_PROGRAMS, loyaltyTiersForProgram } from './types';
import type {
  Client,
  ClientProfileForm,
  LoyaltyProgram,
  ProfileTabKey,
  Relationship,
  RepeatAddress,
  RepeatEmail,
  RepeatPhone
} from './types';

const DEFAULT_RELATION = 'Amigo(a)';
const DEFAULT_LOYALTY_TYPE = 'Hoteles';

export interface ProfileComparisonSnapshot {
  profile: ClientProfileForm;
  phones: RepeatPhone[];
  emails: RepeatEmail[];
  addresses: RepeatAddress[];
  relationships: Relationship[];
  loyaltyPrograms: LoyaltyProgram[];
}

function isPhoneContact(contact: Client['contacts'][number]): contact is { type: RepeatPhone['type']; value: string } {
  return contact.type === 'home' || contact.type === 'cell' || contact.type === 'office';
}

function asText(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function parseJsonArray<T>(value: unknown, fallback: T[]): T[] {
  if (typeof value !== 'string' || !value.trim()) return fallback;

  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? (parsed as T[]) : fallback;
  } catch {
    return fallback;
  }
}

function normalizeSnapshot(snapshot: ProfileComparisonSnapshot): ProfileComparisonSnapshot {
  return {
    profile: { ...snapshot.profile },
    phones: snapshot.phones.map((item) => ({ ...item })),
    emails: snapshot.emails.map((item) => ({ ...item })),
    addresses: snapshot.addresses.map((item) => ({ ...item })),
    relationships: snapshot.relationships.map((item) => ({ ...item })),
    loyaltyPrograms: snapshot.loyaltyPrograms.map((item) => ({ ...item }))
  };
}

function equalValue(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function createProfileComparisonSnapshot(
  profile: ClientProfileForm,
  phones: RepeatPhone[],
  emails: RepeatEmail[],
  addresses: RepeatAddress[],
  relationships: Relationship[],
  loyaltyPrograms: LoyaltyProgram[]
): ProfileComparisonSnapshot {
  return normalizeSnapshot({
    profile,
    phones,
    emails,
    addresses,
    relationships,
    loyaltyPrograms
  });
}

export function diffProfileSnapshots(
  current: ProfileComparisonSnapshot,
  baseline: ProfileComparisonSnapshot
): ProfileTabKey[] {
  const changed = new Set<ProfileTabKey>();

  const contactKeys: Array<keyof ClientProfileForm> = [
    'firstName',
    'middleName',
    'paternalLastName',
    'maternalLastName',
    'preferredContactMethod',
    'companyName',
    'jobTitle',
    'website',
    'facebook',
    'instagram',
    'tiktok',
    'linkedIn'
  ];

  const datesKeys: Array<keyof ClientProfileForm> = ['birthDate', 'anniversaryDate'];
  const preferencesKeys: Array<keyof ClientProfileForm> = [
    'seatPreference',
    'bedPreference',
    'mealPreference',
    'accommodations',
    'vibePreferences',
    'activityPreferences'
  ];
  const currentTripsKeys: Array<keyof ClientProfileForm> = [
    'currentTripDestination',
    'clientStatus',
    'currentTripDate',
    'currentTripTravelers',
    'currentTripServices',
    'currentTripPreferences',
    'currentTripNotes',
    'currentTripProposalRef',
    'currentTripLinkedRefs'
  ];
  const documentsKeys: Array<keyof ClientProfileForm> = [
    'passportFullName',
    'passportNumber',
    'passportCountry',
    'passportIssueDate',
    'passportExpiryDate',
    'passportSex',
    'passportBirthPlace',
    'passportNationality',
    'passportCitizenship',
    'visaFullName',
    'visaNumber',
    'visaCountry',
    'visaIssueDate',
    'visaExpiryDate',
    'tsaGlobalEntry',
    'emergencyRelation',
    'emergencyFirstName',
    'emergencyLastName',
    'emergencyPhone',
    'emergencyEmail'
  ];

  if (contactKeys.some((key) => !equalValue(current.profile[key], baseline.profile[key]))) changed.add('contact');
  if (!equalValue(current.phones, baseline.phones) || !equalValue(current.emails, baseline.emails) || !equalValue(current.addresses, baseline.addresses)) changed.add('contact');
  if (datesKeys.some((key) => !equalValue(current.profile[key], baseline.profile[key]))) changed.add('dates');
  if (preferencesKeys.some((key) => !equalValue(current.profile[key], baseline.profile[key]))) changed.add('preferences');
  if (currentTripsKeys.some((key) => !equalValue(current.profile[key], baseline.profile[key]))) changed.add('currentTrips');
  if (documentsKeys.some((key) => !equalValue(current.profile[key], baseline.profile[key]))) changed.add('documents');
  if (!equalValue(current.relationships, baseline.relationships)) changed.add('relationships');
  if (!equalValue(current.loyaltyPrograms, baseline.loyaltyPrograms)) changed.add('loyalty');
  if (!equalValue(current.profile.vaccineInfo, baseline.profile.vaccineInfo)) changed.add('vaccines');
  if (!equalValue(current.profile.notes, baseline.profile.notes)) changed.add('notes');
  if (!equalValue(current.profile.pastTrips, baseline.profile.pastTrips)) changed.add('trips');

  return Array.from(changed);
}

export function buildTravelPreferencesPayload(
  profile: ClientProfileForm,
  relationships: Relationship[],
  loyaltyPrograms: LoyaltyProgram[]
): Record<string, string | number | boolean | string[]> {
  return {
    preferredContactMethod: profile.preferredContactMethod,
    facebook: profile.facebook.trim(),
    instagram: profile.instagram.trim(),
    tiktok: profile.tiktok.trim(),
    linkedIn: profile.linkedIn.trim(),
    seatPreference: profile.seatPreference,
    bedPreference: profile.bedPreference,
    mealPreference: profile.mealPreference.trim(),
    accommodations: profile.accommodations,
    vibePreferences: profile.vibePreferences,
    activityPreferences: profile.activityPreferences,
    passportFullName: profile.passportFullName.trim(),
    passportNumber: profile.passportNumber.trim(),
    passportCountry: profile.passportCountry.trim(),
    passportIssueDate: profile.passportIssueDate,
    passportExpiryDate: profile.passportExpiryDate,
    passportSex: profile.passportSex.trim(),
    passportBirthPlace: profile.passportBirthPlace.trim(),
    passportNationality: profile.passportNationality.trim(),
    passportCitizenship: profile.passportCitizenship.trim(),
    visaFullName: profile.visaFullName.trim(),
    visaNumber: profile.visaNumber.trim(),
    visaCountry: profile.visaCountry.trim(),
    visaIssueDate: profile.visaIssueDate,
    visaExpiryDate: profile.visaExpiryDate,
    tsaGlobalEntry: profile.tsaGlobalEntry.trim(),
    emergencyRelation: profile.emergencyRelation.trim(),
    emergencyFirstName: profile.emergencyFirstName.trim(),
    emergencyLastName: profile.emergencyLastName.trim(),
    emergencyPhone: profile.emergencyPhone.trim(),
    emergencyEmail: profile.emergencyEmail.trim(),
    currentTripDestination: profile.currentTripDestination.trim(),
    clientStatus: profile.clientStatus.trim(),
    currentTripDate: profile.currentTripDate,
    currentTripTravelers: profile.currentTripTravelers.trim(),
    currentTripServices: profile.currentTripServices,
    currentTripPreferences: profile.currentTripPreferences.trim(),
    currentTripNotes: profile.currentTripNotes.trim(),
    currentTripProposalRef: profile.currentTripProposalRef.trim(),
    currentTripLinkedRefs: profile.currentTripLinkedRefs.filter((item) => item.trim().length > 0),
    vaccineInfo: profile.vaccineInfo.trim(),
    notes: profile.notes.trim(),
    pastTrips: profile.pastTrips.trim(),
    relationshipsJson: JSON.stringify(relationships),
    loyaltyProgramsJson: JSON.stringify(loyaltyPrograms.filter((item) => item.number.trim()))
  };
}

export function buildProfileStateFromClient(client: Client): {
  profile: ClientProfileForm;
  phones: RepeatPhone[];
  emails: RepeatEmail[];
  addresses: RepeatAddress[];
  relationships: Relationship[];
  loyaltyPrograms: LoyaltyProgram[];
} {
  const travelPreferences = client.travelPreferences ?? {};

  const phones: RepeatPhone[] = client.contacts
    .filter(isPhoneContact)
    .map((contact) => ({ type: contact.type, value: contact.value }));
  const emails: RepeatEmail[] = client.contacts
    .filter((contact) => contact.type === 'email')
    .map((contact) => ({ type: 'personal', value: contact.value }));

  const addresses: RepeatAddress[] = client.addresses.map((address) => ({
    type: address.type === 'billing' ? 'office' : address.type,
    street1: address.street1,
    street2: address.street2 ?? '',
    city: address.city,
    state: address.state,
    zipCode: address.zipCode,
    country: address.country
  }));

  const relationships = parseJsonArray<Relationship>(travelPreferences.relationshipsJson, []).filter(
    (item) => item && typeof item === 'object' && typeof item.relation === 'string' && typeof item.clientId === 'string'
  );

  const loyaltyPrograms = parseJsonArray<LoyaltyProgram>(travelPreferences.loyaltyProgramsJson, []).filter(
    (item) => item && typeof item === 'object' && typeof item.type === 'string' && typeof item.program === 'string' && typeof item.number === 'string'
  ).map((item) => {
    const tiers = loyaltyTiersForProgram(item.program);
    const selectedTier = typeof item.tier === 'string' ? item.tier : '';

    return {
      ...item,
      tier: tiers.includes(selectedTier) ? selectedTier : (tiers[0] ?? '')
    };
  });

  return {
    profile: {
      firstName: client.firstName,
      middleName: client.middleName ?? '',
      paternalLastName: client.paternalLastName,
      maternalLastName: client.maternalLastName ?? '',
      preferredContactMethod: asText(travelPreferences.preferredContactMethod) || 'phone',
      companyName: client.companyName ?? '',
      jobTitle: client.jobTitle ?? '',
      website: client.website ?? '',
      facebook: asText(travelPreferences.facebook),
      instagram: asText(travelPreferences.instagram),
      tiktok: asText(travelPreferences.tiktok),
      linkedIn: asText(travelPreferences.linkedIn),
      birthDate: client.birthDate ?? '',
      anniversaryDate: client.anniversaryDate ?? '',
      seatPreference: asText(travelPreferences.seatPreference),
      bedPreference: asText(travelPreferences.bedPreference),
      mealPreference: asText(travelPreferences.mealPreference),
      accommodations: asStringArray(travelPreferences.accommodations),
      vibePreferences: asStringArray(travelPreferences.vibePreferences),
      activityPreferences: asStringArray(travelPreferences.activityPreferences),
      passportFullName: asText(travelPreferences.passportFullName),
      passportNumber: asText(travelPreferences.passportNumber),
      passportCountry: asText(travelPreferences.passportCountry),
      passportIssueDate: asText(travelPreferences.passportIssueDate),
      passportExpiryDate: asText(travelPreferences.passportExpiryDate),
      passportSex: asText(travelPreferences.passportSex),
      passportBirthPlace: asText(travelPreferences.passportBirthPlace),
      passportNationality: asText(travelPreferences.passportNationality),
      passportCitizenship: asText(travelPreferences.passportCitizenship),
      visaFullName: asText(travelPreferences.visaFullName),
      visaNumber: asText(travelPreferences.visaNumber),
      visaCountry: asText(travelPreferences.visaCountry),
      visaIssueDate: asText(travelPreferences.visaIssueDate),
      visaExpiryDate: asText(travelPreferences.visaExpiryDate),
      tsaGlobalEntry: asText(travelPreferences.tsaGlobalEntry),
      emergencyRelation: asText(travelPreferences.emergencyRelation),
      emergencyFirstName: asText(travelPreferences.emergencyFirstName),
      emergencyLastName: asText(travelPreferences.emergencyLastName),
      emergencyPhone: asText(travelPreferences.emergencyPhone),
      emergencyEmail: asText(travelPreferences.emergencyEmail),
      currentTripDestination: asText(travelPreferences.currentTripDestination),
      clientStatus: asText(travelPreferences.clientStatus) || 'researching',
      currentTripDate: asText(travelPreferences.currentTripDate),
      currentTripTravelers: asText(travelPreferences.currentTripTravelers),
      currentTripServices: asStringArray(travelPreferences.currentTripServices),
      currentTripPreferences: asText(travelPreferences.currentTripPreferences),
      currentTripNotes: asText(travelPreferences.currentTripNotes),
      currentTripProposalRef: asText(travelPreferences.currentTripProposalRef),
      currentTripLinkedRefs: asStringArray(travelPreferences.currentTripLinkedRefs),
      vaccineInfo: asText(travelPreferences.vaccineInfo),
      notes: asText(travelPreferences.notes),
      pastTrips: asText(travelPreferences.pastTrips)
    },
    phones: phones.length > 0 ? phones : [{ type: 'cell', value: '' }],
    emails: emails.length > 0 ? emails : [{ type: 'personal', value: '' }],
    addresses:
      addresses.length > 0
        ? addresses
        : [{ type: 'personal', street1: '', street2: '', city: '', state: '', zipCode: '', country: '' }],
    relationships: relationships.length > 0 ? relationships : [{ relation: DEFAULT_RELATION, clientId: '' }],
    loyaltyPrograms:
      loyaltyPrograms.length > 0
        ? loyaltyPrograms
        : [{ type: DEFAULT_LOYALTY_TYPE, program: LOYALTY_PROGRAMS[0], tier: loyaltyTiersForProgram(LOYALTY_PROGRAMS[0])[0] ?? '', number: '' }]
  };
}
