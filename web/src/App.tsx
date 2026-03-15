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
import { ItinerariesView } from './modules/crm/components/ItinerariesView';
import { LeadsView } from './modules/crm/components/LeadsView';
import { PlaceholderView } from './modules/crm/components/PlaceholderView';
import { ProposalPortalPublicView } from './modules/crm/components/ProposalPortalPublicView';
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
  type DestinationLibraryItem,
  type ItineraryDay,
  type ItineraryDayActivity,
  type ItineraryDayActivityCategory,
  type Itinerary,
  type ItineraryStatus,
  type Lead,
  type Locale,
  type PortalProposalActionEvent,
  type PortalProposalView,
  type ProposalPublicationShare,
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
  const VIEW_STORAGE_KEY = 'misviajescrm.web.activeView';

  function restoreView(): ViewKey {
    if (typeof window === 'undefined') return 'dashboard';
    const raw = window.localStorage.getItem(VIEW_STORAGE_KEY);
    if (!raw) return 'dashboard';
    if (raw === 'dashboard' || raw === 'leads' || raw === 'clients' || raw === 'itineraries' || raw === 'suppliers' || raw === 'settings' || raw === 'placeholder') {
      return raw;
    }
    return 'dashboard';
  }

  function detectPublicPortalHash(): string | null {
    if (typeof window === 'undefined') return null;
    const match = window.location.pathname.match(/^\/view\/p\/([^/]+)$/);
    return match?.[1] ? decodeURIComponent(match[1]) : null;
  }

  const [locale, setLocale] = useState<Locale>('es-MX');
  const [auth, setAuth] = useState<SessionAuth>(() => restoreSessionAuth(AUTH_STORAGE_KEY));
  const [view, setView] = useState<ViewKey>(restoreView);
  const [publicPortalHash] = useState<string | null>(detectPublicPortalHash);
  const [profileTab, setProfileTab] = useState<ProfileTabKey>('contact');
  const [statusText, setStatusText] = useState(t('es-MX', 'status.connecting'));
  const [statusWarn, setStatusWarn] = useState(false);
  const [statusConflict, setStatusConflict] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
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
    window.localStorage.setItem(VIEW_STORAGE_KEY, view);
  }, [view]);

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
    { key: 'itineraries', label: t(locale, 'nav.itineraries'), functional: true },
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

  const loadItineraries = useCallback(async () => {
    const response = await apiRequest<Itinerary[]>('/itineraries', { headers: authHeaders() });
    if (response.ok && Array.isArray(response.data)) setItineraries(response.data);
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
    await Promise.all([loadLeads(), loadClients(), loadItineraries(), loadSuppliers()]);
  }, [auth.userId, auth.role, authHeaders, locale, loadClients, loadItineraries, loadLeads, loadSuppliers]);

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
    await Promise.all([loadLeads(), loadClients(), loadItineraries(), loadSuppliers()]);
  }, [locale, loadLeads, loadClients, loadItineraries, loadSuppliers]);

  const moveItineraryPipeline = useCallback(async (
    itineraryId: string,
    toStatus: Extract<ItineraryStatus, 'sent' | 'revised' | 'accepted'>
  ): Promise<{ ok: boolean; message: string }> => {
    const response = await apiRequest<unknown>(`/itineraries/${itineraryId}/pipeline/move`, {
      method: 'POST',
      headers: authHeaders(true),
      body: JSON.stringify({ toStatus })
    });

    const message = (response.raw as { message?: string } | null | undefined)?.message
      ?? t(locale, response.ok ? 'itineraries.moveSuccess' : 'itineraries.moveError');

    setStatusWarn(!response.ok);
    setStatusConflict(false);
    setStatusText(message);

    if (response.ok) await loadItineraries();

    return {
      ok: response.ok,
      message
    };
  }, [authHeaders, locale, loadItineraries]);

  const listItineraryDays = useCallback(async (itineraryId: string): Promise<ItineraryDay[]> => {
    const response = await apiRequest<ItineraryDay[]>(`/itineraries/${itineraryId}/days`, { headers: authHeaders() });
    return response.ok && Array.isArray(response.data) ? response.data : [];
  }, [authHeaders]);

  const createItineraryDay = useCallback(async (
    itineraryId: string,
    payload: { dayIndex: number; title: string; dayDate?: string; summary?: string }
  ): Promise<{ ok: boolean; data: ItineraryDay | null; message: string }> => {
    const response = await apiRequest<ItineraryDay>(`/itineraries/${itineraryId}/days`, {
      method: 'POST',
      headers: authHeaders(true),
      body: JSON.stringify(payload)
    });

    const message = (response.raw as { message?: string } | null | undefined)?.message ?? t(locale, 'itineraries.builderError');
    if (!response.ok) {
      setStatusWarn(true);
      setStatusConflict(false);
      setStatusText(message);
    }

    return {
      ok: response.ok,
      data: response.data,
      message
    };
  }, [authHeaders, locale]);

  const updateItineraryDay = useCallback(async (
    itineraryId: string,
    dayId: string,
    payload: Partial<Pick<ItineraryDay, 'dayIndex' | 'title' | 'dayDate' | 'summary'>>
  ): Promise<{ ok: boolean; data: ItineraryDay | null; message: string }> => {
    const response = await apiRequest<ItineraryDay>(`/itineraries/${itineraryId}/days/${dayId}`, {
      method: 'PATCH',
      headers: authHeaders(true),
      body: JSON.stringify(payload)
    });

    const message = (response.raw as { message?: string } | null | undefined)?.message ?? t(locale, 'itineraries.builderError');
    if (!response.ok) {
      setStatusWarn(true);
      setStatusConflict(false);
      setStatusText(message);
    }

    return {
      ok: response.ok,
      data: response.data,
      message
    };
  }, [authHeaders, locale]);

  const listItineraryDayActivities = useCallback(async (itineraryId: string, dayId: string): Promise<ItineraryDayActivity[]> => {
    const response = await apiRequest<ItineraryDayActivity[]>(`/itineraries/${itineraryId}/days/${dayId}/activities`, { headers: authHeaders() });
    return response.ok && Array.isArray(response.data) ? response.data : [];
  }, [authHeaders]);

  const createItineraryDayActivity = useCallback(async (
    itineraryId: string,
    dayId: string,
    payload: {
      activityIndex: number;
      title: string;
      category: ItineraryDayActivityCategory;
      priceNet: number;
      priceGross: number;
      optionalEnabled?: boolean;
      startsAtLocal?: string;
      durationMinutes?: number;
      descriptionEs?: string;
      descriptionEn?: string;
      mediaUrl?: string;
      latitude?: number;
      longitude?: number;
    }
  ): Promise<{ ok: boolean; data: { activity: ItineraryDayActivity; itinerary: Itinerary } | null; message: string }> => {
    const response = await apiRequest<{ activity: ItineraryDayActivity; itinerary: Itinerary }>(`/itineraries/${itineraryId}/days/${dayId}/activities`, {
      method: 'POST',
      headers: authHeaders(true),
      body: JSON.stringify(payload)
    });

    const message = (response.raw as { message?: string } | null | undefined)?.message ?? t(locale, 'itineraries.builderError');
    if (!response.ok) {
      setStatusWarn(true);
      setStatusConflict(false);
      setStatusText(message);
      return { ok: false, data: null, message };
    }

    await loadItineraries();
    return { ok: true, data: response.data, message };
  }, [authHeaders, locale, loadItineraries]);

  const updateItineraryDayActivity = useCallback(async (
    itineraryId: string,
    dayId: string,
    activityId: string,
    payload: Partial<{
      activityIndex: number;
      title: string;
      category: ItineraryDayActivityCategory;
      priceNet: number;
      priceGross: number;
      optionalEnabled: boolean;
      startsAtLocal: string;
      durationMinutes: number;
      descriptionEs: string;
      descriptionEn: string;
      mediaUrl: string;
      latitude: number;
      longitude: number;
    }>
  ): Promise<{ ok: boolean; data: { activity: ItineraryDayActivity; itinerary: Itinerary } | null; message: string }> => {
    const response = await apiRequest<{ activity: ItineraryDayActivity; itinerary: Itinerary }>(`/itineraries/${itineraryId}/days/${dayId}/activities/${activityId}`, {
      method: 'PATCH',
      headers: authHeaders(true),
      body: JSON.stringify(payload)
    });

    const message = (response.raw as { message?: string } | null | undefined)?.message ?? t(locale, 'itineraries.builderError');
    if (!response.ok) {
      setStatusWarn(true);
      setStatusConflict(false);
      setStatusText(message);
      return { ok: false, data: null, message };
    }

    await loadItineraries();
    return { ok: true, data: response.data, message };
  }, [authHeaders, locale, loadItineraries]);

  const searchDestinationLibrary = useCallback(async (
    query: { location?: string; category?: 'activity' | 'hotel' | 'dining' | 'transfer' | 'other'; limit?: number }
  ): Promise<DestinationLibraryItem[]> => {
    const searchParams = new URLSearchParams();
    if (query.location?.trim()) searchParams.set('location', query.location.trim());
    if (query.category) searchParams.set('category', query.category);
    if (query.limit) searchParams.set('limit', String(query.limit));
    const suffix = searchParams.toString() ? `?${searchParams.toString()}` : '';

    const response = await apiRequest<DestinationLibraryItem[]>(`/itineraries/library/destinations${suffix}`, {
      headers: authHeaders()
    });

    return response.ok && Array.isArray(response.data) ? response.data : [];
  }, [authHeaders]);

  const publishItineraryProposal = useCallback(async (
    itineraryId: string,
    payload: { expiresAt?: string }
  ): Promise<{ ok: boolean; data: ProposalPublicationShare | null; message: string }> => {
    const response = await apiRequest<ProposalPublicationShare>(`/itineraries/${itineraryId}/publish`, {
      method: 'POST',
      headers: authHeaders(true),
      body: JSON.stringify(payload)
    });

    const message = (response.raw as { message?: string } | null | undefined)?.message ?? t(locale, 'itineraries.publishError');
    setStatusWarn(!response.ok);
    setStatusConflict(false);
    setStatusText(message);

    if (response.ok) {
      await loadItineraries();
    }

    return {
      ok: response.ok,
      data: response.data,
      message
    };
  }, [authHeaders, locale, loadItineraries]);

  const fetchPortalProposal = useCallback(async (hash: string): Promise<PortalProposalView | null> => {
    const response = await apiRequest<PortalProposalView>(`/portal/proposals/${hash}`, {
      headers: {
        'x-locale': locale
      }
    });

    if (!response.ok) {
      const message = (response.raw as { message?: string } | null | undefined)?.message ?? t(locale, 'itineraries.portalLoadError');
      setStatusWarn(true);
      setStatusConflict(false);
      setStatusText(message);
      return null;
    }

    return response.data;
  }, [locale]);

  const portalApproveProposal = useCallback(async (
    hash: string,
    message?: string
  ): Promise<{ ok: boolean; data: PortalProposalActionEvent | null; message: string }> => {
    const response = await apiRequest<{ itinerary: Itinerary; action: PortalProposalActionEvent }>(`/portal/proposals/${hash}/actions/approve`, {
      method: 'POST',
      headers: {
        'x-locale': locale,
        'content-type': 'application/json'
      },
      body: JSON.stringify({ message: message || undefined })
    });

    const resultMessage = (response.raw as { message?: string } | null | undefined)?.message ?? t(locale, 'itineraries.portalActionError');
    setStatusWarn(!response.ok);
    setStatusConflict(false);
    setStatusText(resultMessage);

    if (response.ok) {
      await loadItineraries();
    }

    return {
      ok: response.ok,
      data: response.data?.action ?? null,
      message: resultMessage
    };
  }, [locale, loadItineraries]);

  const portalRequestRevision = useCallback(async (
    hash: string,
    feedback: string
  ): Promise<{ ok: boolean; data: PortalProposalActionEvent | null; message: string }> => {
    const response = await apiRequest<{ itinerary: Itinerary; action: PortalProposalActionEvent }>(`/portal/proposals/${hash}/actions/request-revision`, {
      method: 'POST',
      headers: {
        'x-locale': locale,
        'content-type': 'application/json'
      },
      body: JSON.stringify({ feedback })
    });

    const resultMessage = (response.raw as { message?: string } | null | undefined)?.message ?? t(locale, 'itineraries.portalActionError');
    setStatusWarn(!response.ok);
    setStatusConflict(false);
    setStatusText(resultMessage);

    if (response.ok) {
      await loadItineraries();
    }

    return {
      ok: response.ok,
      data: response.data?.action ?? null,
      message: resultMessage
    };
  }, [locale, loadItineraries]);

  const loadPublicPortalProposal = useCallback(async (
    hash: string
  ): Promise<{ proposal: PortalProposalView | null; status: number; message: string }> => {
    const response = await apiRequest<PortalProposalView>(`/portal/proposals/${hash}`, {
      headers: {
        'x-locale': locale
      }
    });

    return {
      proposal: response.ok ? response.data : null,
      status: response.status,
      message: (response.raw as { message?: string } | null | undefined)?.message ?? t(locale, 'itineraries.portalLoadFailed')
    };
  }, [locale]);

  const publicPortalApprove = useCallback(async (
    hash: string,
    message?: string
  ): Promise<{ ok: boolean; data: PortalProposalActionEvent | null; message: string }> => {
    const response = await apiRequest<{ itinerary: Itinerary; action: PortalProposalActionEvent }>(`/portal/proposals/${hash}/actions/approve`, {
      method: 'POST',
      headers: {
        'x-locale': locale,
        'content-type': 'application/json'
      },
      body: JSON.stringify({ message: message || undefined })
    });

    return {
      ok: response.ok,
      data: response.data?.action ?? null,
      message: (response.raw as { message?: string } | null | undefined)?.message ?? t(locale, 'itineraries.portalActionError')
    };
  }, [locale]);

  const publicPortalRequestRevision = useCallback(async (
    hash: string,
    feedback: string
  ): Promise<{ ok: boolean; data: PortalProposalActionEvent | null; message: string }> => {
    const response = await apiRequest<{ itinerary: Itinerary; action: PortalProposalActionEvent }>(`/portal/proposals/${hash}/actions/request-revision`, {
      method: 'POST',
      headers: {
        'x-locale': locale,
        'content-type': 'application/json'
      },
      body: JSON.stringify({ feedback })
    });

    return {
      ok: response.ok,
      data: response.data?.action ?? null,
      message: (response.raw as { message?: string } | null | undefined)?.message ?? t(locale, 'itineraries.portalActionError')
    };
  }, [locale]);

  useEffect(() => {
    if (publicPortalHash) return;
    const timer = window.setTimeout(() => {
      void bootstrap();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [bootstrap, publicPortalHash]);

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

  if (publicPortalHash) {
    return (
      <ProposalPortalPublicView
        locale={locale}
        proposalHash={publicPortalHash}
        onLoadProposal={(hash) => loadPublicPortalProposal(hash)}
        onApprove={(hash, message) => publicPortalApprove(hash, message)}
        onRequestRevision={(hash, feedback) => publicPortalRequestRevision(hash, feedback)}
      />
    );
  }

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
          {view === 'itineraries' ? (
            <ItinerariesView
              locale={locale}
              itineraries={itineraries}
              onRefreshItineraries={() => void loadItineraries()}
              onMovePipeline={(itineraryId, toStatus) => moveItineraryPipeline(itineraryId, toStatus)}
              onListDays={(itineraryId) => listItineraryDays(itineraryId)}
              onCreateDay={(itineraryId, payload) => createItineraryDay(itineraryId, payload)}
              onUpdateDay={(itineraryId, dayId, payload) => updateItineraryDay(itineraryId, dayId, payload)}
              onListDayActivities={(itineraryId, dayId) => listItineraryDayActivities(itineraryId, dayId)}
              onCreateDayActivity={(itineraryId, dayId, payload) => createItineraryDayActivity(itineraryId, dayId, payload)}
              onUpdateDayActivity={(itineraryId, dayId, activityId, payload) => updateItineraryDayActivity(itineraryId, dayId, activityId, payload)}
              onSearchDestinationLibrary={(query) => searchDestinationLibrary(query)}
              onPublishProposal={(itineraryId, payload) => publishItineraryProposal(itineraryId, payload)}
              onLoadPortalProposal={(hash) => fetchPortalProposal(hash)}
              onPortalApprove={(hash, message) => portalApproveProposal(hash, message)}
              onPortalRequestRevision={(hash, feedback) => portalRequestRevision(hash, feedback)}
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
