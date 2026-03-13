import type {
  Client,
  ClientProfileForm,
  Locale,
  LoyaltyProgram,
  ProfileTabKey,
  Relationship,
  RepeatAddress,
  RepeatEmail,
  RepeatPhone,
} from '../../types';
import type { Dispatch, SetStateAction } from 'react';

export interface ClientTabSharedProps {
  locale: Locale;
  profile: ClientProfileForm;
  updateProfileField: <K extends keyof ClientProfileForm>(key: K, value: ClientProfileForm[K]) => void;
}

export interface ContactTabProps extends ClientTabSharedProps {
  phones: RepeatPhone[];
  emails: RepeatEmail[];
  addresses: RepeatAddress[];
  setPhones: Dispatch<SetStateAction<RepeatPhone[]>>;
  setEmails: Dispatch<SetStateAction<RepeatEmail[]>>;
  setAddresses: Dispatch<SetStateAction<RepeatAddress[]>>;
  setIsDirty: Dispatch<SetStateAction<boolean>>;
}

export interface RelationshipsTabProps {
  locale: Locale;
  clients: Client[];
  relationships: Relationship[];
  setRelationships: Dispatch<SetStateAction<Relationship[]>>;
  setIsDirty: Dispatch<SetStateAction<boolean>>;
}

export interface LoyaltyTabProps {
  locale: Locale;
  loyaltyPrograms: LoyaltyProgram[];
  setLoyaltyPrograms: Dispatch<SetStateAction<LoyaltyProgram[]>>;
  setIsDirty: Dispatch<SetStateAction<boolean>>;
}

export interface ClientsViewProps {
  locale: Locale;
  profileTab: ProfileTabKey;
  setProfileTab: Dispatch<SetStateAction<ProfileTabKey>>;
  profileTabs: Array<{ key: ProfileTabKey; label: string }>;
  profile: ClientProfileForm;
  phones: RepeatPhone[];
  emails: RepeatEmail[];
  addresses: RepeatAddress[];
  relationships: Relationship[];
  loyaltyPrograms: LoyaltyProgram[];
  clients: Client[];
  selectedClientId: string | null;
  pendingDeleteClientId: string | null;
  deleteClientError: { id: string; message: string } | null;
  changedProfileSections: ProfileTabKey[];
  profileErrors: string[];
  profileSaveResult: string;
  updateProfileField: <K extends keyof ClientProfileForm>(key: K, value: ClientProfileForm[K]) => void;
  toggleArrayField: (field: 'accommodations' | 'vibePreferences' | 'activityPreferences', value: string) => void;
  setPhones: Dispatch<SetStateAction<RepeatPhone[]>>;
  setEmails: Dispatch<SetStateAction<RepeatEmail[]>>;
  setAddresses: Dispatch<SetStateAction<RepeatAddress[]>>;
  setRelationships: Dispatch<SetStateAction<Relationship[]>>;
  setLoyaltyPrograms: Dispatch<SetStateAction<LoyaltyProgram[]>>;
  setIsDirty: Dispatch<SetStateAction<boolean>>;
  onCancel: () => void;
  onSave: () => void;
  onRefreshClients: () => void;
  onViewClient: (clientId: string) => void;
  onRequestDeleteClient: (clientId: string) => void;
  onCancelDeleteClient: () => void;
  onDeleteClient: (clientId: string) => void;
  onForceDeleteClient: (clientId: string) => void;
  onStartNewProfile: () => void;
}
