import { useCallback, useEffect, useMemo, useState } from 'react';
import './App.css';
import { apiRequest, defaultForm, restoreSessionAuth } from './modules/crm/api';
import type { DeleteRowError } from './modules/crm/app-types';
import { titleFromView } from './modules/crm/app-utils';
import { createClientActions } from './modules/crm/client-actions';
import { list, t } from './modules/crm/i18n';
import { createLeadActions, createSupplierActions } from './modules/crm/entity-actions';
import { AuthCard } from './modules/crm/components/AuthCard';
import { DashboardView } from './modules/crm/components/DashboardView';
import { LeadsView } from './modules/crm/components/LeadsView';
import { PlaceholderView } from './modules/crm/components/PlaceholderView';
import { Sidebar } from './modules/crm/components/Sidebar';
import { SuppliersView } from './modules/crm/components/SuppliersView';
import { Topbar } from './modules/crm/components/Topbar';
import { ClientsView } from './modules/crm/components/clients/ClientsView';
import { createProfileComparisonSnapshot, diffProfileSnapshots } from './modules/crm/client-profile-persistence';
import {
  API_BASE,
  AUTH_STORAGE_KEY,
  LOYALTY_PROGRAMS,
  PROFILE_TAB_KEYS,
  loyaltyTiersForProgram,
  type Client,
  type ClientProfileForm,
  type Lead,
  type Locale,
  type LoyaltyProgram,
  type ProfileTabKey,
  type Relationship,
  type RepeatAddress,
  type RepeatEmail,
  type RepeatPhone,
  type SessionAuth,
  type Supplier,
  type SupplierIncident,
  type SupplierRecentBooking,
  type ViewKey,
} from './modules/crm/types';

function App() {
  const [locale, setLocale] = useState<Locale>('es-MX');
  const [auth, setAuth] = useState<SessionAuth>(() => restoreSessionAuth(AUTH_STORAGE_KEY));
  const [view, setView] = useState<ViewKey>('dashboard');
  const [profileTab, setProfileTab] = useState<ProfileTabKey>('contact');
  const [statusText, setStatusText] = useState(t('es-MX', 'status.connecting'));
  const [statusWarn, setStatusWarn] = useState(false);
  const [statusConflict, setStatusConflict] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [editingLeadId, setEditingLeadId] = useState<string | null>(null);
  const [pendingDeleteLeadId, setPendingDeleteLeadId] = useState<string | null>(null);
  const [leadDeleteError, setLeadDeleteError] = useState<DeleteRowError | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [pendingDeleteClientId, setPendingDeleteClientId] = useState<string | null>(null);
  const [clientDeleteError, setClientDeleteError] = useState<DeleteRowError | null>(null);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [editingSupplierId, setEditingSupplierId] = useState<string | null>(null);
  const [pendingDeleteSupplierId, setPendingDeleteSupplierId] = useState<string | null>(null);
  const [supplierDeleteError, setSupplierDeleteError] = useState<DeleteRowError | null>(null);
  const [lastClientId, setLastClientId] = useState<string>('—');
  const [leadForm, setLeadForm] = useState({
    status: 'new',
    firstName: '',
    paternalLastName: '',
    email: '',
    phone: '',
    destination: 'Oaxaca',
    travelStartDate: '',
    adultsCount: 2,
    childrenCount: 0,
    estimatedBudgetMin: '',
    estimatedBudgetMax: '',
    urgencyTimeframe: 'just_browsing',
    tripOccasion: '',
    campaignId: '',
    referralName: '',
    assignedAgentName: '',
    lastContactDate: '',
    probabilityOfSale: 50,
    leadTemperature: 'warm',
    dateFlexibility: 'flexible',
    preferredContactMethod: 'whatsapp',
    serviceTypes: [] as string[],
    preferences: '',
    additionalComments: '',
    source: 'website',
    priority: 'high',
  });
  const [convertForm, setConvertForm] = useState({ firstName: '', paternalLastName: '', email: '', phone: '' });
  const [leadResult, setLeadResult] = useState('');
  const [convertResult, setConvertResult] = useState('');
  const [supplierForm, setSupplierForm] = useState({
    name: '',
    tradeName: '',
    type: 'hotel',
    serviceModel: 'private',
    marketFocusTags: [] as string[],
    tierLevel: 'silver',
    rfc: '',
    billingAddress: '',
    status: 'active',
    defaultCurrency: 'MXN' as 'MXN' | 'USD' | 'EUR',
    commissionType: 'percentage',
    commissionRate: 10,
    payoutTerms: 'upon_booking',
    contractExpiryDate: '',
    blackoutDates: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    internalRating: 4,
    responseTimeScore: 80,
    internalRiskFlag: 'reliable',
  });
  const [supplierResult, setSupplierResult] = useState('');
  const [supplierIncidents, setSupplierIncidents] = useState<SupplierIncident[]>([]);
  const [supplierRecentBookings, setSupplierRecentBookings] = useState<SupplierRecentBooking[]>([]);
  const [profile, setProfile] = useState<ClientProfileForm>(defaultForm());
  const [phones, setPhones] = useState<RepeatPhone[]>([{ type: 'cell', value: '' }]);
  const [emails, setEmails] = useState<RepeatEmail[]>([{ type: 'personal', value: '' }]);
  const [addresses, setAddresses] = useState<RepeatAddress[]>([
    { type: 'personal', street1: '', street2: '', city: '', state: '', zipCode: '', country: '' },
  ]);
  const [relationships, setRelationships] = useState<Relationship[]>([{ relation: list('es-MX', 'options.relationshipTypes')[0], clientId: '' }]);
  const [loyaltyPrograms, setLoyaltyPrograms] = useState<LoyaltyProgram[]>([
    {
      type: list('es-MX', 'options.loyaltyTypes')[0],
      program: LOYALTY_PROGRAMS[0],
      tier: loyaltyTiersForProgram(LOYALTY_PROGRAMS[0])[0] ?? '',
      number: ''
    }
  ]);
  const [profileErrors, setProfileErrors] = useState<string[]>([]);
  const [profileSaveResult, setProfileSaveResult] = useState('');
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [profileBaseline, setProfileBaseline] = useState(() =>
    createProfileComparisonSnapshot(
      defaultForm(),
      [{ type: 'cell', value: '' }],
      [{ type: 'personal', value: '' }],
      [{ type: 'personal', street1: '', street2: '', city: '', state: '', zipCode: '', country: '' }],
      [{ relation: list('es-MX', 'options.relationshipTypes')[0], clientId: '' }],
      [{
        type: list('es-MX', 'options.loyaltyTypes')[0],
        program: LOYALTY_PROGRAMS[0],
        tier: loyaltyTiersForProgram(LOYALTY_PROGRAMS[0])[0] ?? '',
        number: ''
      }]
    )
  );
  const [isDirty, setIsDirty] = useState(false);
  const changedProfileSections = useMemo(
    () =>
      diffProfileSnapshots(
        createProfileComparisonSnapshot(profile, phones, emails, addresses, relationships, loyaltyPrograms),
        profileBaseline
      ),
    [profile, phones, emails, addresses, relationships, loyaltyPrograms, profileBaseline]
  );

  useEffect(() => {
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
  }, [auth]);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [isDirty]);

  const kpi = useMemo(() => {
    const totalLeads = leads.length;
    const newLeads = leads.filter((lead) => lead.status === 'new').length;
    const totalClients = clients.length;
    const conversion = totalLeads > 0 ? Math.round((totalClients / totalLeads) * 100) : 0;
    return { totalLeads, newLeads, totalClients, conversion };
  }, [leads, clients]);

  const sidebarLinks = useMemo(() => ([
    { key: 'dashboard', label: t(locale, 'nav.dashboard'), functional: true },
    { key: 'leads', label: t(locale, 'nav.leads'), functional: true },
    { key: 'clients', label: t(locale, 'nav.clients'), functional: true },
    { key: 'itineraries', label: t(locale, 'nav.itineraries'), functional: false },
    { key: 'suppliers', label: t(locale, 'nav.suppliers'), functional: true },
    { key: 'commissions', label: t(locale, 'nav.commissions'), functional: false },
    { key: 'financials', label: t(locale, 'nav.financials'), functional: false },
    { key: 'messaging', label: t(locale, 'nav.messaging'), functional: false },
    { key: 'ops', label: t(locale, 'nav.ops'), functional: false },
    { key: 'management', label: t(locale, 'nav.management'), functional: false },
    { key: 'ai', label: t(locale, 'nav.ai'), functional: false },
    { key: 'settings', label: t(locale, 'nav.settings'), functional: true },
  ]), [locale]);

  const profileTabs = useMemo(() => PROFILE_TAB_KEYS.map((key) => ({ key, label: t(locale, `clients.profileTabs.${key}`) })), [locale]);

  const authHeaders = useCallback((includeJsonContentType = false): Record<string, string> => {
    const headers: Record<string, string> = { 'x-locale': locale };
    if (includeJsonContentType) headers['content-type'] = 'application/json';

    headers['x-user-id'] = auth.userId;
    headers['x-user-role'] = auth.role;

    if (auth.accessToken) {
      headers.authorization = `Bearer ${auth.accessToken}`;
    }

    return headers;
  }, [locale, auth]);

  const loadLeads = useCallback(async () => {
    const response = await apiRequest<Lead[]>('/leads', { headers: authHeaders() });
    if (response.ok && Array.isArray(response.data)) setLeads(response.data);
  }, [authHeaders]);

  const loadClients = useCallback(async () => {
    const response = await apiRequest<Client[]>('/clients', { headers: authHeaders() });
    if (response.ok && Array.isArray(response.data)) setClients(response.data);
  }, [authHeaders]);

  const loadSuppliers = useCallback(async () => {
    const response = await apiRequest<Supplier[]>('/suppliers', { headers: authHeaders() });
    if (response.ok && Array.isArray(response.data)) setSuppliers(response.data);
  }, [authHeaders]);

  const loadSupplierIncidents = useCallback(async (supplierId: string) => {
    const response = await apiRequest<SupplierIncident[]>(`/suppliers/${supplierId}/incidents`, { headers: authHeaders() });
    if (response.ok && Array.isArray(response.data)) {
      setSupplierIncidents(response.data);
      return;
    }
    setSupplierIncidents([]);
  }, [authHeaders]);

  const loadSupplierRecentBookings = useCallback(async (supplierId: string) => {
    const response = await apiRequest<SupplierRecentBooking[]>(`/suppliers/${supplierId}/recent-bookings`, { headers: authHeaders() });
    if (response.ok && Array.isArray(response.data)) {
      setSupplierRecentBookings(response.data);
      return;
    }
    setSupplierRecentBookings([]);
  }, [authHeaders]);

  const addSupplierIncident = useCallback(async (
    supplierId: string,
    payload: { occurredAt?: string; clientName?: string; summary: string; severity: 'low' | 'medium' | 'high' }
  ) => {
    const response = await apiRequest<SupplierIncident>(`/suppliers/${supplierId}/incidents`, {
      method: 'POST',
      headers: authHeaders(true),
      body: JSON.stringify(payload)
    });
    setSupplierResult(JSON.stringify(response.raw, null, 2));
    if (!response.ok) return false;
    await loadSupplierIncidents(supplierId);
    return true;
  }, [authHeaders, loadSupplierIncidents]);

  const issueSessionToken = useCallback(async () => {
    const response = await apiRequest<{ accessToken: string; refreshToken: string }>('/auth/token', {
      method: 'POST',
      headers: {
        ...authHeaders(true),
        'x-user-id': auth.userId,
        'x-user-role': auth.role,
      },
      body: JSON.stringify({}),
    });

    if (!response.ok || !response.data?.accessToken || !response.data?.refreshToken) {
      setStatusWarn(true);
      setStatusConflict(false);
      setStatusText(t(locale, 'status.sessionError'));
      return;
    }
    setAuth((prev) => ({
      ...prev,
      accessToken: response.data?.accessToken ?? '',
      refreshToken: response.data?.refreshToken ?? '',
    }));
    setStatusWarn(false);
    setStatusConflict(false);
    setStatusText(t(locale, 'status.sessionReady'));
    await Promise.all([loadLeads(), loadClients(), loadSuppliers()]);
  }, [auth.userId, auth.role, authHeaders, locale, loadClients, loadLeads, loadSuppliers]);

  const clearSessionToken = useCallback(() => {
    setAuth((prev) => ({ ...prev, accessToken: '', refreshToken: '' }));
  }, []);

  const bootstrap = useCallback(async () => {
    const health = await fetch(`${API_BASE}/health`).catch(() => null);
    if (!health || health.status !== 200) {
      setStatusWarn(true);
      setStatusConflict(false);
      setStatusText(t(locale, 'status.apiError'));
      return;
    }
    setStatusWarn(false);
    setStatusConflict(false);
    setStatusText(t(locale, 'status.apiReady'));
    await Promise.all([loadLeads(), loadClients(), loadSuppliers()]);
  }, [locale, loadLeads, loadClients, loadSuppliers]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void bootstrap();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [bootstrap]);

  function updateProfileField<K extends keyof ClientProfileForm>(key: K, value: ClientProfileForm[K]) {
    setProfile((prev) => ({ ...prev, [key]: value }));
    setIsDirty(true);
  }

  function toggleArrayField(field: 'accommodations' | 'vibePreferences' | 'activityPreferences', value: string) {
    setProfile((prev) => {
      const exists = prev[field].includes(value);
      const next = exists ? prev[field].filter((item) => item !== value) : [...prev[field], value];
      return { ...prev, [field]: next };
    });
    setIsDirty(true);
  }
  const leadActions = createLeadActions({
    locale,
    leads,
    selectedLeadId,
    editingLeadId,
    leadForm,
    convertForm,
    authHeaders,
    loadLeads,
    loadClients,
    setLeadForm,
    setSelectedLeadId,
    setEditingLeadId,
    setPendingDeleteLeadId,
    setLeadDeleteError,
    setLeadResult,
    setConvertResult,
    setLastClientId,
    setStatusWarn,
    setStatusConflict,
    setStatusText
  });
  const clientActions = createClientActions({
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
  });
  const supplierActions = createSupplierActions({
    locale,
    suppliers,
    selectedSupplierId,
    editingSupplierId,
    supplierForm,
    authHeaders,
    loadSuppliers,
    setSelectedSupplierId,
    setEditingSupplierId,
    setPendingDeleteSupplierId,
    setSupplierDeleteError,
    setSupplierForm,
    setSupplierResult,
    setStatusWarn,
    setStatusConflict,
    setStatusText
  });

  return (
    <div className="crm-layout">
      <Sidebar locale={locale} view={view} links={sidebarLinks} onSelectView={setView} />
      <main className="crm-main">
        <Topbar title={titleFromView(locale, view)} locale={locale} isDirty={isDirty} onLocaleChange={setLocale} />
        <section className="crm-content">
          <div className={`status ${statusWarn ? 'warn' : ''} ${statusConflict ? 'blocked' : ''}`}>{statusText}</div>

          {view === 'dashboard' ? <DashboardView locale={locale} leads={leads} kpi={kpi} /> : null}
          {view === 'leads' ? (
            <LeadsView
              locale={locale}
              leads={leads}
              leadForm={leadForm}
              convertForm={convertForm}
              selectedLeadId={selectedLeadId}
              pendingDeleteLeadId={pendingDeleteLeadId}
              deleteLeadError={leadDeleteError}
              lastClientId={lastClientId}
              leadResult={leadResult}
              convertResult={convertResult}
              onLeadFormChange={setLeadForm}
              onConvertFormChange={setConvertForm}
              onSelectLead={setSelectedLeadId}
              onStartEditLead={leadActions.startEditLead}
              onStartCreateLead={leadActions.startCreateLead}
              onCancelEditLead={leadActions.cancelLeadEdit}
              onSaveLead={leadActions.saveLead}
              onRequestDeleteLead={(leadId) => {
                setLeadDeleteError(null);
                setPendingDeleteLeadId(leadId);
              }}
              onCancelDeleteLead={() => {
                setLeadDeleteError(null);
                setPendingDeleteLeadId(null);
              }}
              onDeleteLead={(leadId) => void leadActions.deleteLead(leadId)}
              onForceDeleteLead={(leadId) => void leadActions.forceDeleteLead(leadId)}
              onConvertLead={(signal) => leadActions.convertLead(signal)}
              onRefreshLeads={() => void loadLeads()}
              onOpenClientsList={() => setView('clients')}
              onOpenConvertedClient={(clientId) => {
                const targetClientId = clientId ?? lastClientId;
                if (!targetClientId || targetClientId === '—') return;
                setSelectedClientId(targetClientId);
                setView('clients');
              }}
            />
          ) : null}
          {view === 'clients' ? (
            <ClientsView
              locale={locale}
              profileTab={profileTab}
              setProfileTab={setProfileTab}
              profileTabs={profileTabs}
              profile={profile}
              phones={phones}
              emails={emails}
              addresses={addresses}
              relationships={relationships}
              loyaltyPrograms={loyaltyPrograms}
              clients={clients}
              selectedClientId={selectedClientId}
              pendingDeleteClientId={pendingDeleteClientId}
              deleteClientError={clientDeleteError}
              changedProfileSections={changedProfileSections}
              profileErrors={profileErrors}
              profileSaveResult={profileSaveResult}
              updateProfileField={updateProfileField}
              toggleArrayField={toggleArrayField}
              setPhones={setPhones}
              setEmails={setEmails}
              setAddresses={setAddresses}
              setRelationships={setRelationships}
              setLoyaltyPrograms={setLoyaltyPrograms}
              setIsDirty={setIsDirty}
              onCancel={clientActions.cancelProfile}
              onSave={() => void clientActions.saveClientProfile()}
              onRefreshClients={() => void loadClients()}
              onViewClient={(clientId) => void clientActions.loadClientForEdit(clientId, 'edit')}
              onRequestDeleteClient={(clientId) => {
                setClientDeleteError(null);
                setPendingDeleteClientId(clientId);
              }}
              onCancelDeleteClient={() => {
                setClientDeleteError(null);
                setPendingDeleteClientId(null);
              }}
              onDeleteClient={(clientId) => void clientActions.deleteClient(clientId)}
              onForceDeleteClient={(clientId) => void clientActions.forceDeleteClient(clientId)}
              onStartNewProfile={clientActions.startNewClientProfile}
            />
          ) : null}
          {view === 'suppliers' ? (
            <SuppliersView
              locale={locale}
              suppliers={suppliers}
              supplierForm={supplierForm}
              selectedSupplierId={selectedSupplierId}
              pendingDeleteSupplierId={pendingDeleteSupplierId}
              deleteSupplierError={supplierDeleteError}
              supplierResult={supplierResult}
              supplierIncidents={supplierIncidents}
              supplierRecentBookings={supplierRecentBookings}
              onSupplierFormChange={setSupplierForm}
              onRefreshSuppliers={() => void loadSuppliers()}
              onViewSupplier={supplierActions.viewSupplier}
              onLoadSupplierIncidents={(supplierId) => void loadSupplierIncidents(supplierId)}
              onLoadSupplierRecentBookings={(supplierId) => void loadSupplierRecentBookings(supplierId)}
              onAddSupplierIncident={(supplierId, payload) => void addSupplierIncident(supplierId, payload)}
              onStartCreateSupplier={supplierActions.startCreateSupplier}
              onCancelEditSupplier={supplierActions.cancelSupplierEdit}
              onSaveSupplier={() => void supplierActions.saveSupplier()}
              onRequestDeleteSupplier={(supplierId) => {
                setSupplierDeleteError(null);
                setPendingDeleteSupplierId(supplierId);
              }}
              onCancelDeleteSupplier={() => {
                setSupplierDeleteError(null);
                setPendingDeleteSupplierId(null);
              }}
              onDeleteSupplier={(supplierId) => void supplierActions.deleteSupplier(supplierId)}
              onForceDeleteSupplier={(supplierId) => void supplierActions.forceDeleteSupplier(supplierId)}
            />
          ) : null}
          {view === 'settings' ? (
            <>
              <section className="card">
                <p className="muted">{t(locale, 'auth.settingsHint')}</p>
              </section>
              <AuthCard locale={locale} auth={auth} onChangeAuth={setAuth} onIssueToken={() => void issueSessionToken()} onClearToken={clearSessionToken} />
            </>
          ) : null}
          {view === 'placeholder' ? <PlaceholderView locale={locale} /> : null}
        </section>
      </main>
    </div>
  );
}

export default App;
