import { apiRequest, defaultForm } from './api';
import { buildProfileStateFromClient, buildTravelPreferencesPayload, createProfileComparisonSnapshot } from './client-profile-persistence';
import { list, t } from './i18n';
import { validateClientProfile } from './profile-validation';
import { LOYALTY_PROGRAMS, loyaltyTiersForProgram, type Client, type ClientAddress, type ClientProfileForm, type Locale, type LoyaltyProgram, type ProfileTabKey, type Relationship, type RepeatAddress, type RepeatEmail, type RepeatPhone } from './types';
import type { DeleteRowError } from './app-types';
import { deleteConflictMessage, requestCascadeDeleteConfirmation, responseMessage } from './app-utils';
import type { Dispatch, SetStateAction } from 'react';

interface ClientActionsDeps {
  locale: Locale;
  profile: ClientProfileForm;
  phones: RepeatPhone[];
  emails: RepeatEmail[];
  addresses: RepeatAddress[];
  relationships: Relationship[];
  loyaltyPrograms: LoyaltyProgram[];
  isDirty: boolean;
  selectedClientId: string | null;
  editingClientId: string | null;
  authHeaders: (includeJsonContentType?: boolean) => Record<string, string>;
  loadClients: () => Promise<void>;
  setProfile: Dispatch<SetStateAction<ClientProfileForm>>;
  setPhones: Dispatch<SetStateAction<RepeatPhone[]>>;
  setEmails: Dispatch<SetStateAction<RepeatEmail[]>>;
  setAddresses: Dispatch<SetStateAction<RepeatAddress[]>>;
  setRelationships: Dispatch<SetStateAction<Relationship[]>>;
  setLoyaltyPrograms: Dispatch<SetStateAction<LoyaltyProgram[]>>;
  setSelectedClientId: Dispatch<SetStateAction<string | null>>;
  setEditingClientId: Dispatch<SetStateAction<string | null>>;
  setPendingDeleteClientId: Dispatch<SetStateAction<string | null>>;
  setClientDeleteError: Dispatch<SetStateAction<DeleteRowError | null>>;
  setProfileErrors: Dispatch<SetStateAction<string[]>>;
  setProfileSaveResult: Dispatch<SetStateAction<string>>;
  setProfileTab: Dispatch<SetStateAction<ProfileTabKey>>;
  setProfileBaseline: Dispatch<SetStateAction<ReturnType<typeof createProfileComparisonSnapshot>>>;
  setStatusWarn: Dispatch<SetStateAction<boolean>>;
  setStatusConflict: Dispatch<SetStateAction<boolean>>;
  setStatusText: Dispatch<SetStateAction<string>>;
  setIsDirty: Dispatch<SetStateAction<boolean>>;
}

export function createClientActions(deps: ClientActionsDeps) {
  const {
    locale,
    profile,
    phones,
    emails,
    addresses,
    relationships,
    loyaltyPrograms,
    isDirty,
    selectedClientId,
    editingClientId,
    authHeaders,
    loadClients,
    setProfile,
    setPhones,
    setEmails,
    setAddresses,
    setRelationships,
    setLoyaltyPrograms,
    setSelectedClientId,
    setEditingClientId,
    setPendingDeleteClientId,
    setClientDeleteError,
    setProfileErrors,
    setProfileSaveResult,
    setProfileTab,
    setProfileBaseline,
    setStatusWarn,
    setStatusConflict,
    setStatusText,
    setIsDirty
  } = deps;

  async function loadClientForEdit(clientId: string, mode: 'edit' | 'duplicate' = 'edit'): Promise<void> {
    const request = await apiRequest<Client>(`/clients/${clientId}`, { headers: authHeaders() });
    if (!request.ok || !request.data) {
      setStatusWarn(true);
      setStatusConflict(false);
      setStatusText(t(locale, 'status.clientLoadError'));
      return;
    }
    const mapped = buildProfileStateFromClient(request.data);
    setProfile(mapped.profile);
    setPhones(mapped.phones);
    setEmails(mapped.emails);
    setAddresses(mapped.addresses);
    setRelationships(mapped.relationships);
    setLoyaltyPrograms(mapped.loyaltyPrograms);
    setSelectedClientId(request.data.id);
    setEditingClientId(mode === 'edit' ? request.data.id : null);
    setProfileErrors([]);
    setProfileSaveResult('');
    setProfileTab('contact');
    setStatusWarn(false);
    setStatusConflict(false);
    setStatusText(mode === 'edit' ? t(locale, 'status.clientLoaded') : t(locale, 'status.clientDuplicated'));
    setProfileBaseline(createProfileComparisonSnapshot(mapped.profile, mapped.phones, mapped.emails, mapped.addresses, mapped.relationships, mapped.loyaltyPrograms));
    setIsDirty(false);
  }

  function viewClient(clientId: string): void {
    setSelectedClientId(clientId);
  }

  async function deleteClient(clientId: string): Promise<void> {
    const request = await apiRequest<Client>(`/clients/${clientId}`, { method: 'DELETE', headers: authHeaders() });
    setProfileSaveResult(JSON.stringify(request.raw, null, 2));
    if (!request.ok) {
      const message = request.status === 409 ? deleteConflictMessage(locale, 'client') : responseMessage(request.raw, t(locale, 'status.deleteUnavailable'));
      setStatusWarn(true);
      setStatusConflict(request.status === 409);
      setStatusText(message);
      setClientDeleteError(request.status === 409 ? { id: clientId, message } : null);
      return;
    }
    setPendingDeleteClientId(null);
    setClientDeleteError(null);
    if (selectedClientId === clientId) setSelectedClientId(null);
    if (editingClientId === clientId) setEditingClientId(null);
    setStatusWarn(false);
    setStatusConflict(false);
    setStatusText(responseMessage(request.raw, t(locale, 'status.apiReady')));
    await loadClients();
  }

  async function forceDeleteClient(clientId: string): Promise<void> {
    const confirmation = requestCascadeDeleteConfirmation(locale);
    if (!confirmation) return;
    const request = await apiRequest<Client>(`/clients/${clientId}?cascade=true`, {
      method: 'DELETE', headers: authHeaders(true), body: JSON.stringify({ confirmation })
    });
    setProfileSaveResult(JSON.stringify(request.raw, null, 2));
    if (!request.ok) {
      const message = responseMessage(request.raw, t(locale, 'status.deleteUnavailable'));
      setStatusWarn(true);
      setStatusConflict(request.status === 409);
      setStatusText(message);
      setClientDeleteError({ id: clientId, message });
      return;
    }
    setPendingDeleteClientId(null);
    setClientDeleteError(null);
    if (selectedClientId === clientId) setSelectedClientId(null);
    if (editingClientId === clientId) setEditingClientId(null);
    setStatusWarn(false);
    setStatusConflict(false);
    setStatusText(responseMessage(request.raw, t(locale, 'status.apiReady')));
    await loadClients();
  }

  function startNewClientProfile(): void {
    setProfile(defaultForm());
    setPhones([{ type: 'cell', value: '' }]);
    setEmails([{ type: 'personal', value: '' }]);
    setAddresses([{ type: 'personal', street1: '', street2: '', city: '', state: '', zipCode: '', country: '' }]);
    setRelationships([{ relation: list(locale, 'options.relationshipTypes')[0], clientId: '' }]);
    setLoyaltyPrograms([{ type: list(locale, 'options.loyaltyTypes')[0], program: LOYALTY_PROGRAMS[0], tier: loyaltyTiersForProgram(LOYALTY_PROGRAMS[0])[0] ?? '', number: '' }]);
    setEditingClientId(null);
    setProfileErrors([]);
    setProfileSaveResult('');
    setProfileTab('contact');
    setStatusWarn(false);
    setStatusConflict(false);
    setStatusText(t(locale, 'status.clientNewMode'));
    setProfileBaseline(
      createProfileComparisonSnapshot(
        defaultForm(),
        [{ type: 'cell', value: '' }],
        [{ type: 'personal', value: '' }],
        [{ type: 'personal', street1: '', street2: '', city: '', state: '', zipCode: '', country: '' }],
        [{ relation: list(locale, 'options.relationshipTypes')[0], clientId: '' }],
        [{ type: list(locale, 'options.loyaltyTypes')[0], program: LOYALTY_PROGRAMS[0], tier: loyaltyTiersForProgram(LOYALTY_PROGRAMS[0])[0] ?? '', number: '' }]
      )
    );
    setIsDirty(false);
  }

  async function saveClientProfile(): Promise<void> {
    const { errors, normalizedContacts } = validateClientProfile({ profile, phones, emails, translate: (path) => t(locale, path) });
    setProfileErrors(errors);
    if (errors.length > 0) {
      setProfileTab('contact');
      setStatusWarn(true);
      setStatusConflict(false);
      setStatusText(t(locale, 'status.profileValidationError'));
      return;
    }

    const normalizedAddresses: ClientAddress[] = addresses
      .filter((item) => item.street1.trim() && item.city.trim() && item.state.trim() && item.zipCode.trim() && item.country.trim())
      .map((item) => ({
        type: item.type,
        street1: item.street1.trim(),
        street2: item.street2.trim() || undefined,
        city: item.city.trim(),
        state: item.state.trim(),
        zipCode: item.zipCode.trim(),
        country: item.country.trim()
      }));

    const payload = {
      firstName: profile.firstName.trim(),
      middleName: profile.middleName.trim() || undefined,
      paternalLastName: profile.paternalLastName.trim(),
      maternalLastName: profile.maternalLastName.trim() || undefined,
      birthDate: profile.birthDate || undefined,
      anniversaryDate: profile.anniversaryDate || undefined,
      companyName: profile.companyName.trim() || undefined,
      jobTitle: profile.jobTitle.trim() || undefined,
      website: profile.website.trim() || undefined,
      contacts: normalizedContacts,
      addresses: normalizedAddresses,
      travelPreferences: buildTravelPreferencesPayload(profile, relationships, loyaltyPrograms)
    };

    const request = await apiRequest<Client>(editingClientId ? `/clients/${editingClientId}` : '/clients', {
      method: editingClientId ? 'PATCH' : 'POST', headers: authHeaders(true), body: JSON.stringify(payload)
    });
    setProfileSaveResult(JSON.stringify(request.raw, null, 2));
    if (!request.ok) return;

    setProfileErrors([]);
    setStatusWarn(false);
    setStatusConflict(false);
    setStatusText(editingClientId ? t(locale, 'status.profileUpdated') : t(locale, 'status.profileSaved'));
    if (request.data?.id) {
      setEditingClientId(request.data.id);
      setSelectedClientId(request.data.id);
    }
    setProfileBaseline(createProfileComparisonSnapshot(profile, phones, emails, addresses, relationships, loyaltyPrograms));
    setIsDirty(false);
    await loadClients();
  }

  function cancelProfile(): void {
    if (isDirty && !window.confirm(t(locale, 'validation.discardChanges'))) return;
    setProfile(defaultForm());
    setPhones([{ type: 'cell', value: '' }]);
    setEmails([{ type: 'personal', value: '' }]);
    setAddresses([{ type: 'personal', street1: '', street2: '', city: '', state: '', zipCode: '', country: '' }]);
    setRelationships([{ relation: list(locale, 'options.relationshipTypes')[0], clientId: '' }]);
    setLoyaltyPrograms([{ type: list(locale, 'options.loyaltyTypes')[0], program: LOYALTY_PROGRAMS[0], tier: loyaltyTiersForProgram(LOYALTY_PROGRAMS[0])[0] ?? '', number: '' }]);
    setProfileErrors([]);
    setProfileSaveResult('');
    setEditingClientId(null);
    setProfileTab('contact');
    setProfileBaseline(
      createProfileComparisonSnapshot(
        defaultForm(),
        [{ type: 'cell', value: '' }],
        [{ type: 'personal', value: '' }],
        [{ type: 'personal', street1: '', street2: '', city: '', state: '', zipCode: '', country: '' }],
        [{ relation: list(locale, 'options.relationshipTypes')[0], clientId: '' }],
        [{ type: list(locale, 'options.loyaltyTypes')[0], program: LOYALTY_PROGRAMS[0], tier: loyaltyTiersForProgram(LOYALTY_PROGRAMS[0])[0] ?? '', number: '' }]
      )
    );
    setIsDirty(false);
  }

  return { loadClientForEdit, viewClient, deleteClient, forceDeleteClient, startNewClientProfile, saveClientProfile, cancelProfile };
}