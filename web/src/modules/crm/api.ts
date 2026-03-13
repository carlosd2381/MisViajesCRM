import { API_BASE } from './types';
import type { ClientProfileForm, SessionAuth } from './types';

export function defaultSessionAuth(): SessionAuth {
  return { userId: 'web_owner', role: 'agent', accessToken: '', refreshToken: '' };
}

export function restoreSessionAuth(storageKey: string): SessionAuth {
  if (typeof window === 'undefined') {
    return defaultSessionAuth();
  }

  const raw = window.localStorage.getItem(storageKey);
  if (!raw) {
    return defaultSessionAuth();
  }

  try {
    const parsed = JSON.parse(raw) as Partial<SessionAuth>;
    if (!parsed.userId || !parsed.role) {
      return defaultSessionAuth();
    }

    return {
      userId: parsed.userId,
      role: parsed.role,
      accessToken: parsed.accessToken ?? '',
      refreshToken: parsed.refreshToken ?? '',
    };
  } catch {
    return defaultSessionAuth();
  }
}

export function defaultForm(): ClientProfileForm {
  return {
    firstName: '',
    middleName: '',
    paternalLastName: '',
    maternalLastName: '',
    preferredContactMethod: 'phone',
    companyName: '',
    jobTitle: '',
    website: '',
    facebook: '',
    instagram: '',
    tiktok: '',
    linkedIn: '',
    birthDate: '',
    anniversaryDate: '',
    seatPreference: '',
    bedPreference: '',
    mealPreference: '',
    accommodations: [],
    vibePreferences: [],
    activityPreferences: [],
    passportFullName: '',
    passportNumber: '',
    passportCountry: '',
    passportIssueDate: '',
    passportExpiryDate: '',
    passportSex: '',
    passportBirthPlace: '',
    passportNationality: '',
    passportCitizenship: '',
    visaFullName: '',
    visaNumber: '',
    visaCountry: '',
    visaIssueDate: '',
    visaExpiryDate: '',
    tsaGlobalEntry: '',
    emergencyRelation: '',
    emergencyFirstName: '',
    emergencyLastName: '',
    emergencyPhone: '',
    emergencyEmail: '',
    vaccineInfo: '',
    currentTripDestination: '',
    currentTripDate: '',
    currentTripTravelers: '',
    currentTripServices: [],
    currentTripPreferences: '',
    currentTripNotes: '',
    currentTripProposalRef: '',
    currentTripLinkedRefs: [],
    notes: '',
    pastTrips: '',
  };
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<{ ok: boolean; status: number; data: T | null; raw: unknown }> {
  const response = await fetch(`${API_BASE}${path}`, init);
  const raw = await response.json().catch(() => ({}));
  return {
    ok: response.ok,
    status: response.status,
    data: (raw as { data?: T }).data ?? null,
    raw,
  };
}
