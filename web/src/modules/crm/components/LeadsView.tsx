import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { list, t } from '../i18n';
import { LEADS_LIST_ALL_COLUMNS, LEADS_LIST_DEFAULT_COLUMNS, type LeadListColumnKey } from '../list-column-defaults';
import { LEAD_CONVERT_EVENT_NAME, type LeadConvertTelemetryDetail } from '../telemetry';
import type { Lead, Locale } from '../types';
import { loadViewPrefs, saveViewPrefs } from '../view-prefs';

interface LeadForm {
  status: string;
  firstName: string;
  paternalLastName: string;
  email: string;
  phone: string;
  destination: string;
  travelStartDate: string;
  adultsCount: number;
  childrenCount: number;
  estimatedBudgetMin: string;
  estimatedBudgetMax: string;
  urgencyTimeframe: string;
  tripOccasion: string;
  campaignId: string;
  referralName: string;
  assignedAgentName: string;
  lastContactDate: string;
  probabilityOfSale: number;
  leadTemperature: string;
  dateFlexibility: string;
  preferredContactMethod: string;
  serviceTypes: string[];
  preferences: string;
  additionalComments: string;
  source: string;
  priority: string;
}

interface ConvertForm {
  firstName: string;
  paternalLastName: string;
  email: string;
  phone: string;
}

interface LeadsViewProps {
  locale: Locale;
  leads: Lead[];
  leadForm: LeadForm;
  convertForm: ConvertForm;
  selectedLeadId: string | null;
  pendingDeleteLeadId: string | null;
  deleteLeadError: { id: string; message: string } | null;
  lastClientId: string;
  leadResult: string;
  convertResult: string;
  onLeadFormChange: (next: LeadForm | ((previous: LeadForm) => LeadForm)) => void;
  onConvertFormChange: (next: ConvertForm | ((previous: ConvertForm) => ConvertForm)) => void;
  onSelectLead: (leadId: string) => void;
  onStartEditLead: (leadId: string) => void;
  onStartCreateLead: () => void;
  onCancelEditLead: () => void;
  onSaveLead: () => Promise<'created' | 'updated' | null>;
  onRequestDeleteLead: (leadId: string) => void;
  onCancelDeleteLead: () => void;
  onDeleteLead: (leadId: string) => void;
  onForceDeleteLead: (leadId: string) => void;
  onConvertLead: (signal?: AbortSignal) => Promise<string | null>;
  onRefreshLeads: () => void;
  onOpenClientsList: () => void;
  onOpenConvertedClient: (clientId?: string) => void;
}

export function LeadsView({
  locale,
  leads,
  leadForm,
  convertForm,
  selectedLeadId,
  pendingDeleteLeadId,
  deleteLeadError,
  lastClientId,
  leadResult,
  convertResult,
  onLeadFormChange,
  onConvertFormChange,
  onSelectLead,
  onStartEditLead,
  onStartCreateLead,
  onCancelEditLead,
  onSaveLead,
  onRequestDeleteLead,
  onCancelDeleteLead,
  onDeleteLead,
  onForceDeleteLead,
  onConvertLead,
  onRefreshLeads,
  onOpenClientsList,
  onOpenConvertedClient,
}: LeadsViewProps) {
  type TelemetryPhaseFilter = LeadConvertTelemetryDetail['phase'] | 'all';
  type TelemetryOutcomeFilter = 'all' | 'success' | 'error';
  type LeadSortKey = 'lastContactDate' | 'probabilityOfSale' | 'leadTemperature';
  type LeadSort = { key: LeadSortKey; direction: 'asc' | 'desc' };
  type LeadListScope = 'open' | 'converted' | 'lost' | 'junk' | 'all';
  type QuickFilters = { hot: boolean; urgent: boolean; stale: boolean; highProbability: boolean };
  type LeadDetailTab = 'qualification' | 'attribution' | 'internal' | 'travel';
  type TodayQueuePreset = 'followUpToday' | 'hotUrgent' | 'readyToClose' | null;
  type LeadColumnGroupKey = 'identity' | 'contact' | 'qualification' | 'travel' | 'ownership' | 'financial';
  type ExportColumnKey =
    | 'id'
    | 'firstName'
    | 'paternalLastName'
    | 'email'
    | 'phone'
    | 'destination'
    | 'status'
    | 'priority'
    | 'leadTemperature'
    | 'probabilityOfSale'
    | 'lastContactDate'
    | 'assignedAgentName'
    | 'source'
    | 'urgencyTimeframe'
    | 'travelStartDate'
    | 'budgetMin'
    | 'budgetMax';

  const LEADS_VIEW_PREFS_KEY = 'misviajescrm.web.leads.viewprefs';
  const defaultLeadSort: LeadSort = { key: 'lastContactDate', direction: 'desc' };
  const allExportColumns: ExportColumnKey[] = [
    'id',
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
  ];
  const defaultExportColumns: ExportColumnKey[] = [...allExportColumns];
  const allLeadListColumns: LeadListColumnKey[] = [...LEADS_LIST_ALL_COLUMNS];
  const defaultLeadListColumns: LeadListColumnKey[] = [...LEADS_LIST_DEFAULT_COLUMNS];
  const leadColumnGroupKeys: LeadColumnGroupKey[] = ['identity', 'contact', 'qualification', 'travel', 'ownership', 'financial'];
  type LeadsViewPrefs = {
    searchTerm?: string;
    leadListScope?: LeadListScope;
    leadSort?: LeadSort;
    quickFilters?: Partial<QuickFilters>;
    activeTab?: LeadDetailTab;
    todayQueuePreset?: TodayQueuePreset;
    exportColumns?: ExportColumnKey[];
    leadListColumns?: LeadListColumnKey[];
    leadColumnGroupsExpanded?: Partial<Record<LeadColumnGroupKey, boolean>>;
  };

  function humanizeRawValue(value: string): string {
    return value
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  function leadOptionLabel(labelPath: string, option: string): string {
    const key = `${labelPath}.${option}`;
    const translated = t(locale, key);
    return translated === key ? humanizeRawValue(option) : translated;
  }

  function restoreLeadSort(): LeadSort {
    const prefs = loadViewPrefs<LeadsViewPrefs>(LEADS_VIEW_PREFS_KEY);
    const next = prefs?.leadSort;
    if (!next) return defaultLeadSort;
    if (!['lastContactDate', 'probabilityOfSale', 'leadTemperature'].includes(next.key)) return defaultLeadSort;
    if (!['asc', 'desc'].includes(next.direction)) return defaultLeadSort;
    return next;
  }

  function restoreSearchTerm(): string {
    const prefs = loadViewPrefs<LeadsViewPrefs>(LEADS_VIEW_PREFS_KEY);
    return typeof prefs?.searchTerm === 'string' ? prefs.searchTerm : '';
  }

  function restoreLeadListScope(): LeadListScope {
    const prefs = loadViewPrefs<LeadsViewPrefs>(LEADS_VIEW_PREFS_KEY);
    const next = prefs?.leadListScope;
    if (next === 'converted') return 'converted';
    if (next === 'lost') return 'lost';
    if (next === 'junk') return 'junk';
    if (next === 'all') return 'all';
    return 'open';
  }

  function restoreQuickFilters(): QuickFilters {
    const prefs = loadViewPrefs<LeadsViewPrefs>(LEADS_VIEW_PREFS_KEY);
    const next = prefs?.quickFilters ?? {};
    return {
      hot: Boolean(next.hot),
      urgent: Boolean(next.urgent),
      stale: Boolean(next.stale),
      highProbability: Boolean(next.highProbability),
    };
  }

  function restoreActiveTab(): LeadDetailTab {
    const prefs = loadViewPrefs<LeadsViewPrefs>(LEADS_VIEW_PREFS_KEY);
    const next = prefs?.activeTab;
    if (!next) return 'travel';
    if (!['travel', 'qualification', 'attribution', 'internal'].includes(next)) return 'travel';
    return next;
  }

  function restoreTodayQueuePreset(): TodayQueuePreset {
    const prefs = loadViewPrefs<LeadsViewPrefs>(LEADS_VIEW_PREFS_KEY);
    const next = prefs?.todayQueuePreset;
    if (!next) return null;
    if (!['followUpToday', 'hotUrgent', 'readyToClose'].includes(next)) return null;
    return next;
  }

  function restoreExportColumns(): ExportColumnKey[] {
    const prefs = loadViewPrefs<LeadsViewPrefs>(LEADS_VIEW_PREFS_KEY);
    const next = prefs?.exportColumns;
    if (!Array.isArray(next)) return defaultExportColumns;
    const allowedColumns = next.filter((column): column is ExportColumnKey => allExportColumns.includes(column));
    return allowedColumns.length > 0 ? allowedColumns : defaultExportColumns;
  }

  function restoreLeadListColumns(): LeadListColumnKey[] {
    const prefs = loadViewPrefs<LeadsViewPrefs>(LEADS_VIEW_PREFS_KEY);
    const next = prefs?.leadListColumns;
    if (!Array.isArray(next)) return defaultLeadListColumns;
    const allowedColumns = next.filter((column): column is LeadListColumnKey => allLeadListColumns.includes(column));
    return allowedColumns.length > 0 ? allowedColumns : defaultLeadListColumns;
  }

  function restoreLeadColumnGroupsExpanded(): Record<LeadColumnGroupKey, boolean> {
    const defaults = Object.fromEntries(leadColumnGroupKeys.map((group) => [group, false])) as Record<LeadColumnGroupKey, boolean>;
    const prefs = loadViewPrefs<LeadsViewPrefs>(LEADS_VIEW_PREFS_KEY);
    const next = prefs?.leadColumnGroupsExpanded;
    if (!next || typeof next !== 'object' || Array.isArray(next)) return defaults;

    const restored = { ...defaults };
    for (const group of leadColumnGroupKeys) {
      if (typeof next[group] === 'boolean') {
        restored[group] = next[group];
      }
    }
    return restored;
  }

  const [searchTerm, setSearchTerm] = useState(restoreSearchTerm);
  const [leadListScope, setLeadListScope] = useState<LeadListScope>(restoreLeadListScope);
  const [activePage, setActivePage] = useState<'list' | 'detail' | 'create'>('list');
  const [activeTab, setActiveTab] = useState<LeadDetailTab>(restoreActiveTab);
  const [todayQueuePreset, setTodayQueuePreset] = useState<TodayQueuePreset>(restoreTodayQueuePreset);
  const [leadSort, setLeadSort] = useState<LeadSort>(restoreLeadSort);
  const [quickFilters, setQuickFilters] = useState<QuickFilters>(restoreQuickFilters);
  const [exportColumns, setExportColumns] = useState<ExportColumnKey[]>(restoreExportColumns);
  const [leadListColumns, setLeadListColumns] = useState<LeadListColumnKey[]>(restoreLeadListColumns);
  const [leadColumnGroupsExpanded, setLeadColumnGroupsExpanded] = useState<Record<LeadColumnGroupKey, boolean>>(restoreLeadColumnGroupsExpanded);
  const [showLeadColumnsPanel, setShowLeadColumnsPanel] = useState(false);
  const [showLeadMoreFilters, setShowLeadMoreFilters] = useState(false);
  const [showLeadExportMenu, setShowLeadExportMenu] = useState(false);
  const [showLeadViewMenu, setShowLeadViewMenu] = useState(false);
  const [leadColumnsFilterTerm, setLeadColumnsFilterTerm] = useState('');
  const [draggedLeadColumnKey, setDraggedLeadColumnKey] = useState<LeadListColumnKey | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [convertTimeoutRecovered, setConvertTimeoutRecovered] = useState(false);
  const [leadSaveNotice, setLeadSaveNotice] = useState<string | null>(null);
  const [lastConvertTelemetry, setLastConvertTelemetry] = useState<LeadConvertTelemetryDetail | null>(null);
  const [convertTelemetryFeed, setConvertTelemetryFeed] = useState<LeadConvertTelemetryDetail[]>([]);
  const [telemetryPhaseFilter, setTelemetryPhaseFilter] = useState<TelemetryPhaseFilter>('all');
  const [telemetryOutcomeFilter, setTelemetryOutcomeFilter] = useState<TelemetryOutcomeFilter>('all');
  const [telemetryCopyStatus, setTelemetryCopyStatus] = useState<'idle' | 'copiedFeed' | 'copiedLatest' | 'downloadedFeed' | 'failed'>('idle');
  const [isTelemetryPaused, setIsTelemetryPaused] = useState(false);
  const leadsTableRef = useRef<HTMLTableElement | null>(null);
  const leadColumnsPanelRef = useRef<HTMLDivElement | null>(null);
  const leadColumnsToggleRef = useRef<HTMLButtonElement | null>(null);
  const leadMoreFiltersPanelRef = useRef<HTMLDivElement | null>(null);
  const leadMoreFiltersToggleRef = useRef<HTMLButtonElement | null>(null);
  const leadExportMenuRef = useRef<HTMLDivElement | null>(null);
  const leadExportToggleRef = useRef<HTMLButtonElement | null>(null);
  const leadViewMenuRef = useRef<HTMLDivElement | null>(null);
  const leadViewToggleRef = useRef<HTMLButtonElement | null>(null);
  const telemetryOutputRef = useRef<HTMLPreElement | null>(null);
  const selectedLead = selectedLeadId ? leads.find((lead) => lead.id === selectedLeadId) ?? null : null;

  useEffect(() => {
    saveViewPrefs(LEADS_VIEW_PREFS_KEY, { searchTerm, leadListScope, leadSort, quickFilters, activeTab, todayQueuePreset, exportColumns, leadListColumns, leadColumnGroupsExpanded });
  }, [searchTerm, leadListScope, leadSort, quickFilters, activeTab, todayQueuePreset, exportColumns, leadListColumns, leadColumnGroupsExpanded]);

  useEffect(() => {
    if (!import.meta.env.DEV || typeof window === 'undefined') return;

    const onLeadConvertTelemetry = (event: Event) => {
      if (isTelemetryPaused) return;
      const customEvent = event as CustomEvent<LeadConvertTelemetryDetail>;
      const detail = customEvent.detail;
      setLastConvertTelemetry(detail);
      setConvertTelemetryFeed((previous) => [detail, ...previous].slice(0, 25));
    };

    window.addEventListener(LEAD_CONVERT_EVENT_NAME, onLeadConvertTelemetry);
    return () => window.removeEventListener(LEAD_CONVERT_EVENT_NAME, onLeadConvertTelemetry);
  }, [isTelemetryPaused]);

  useEffect(() => {
    if (!leadSaveNotice) return;
    const timer = window.setTimeout(() => setLeadSaveNotice(null), 3500);
    return () => window.clearTimeout(timer);
  }, [leadSaveNotice]);

  useEffect(() => {
    if (!showLeadColumnsPanel || typeof window === 'undefined') return;

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedInsidePanel = Boolean(leadColumnsPanelRef.current?.contains(target));
      const clickedToggleButton = Boolean(leadColumnsToggleRef.current?.contains(target));
      if (clickedInsidePanel || clickedToggleButton) return;
      setShowLeadColumnsPanel(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setShowLeadColumnsPanel(false);
    };

    window.addEventListener('mousedown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [showLeadColumnsPanel]);

  useEffect(() => {
    if (!showLeadMoreFilters || typeof window === 'undefined') return;

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedInsidePanel = Boolean(leadMoreFiltersPanelRef.current?.contains(target));
      const clickedToggleButton = Boolean(leadMoreFiltersToggleRef.current?.contains(target));
      if (clickedInsidePanel || clickedToggleButton) return;
      setShowLeadMoreFilters(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setShowLeadMoreFilters(false);
    };

    window.addEventListener('mousedown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [showLeadMoreFilters]);

  useEffect(() => {
    if (!showLeadExportMenu || typeof window === 'undefined') return;

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedInsideMenu = Boolean(leadExportMenuRef.current?.contains(target));
      const clickedToggleButton = Boolean(leadExportToggleRef.current?.contains(target));
      if (clickedInsideMenu || clickedToggleButton) return;
      setShowLeadExportMenu(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setShowLeadExportMenu(false);
    };

    window.addEventListener('mousedown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [showLeadExportMenu]);

  useEffect(() => {
    if (!showLeadViewMenu || typeof window === 'undefined') return;

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedInsideMenu = Boolean(leadViewMenuRef.current?.contains(target));
      const clickedToggleButton = Boolean(leadViewToggleRef.current?.contains(target));
      if (clickedInsideMenu || clickedToggleButton) return;
      setShowLeadViewMenu(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setShowLeadViewMenu(false);
    };

    window.addEventListener('mousedown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [showLeadViewMenu]);

  const filteredConvertTelemetryFeed = useMemo(() => convertTelemetryFeed.filter((event) => {
    const matchesPhase = telemetryPhaseFilter === 'all' || event.phase === telemetryPhaseFilter;
    if (!matchesPhase) return false;

    if (telemetryOutcomeFilter === 'all') return true;
    if (telemetryOutcomeFilter === 'success') return event.phase === 'success';
    return event.phase === 'invalid' || event.phase === 'abort' || event.phase === 'fail';
  }), [convertTelemetryFeed, telemetryPhaseFilter, telemetryOutcomeFilter]);

  const convertTelemetryCounters = useMemo(() => {
    const counters = {
      total: convertTelemetryFeed.length,
      start: 0,
      success: 0,
      invalid: 0,
      abort: 0,
      fail: 0,
      error: 0,
    };

    for (const event of convertTelemetryFeed) {
      if (event.phase === 'start') counters.start += 1;
      if (event.phase === 'success') counters.success += 1;
      if (event.phase === 'invalid') counters.invalid += 1;
      if (event.phase === 'abort') counters.abort += 1;
      if (event.phase === 'fail') counters.fail += 1;
    }

    counters.error = counters.invalid + counters.abort + counters.fail;
    return counters;
  }, [convertTelemetryFeed]);

  const filteredConvertTelemetryCounters = useMemo(() => {
    const counters = { total: filteredConvertTelemetryFeed.length, success: 0, error: 0 };
    for (const event of filteredConvertTelemetryFeed) {
      if (event.phase === 'success') counters.success += 1;
      if (event.phase === 'invalid' || event.phase === 'abort' || event.phase === 'fail') counters.error += 1;
    }
    return counters;
  }, [filteredConvertTelemetryFeed]);

  useEffect(() => {
    setTelemetryCopyStatus('idle');
  }, [telemetryPhaseFilter, telemetryOutcomeFilter, filteredConvertTelemetryFeed.length]);

  function clearConvertTelemetryFeed() {
    setLastConvertTelemetry(null);
    setConvertTelemetryFeed([]);
    setTelemetryCopyStatus('idle');
    focusTelemetryOutput();
    scrollTelemetryOutputToTop();
  }

  function focusTelemetryOutput() {
    if (typeof window === 'undefined') return;
    window.requestAnimationFrame(() => telemetryOutputRef.current?.focus());
  }

  function scrollTelemetryOutputToTop() {
    if (typeof window === 'undefined') return;
    window.requestAnimationFrame(() => {
      if (!telemetryOutputRef.current) return;
      telemetryOutputRef.current.scrollTop = 0;
    });
  }

  function isErrorTelemetryPhase(phase: LeadConvertTelemetryDetail['phase']): boolean {
    return phase === 'invalid' || phase === 'abort' || phase === 'fail';
  }

  function clearErrorConvertTelemetryEvents() {
    setConvertTelemetryFeed((previous) => {
      const next = previous.filter((event) => !isErrorTelemetryPhase(event.phase));
      setLastConvertTelemetry(next[0] ?? null);
      setTelemetryCopyStatus('idle');
      return next;
    });
    focusTelemetryOutput();
    scrollTelemetryOutputToTop();
  }

  function retainOnlyErrorConvertTelemetryEvents() {
    setConvertTelemetryFeed((previous) => {
      const next = previous.filter((event) => isErrorTelemetryPhase(event.phase));
      setLastConvertTelemetry(next[0] ?? null);
      setTelemetryCopyStatus('idle');
      return next;
    });
    focusTelemetryOutput();
    scrollTelemetryOutputToTop();
  }

  function resetTelemetryFilters() {
    setTelemetryPhaseFilter('all');
    setTelemetryOutcomeFilter('all');
    focusTelemetryOutput();
    scrollTelemetryOutputToTop();
  }

  async function copyFilteredTelemetryJson() {
    if (filteredConvertTelemetryFeed.length === 0 || typeof navigator === 'undefined' || !navigator.clipboard) {
      setTelemetryCopyStatus('failed');
      return;
    }

    try {
      await navigator.clipboard.writeText(JSON.stringify(filteredConvertTelemetryFeed, null, 2));
      setTelemetryCopyStatus('copiedFeed');
    } catch {
      setTelemetryCopyStatus('failed');
    }
  }

  async function copyLatestTelemetryJson() {
    if (!lastConvertTelemetry || typeof navigator === 'undefined' || !navigator.clipboard) {
      setTelemetryCopyStatus('failed');
      return;
    }

    try {
      await navigator.clipboard.writeText(JSON.stringify(lastConvertTelemetry, null, 2));
      setTelemetryCopyStatus('copiedLatest');
    } catch {
      setTelemetryCopyStatus('failed');
    }
  }

  function downloadFilteredTelemetryJson() {
    if (filteredConvertTelemetryFeed.length === 0 || typeof document === 'undefined') {
      setTelemetryCopyStatus('failed');
      return;
    }

    try {
      const exportedAtIso = new Date().toISOString().replace(/[:.]/g, '-');
      const blob = new Blob([JSON.stringify(filteredConvertTelemetryFeed, null, 2)], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `lead-convert-telemetry-${exportedAtIso}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setTelemetryCopyStatus('downloadedFeed');
    } catch {
      setTelemetryCopyStatus('failed');
    }
  }

  function isLeadStale(lead: Lead): boolean {
    if (!lead.lastContactDate) return true;
    const lastContact = new Date(lead.lastContactDate);
    if (Number.isNaN(lastContact.getTime())) return true;
    const now = new Date();
    const elapsedMs = now.getTime() - lastContact.getTime();
    const elapsedDays = elapsedMs / (1000 * 60 * 60 * 24);
    return elapsedDays > 7;
  }

  function isArchivedLead(lead: Lead): boolean {
    return lead.status === 'closed_won' || lead.status === 'closed_lost' || lead.status === 'junk';
  }

  function toggleQuickFilter(key: keyof typeof quickFilters) {
    setTodayQueuePreset(null);
    setQuickFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function clearQuickFilters() {
    setTodayQueuePreset(null);
    setQuickFilters({ hot: false, urgent: false, stale: false, highProbability: false });
  }

  function resetLeadListView() {
    setSearchTerm('');
    setLeadListScope('open');
    setTodayQueuePreset(null);
    setQuickFilters({ hot: false, urgent: false, stale: false, highProbability: false });
    setLeadSort({ key: 'lastContactDate', direction: 'desc' });
  }

  function clearTodayQueuePreset() {
    setTodayQueuePreset(null);
  }

  function clearLeadSearchTerm() {
    setSearchTerm('');
  }

  function focusFirstLeadRowAction() {
    const firstActionButton = leadsTableRef.current?.querySelector('tbody tr button') as HTMLButtonElement | null;
    firstActionButton?.focus();
  }

  function applyTodayQueuePreset(preset: Exclude<TodayQueuePreset, null>) {
    setTodayQueuePreset(preset);

    if (preset === 'followUpToday') {
      setQuickFilters({ hot: false, urgent: false, stale: true, highProbability: false });
      return;
    }

    if (preset === 'hotUrgent') {
      setQuickFilters({ hot: true, urgent: true, stale: false, highProbability: false });
      return;
    }

    setQuickFilters({ hot: true, urgent: false, stale: false, highProbability: true });
  }

  function temperatureRank(temperature: string | undefined): number {
    if (temperature === 'hot') return 3;
    if (temperature === 'warm') return 2;
    if (temperature === 'cold') return 1;
    return 0;
  }

  function toggleLeadSort(key: LeadSortKey) {
    setLeadSort((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }

      return { key, direction: 'desc' };
    });
  }

  const filteredLeads = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return leads.filter((lead) => {
      const archivedLead = isArchivedLead(lead);
      if (leadListScope === 'open' && archivedLead) return false;
      if (leadListScope === 'converted' && lead.status !== 'closed_won') return false;
      if (leadListScope === 'lost' && lead.status !== 'closed_lost') return false;
      if (leadListScope === 'junk' && lead.status !== 'junk') return false;

      const matchesSearch = !term
        || lead.id.toLowerCase().includes(term)
        || (lead.firstName ?? '').toLowerCase().includes(term)
        || (lead.paternalLastName ?? '').toLowerCase().includes(term)
        || (lead.email ?? '').toLowerCase().includes(term)
        || (lead.phone ?? '').toLowerCase().includes(term)
        || (lead.assignedAgentName ?? '').toLowerCase().includes(term)
        || lead.destination.toLowerCase().includes(term)
        || lead.status.toLowerCase().includes(term)
        || lead.priority.toLowerCase().includes(term);

      if (!matchesSearch) return false;
      if (quickFilters.hot && lead.leadTemperature !== 'hot') return false;
      if (quickFilters.urgent && !(lead.urgencyTimeframe === 'within_48h' || lead.urgencyTimeframe === 'this_week')) return false;
      if (quickFilters.stale && !isLeadStale(lead)) return false;
      if (quickFilters.highProbability && (lead.probabilityOfSale ?? 0) < 70) return false;

      return true;
    });
  }, [leads, searchTerm, quickFilters, leadListScope]);

  const sortedLeads = useMemo(() => {
    const sorted = [...filteredLeads].sort((left, right) => {
      if (leadSort.key === 'lastContactDate') {
        const leftValue = left.lastContactDate ? new Date(left.lastContactDate).getTime() : 0;
        const rightValue = right.lastContactDate ? new Date(right.lastContactDate).getTime() : 0;
        return leftValue - rightValue;
      }

      if (leadSort.key === 'probabilityOfSale') {
        return (left.probabilityOfSale ?? 0) - (right.probabilityOfSale ?? 0);
      }

      return temperatureRank(left.leadTemperature) - temperatureRank(right.leadTemperature);
    });

    if (leadSort.direction === 'desc') sorted.reverse();
    return sorted;
  }, [filteredLeads, leadSort]);

  const todayQueueCounts = useMemo(() => {
    const followUpToday = leads.filter((lead) => isLeadStale(lead)).length;
    const hotUrgent = leads.filter((lead) => lead.leadTemperature === 'hot' && (lead.urgencyTimeframe === 'within_48h' || lead.urgencyTimeframe === 'this_week')).length;
    const readyToClose = leads.filter((lead) => lead.leadTemperature === 'hot' && (lead.probabilityOfSale ?? 0) >= 70).length;

    return { followUpToday, hotUrgent, readyToClose };
  }, [leads]);

  const leadScopeCounts = useMemo(() => {
    const converted = leads.filter((lead) => lead.status === 'closed_won').length;
    const lost = leads.filter((lead) => lead.status === 'closed_lost').length;
    const junk = leads.filter((lead) => lead.status === 'junk').length;
    const all = leads.length;
    const open = all - converted - lost - junk;
    return { open, converted, lost, junk, all };
  }, [leads]);

  function sortIndicator(key: LeadSortKey): string {
    if (leadSort.key !== key) return '↕';
    return leadSort.direction === 'asc' ? '↑' : '↓';
  }

  const exportColumnsConfig = [
    { key: 'id' as const, label: t(locale, 'common.tableId'), value: (lead: Lead) => lead.id },
    { key: 'firstName' as const, label: t(locale, 'leads.firstName'), value: (lead: Lead) => lead.firstName ?? '' },
    { key: 'paternalLastName' as const, label: t(locale, 'leads.paternalLastName'), value: (lead: Lead) => lead.paternalLastName ?? '' },
    { key: 'email' as const, label: t(locale, 'leads.email'), value: (lead: Lead) => lead.email ?? '' },
    { key: 'phone' as const, label: t(locale, 'leads.phone'), value: (lead: Lead) => lead.phone ?? '' },
    { key: 'destination' as const, label: t(locale, 'leads.tableDestination'), value: (lead: Lead) => lead.destination },
    { key: 'status' as const, label: t(locale, 'leads.tableStatus'), value: (lead: Lead) => leadOptionLabel('labels.leadStatus', lead.status) },
    { key: 'priority' as const, label: t(locale, 'leads.tablePriority'), value: (lead: Lead) => leadOptionLabel('labels.priority', lead.priority) },
    { key: 'leadTemperature' as const, label: t(locale, 'leads.tableTemperature'), value: (lead: Lead) => lead.leadTemperature ? leadOptionLabel('labels.leadTemperature', lead.leadTemperature) : '' },
    { key: 'probabilityOfSale' as const, label: t(locale, 'leads.tableProbability'), value: (lead: Lead) => lead.probabilityOfSale ?? '' },
    { key: 'lastContactDate' as const, label: t(locale, 'leads.tableLastContact'), value: (lead: Lead) => lead.lastContactDate ?? '' },
    { key: 'assignedAgentName' as const, label: t(locale, 'leads.assignedAgent'), value: (lead: Lead) => lead.assignedAgentName ?? '' },
    { key: 'source' as const, label: t(locale, 'leads.source'), value: (lead: Lead) => leadOptionLabel('labels.source', lead.source) },
    { key: 'urgencyTimeframe' as const, label: t(locale, 'leads.urgencyTimeframe'), value: (lead: Lead) => lead.urgencyTimeframe ? leadOptionLabel('labels.leadUrgencyTimeframe', lead.urgencyTimeframe) : '' },
    { key: 'travelStartDate' as const, label: t(locale, 'leads.travelDate'), value: (lead: Lead) => lead.travelStartDate ?? '' },
    { key: 'budgetMin' as const, label: t(locale, 'leads.estimatedBudgetMin'), value: (lead: Lead) => lead.budgetMin ?? '' },
    { key: 'budgetMax' as const, label: t(locale, 'leads.estimatedBudgetMax'), value: (lead: Lead) => lead.budgetMax ?? '' },
  ];

  const visibleExportColumns = leadListColumns
    .map((key) => exportColumnsConfig.find((column) => column.key === key))
    .filter((column): column is (typeof exportColumnsConfig)[number] => Boolean(column));
  const canExportVisibleCsv = sortedLeads.length > 0 && visibleExportColumns.length > 0;
  const canExportAllCsv = sortedLeads.length > 0;

  function toggleExportColumn(columnKey: ExportColumnKey) {
    setExportColumns((previous) => (
      previous.includes(columnKey)
        ? previous.filter((key) => key !== columnKey)
        : [...previous, columnKey]
    ));
  }

  function toggleLeadListColumn(columnKey: LeadListColumnKey) {
    setLeadListColumns((previous) => {
      const isSelected = previous.includes(columnKey);
      if (isSelected) {
        if (previous.length <= 1) return previous;
        return previous.filter((key) => key !== columnKey);
      }
      return [columnKey, ...previous];
    });
  }

  function reorderLeadListColumn(fromColumnKey: LeadListColumnKey, toColumnKey: LeadListColumnKey) {
    setLeadListColumns((previous) => {
      const fromIndex = previous.indexOf(fromColumnKey);
      const toIndex = previous.indexOf(toColumnKey);
      if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return previous;
      const next = [...previous];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }

  function moveLeadListColumn(columnKey: LeadListColumnKey, direction: 'up' | 'down') {
    const currentIndex = leadListColumns.indexOf(columnKey);
    if (currentIndex === -1) return;
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= leadListColumns.length) return;
    const targetColumnKey = leadListColumns[targetIndex];
    reorderLeadListColumn(columnKey, targetColumnKey);
  }

  function setAllLeadColumnGroupsExpanded(expanded: boolean) {
    setLeadColumnGroupsExpanded((previous) => {
      const next = { ...previous };
      for (const group of leadColumnGroupKeys) {
        next[group] = expanded;
      }
      return next;
    });
  }

  function setLeadColumnGroupExpanded(group: LeadColumnGroupKey, expanded: boolean) {
    setLeadColumnGroupsExpanded((previous) => ({ ...previous, [group]: expanded }));
  }

  function csvEscape(value: unknown): string {
    const maxCsvCellLength = 2000;
    const rawText = value == null ? '' : String(value);
    const normalizedText = rawText
      .replace(/\r\n|\r|\n/g, ' | ')
      .replace(/\t/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
    const cappedText = normalizedText.length > maxCsvCellLength
      ? `${normalizedText.slice(0, maxCsvCellLength - 1)}…`
      : normalizedText;
    const sanitizedForSpreadsheet = /^[=+\-@]/.test(cappedText.trimStart())
      ? `'${cappedText}`
      : cappedText;
    return `"${sanitizedForSpreadsheet.replace(/"/g, '""')}"`;
  }

  function exportLeadsToCsv(scope: 'visible' | 'all') {
    const scopedColumns = scope === 'all' ? exportColumnsConfig : visibleExportColumns;
    if (sortedLeads.length === 0 || scopedColumns.length === 0) return;

    const exportedAt = new Date();
    const exportedAtIso = exportedAt.toISOString();
    const timezoneOffsetMinutes = -exportedAt.getTimezoneOffset();
    const timezoneOffsetSign = timezoneOffsetMinutes >= 0 ? '+' : '-';
    const timezoneOffsetHours = String(Math.floor(Math.abs(timezoneOffsetMinutes) / 60)).padStart(2, '0');
    const timezoneOffsetRemainderMinutes = String(Math.abs(timezoneOffsetMinutes) % 60).padStart(2, '0');
    const timezoneOffsetLabel = `GMT${timezoneOffsetSign}${timezoneOffsetHours}:${timezoneOffsetRemainderMinutes}`;
    const exportedAtLocal = `${new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'medium' }).format(exportedAt)} (${timezoneOffsetLabel})`;

    const sortLabelPath =
      leadSort.key === 'leadTemperature'
        ? 'leads.tableTemperature'
        : leadSort.key === 'probabilityOfSale'
          ? 'leads.tableProbability'
          : 'leads.tableLastContact';
    const sortDirectionLabel = leadSort.direction === 'asc'
      ? t(locale, 'leads.exportSortAsc')
      : t(locale, 'leads.exportSortDesc');
    const queueLabel = todayQueuePreset
      ? t(locale, `leads.todayQueue.${todayQueuePreset}`)
      : t(locale, 'leads.exportMetaNone');
    const activeFilterLabels = [
      quickFilters.hot ? t(locale, 'leads.quickFilters.hot') : null,
      quickFilters.urgent ? t(locale, 'leads.quickFilters.urgent') : null,
      quickFilters.stale ? t(locale, 'leads.quickFilters.stale') : null,
      quickFilters.highProbability ? t(locale, 'leads.quickFilters.highProbability') : null,
    ].filter((item): item is string => Boolean(item));
    const filtersLabel = activeFilterLabels.length > 0
      ? activeFilterLabels.join(' | ')
      : t(locale, 'leads.exportMetaNone');
    const searchLabel = searchTerm.trim() || t(locale, 'leads.exportMetaNone');

    const rows = sortedLeads.map((lead) => scopedColumns.map((column) => column.value(lead)));

    const header = scopedColumns.map((column) => column.label);
    const metaRows: Array<Array<unknown>> = [
      [t(locale, 'leads.exportMetaExportedAt'), exportedAtLocal],
      [t(locale, 'leads.exportMetaExportedAtIso'), exportedAtIso],
      [t(locale, 'leads.exportMetaScope'), `${sortedLeads.length}/${leads.length}`],
      [t(locale, 'leads.activeSummary.queue'), queueLabel],
      [t(locale, 'leads.exportMetaFilters'), filtersLabel],
      [t(locale, 'leads.activeSummary.search'), searchLabel],
      [t(locale, 'leads.activeSummary.sort'), `${t(locale, sortLabelPath)} (${sortDirectionLabel})`],
    ];

    const csvContent = [...metaRows, [], header, ...rows].map((row) => row.map((cell) => csvEscape(cell)).join(',')).join('\n');
    const utf8Bom = '\uFEFF';
    const blob = new Blob([utf8Bom, csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const exportDateStamp = exportedAtIso.slice(0, 10);
    const exportTimeStamp = exportedAtIso.slice(11, 19).replace(/:/g, '-');
    const localeStamp = locale.replace(/[^a-zA-Z0-9-]/g, '-');
    const scopeStamp = `${sortedLeads.length}-of-${leads.length}`;
    const columnStamp = scope === 'all' ? 'all-columns' : 'visible-columns';
    link.href = url;
    link.download = `${t(locale, 'leads.exportFilenamePrefix')}-${localeStamp}-${exportDateStamp}_${exportTimeStamp}-${scopeStamp}-${columnStamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  const activeSummaryChips = useMemo(() => {
    const chips: Array<{ id: string; label: string; onClick: () => void }> = [];

    if (leadListScope !== 'open') {
      const scopeLabel =
        leadListScope === 'converted'
          ? t(locale, 'leads.scopeConverted')
          : leadListScope === 'lost'
            ? t(locale, 'leads.scopeLost')
            : leadListScope === 'junk'
              ? t(locale, 'leads.scopeJunk')
              : t(locale, 'leads.scopeAll');
      chips.push({
        id: 'scope',
        label: `${t(locale, 'leads.activeSummary.scope')}: ${scopeLabel}`,
        onClick: () => setLeadListScope('open'),
      });
    }

    if (todayQueuePreset) {
      const queuePath = `leads.todayQueue.${todayQueuePreset}`;
      chips.push({
        id: 'queue',
        label: `${t(locale, 'leads.activeSummary.queue')}: ${t(locale, queuePath)}`,
        onClick: () => setTodayQueuePreset(null),
      });
    }
    if (quickFilters.hot) {
      chips.push({ id: 'hot', label: t(locale, 'leads.quickFilters.hot'), onClick: () => toggleQuickFilter('hot') });
    }
    if (quickFilters.urgent) {
      chips.push({ id: 'urgent', label: t(locale, 'leads.quickFilters.urgent'), onClick: () => toggleQuickFilter('urgent') });
    }
    if (quickFilters.stale) {
      chips.push({ id: 'stale', label: t(locale, 'leads.quickFilters.stale'), onClick: () => toggleQuickFilter('stale') });
    }
    if (quickFilters.highProbability) {
      chips.push({ id: 'highProbability', label: t(locale, 'leads.quickFilters.highProbability'), onClick: () => toggleQuickFilter('highProbability') });
    }

    const term = searchTerm.trim();
    if (term) {
      chips.push({
        id: 'search',
        label: `${t(locale, 'leads.activeSummary.search')}: ${term}`,
        onClick: () => setSearchTerm(''),
      });
    }

    const isDefaultSort = leadSort.key === 'lastContactDate' && leadSort.direction === 'desc';
    if (!isDefaultSort) {
      const sortLabelPath =
        leadSort.key === 'leadTemperature'
          ? 'leads.tableTemperature'
          : leadSort.key === 'probabilityOfSale'
            ? 'leads.tableProbability'
            : 'leads.tableLastContact';
      chips.push({
        id: 'sort',
        label: `${t(locale, 'leads.activeSummary.sort')}: ${t(locale, sortLabelPath)} ${sortIndicator(leadSort.key)}`,
        onClick: () => setLeadSort({ key: 'lastContactDate', direction: 'desc' }),
      });
    }

    return chips;
  }, [todayQueuePreset, quickFilters, searchTerm, leadSort, locale, leadListScope]);

  const leadScopeLabel = useMemo(() => {
    if (leadListScope === 'converted') return t(locale, 'leads.scopeConverted');
    if (leadListScope === 'lost') return t(locale, 'leads.scopeLost');
    if (leadListScope === 'junk') return t(locale, 'leads.scopeJunk');
    if (leadListScope === 'all') return t(locale, 'leads.scopeAll');
    return t(locale, 'leads.scopeOpen');
  }, [leadListScope, locale]);

  const leadListColumnsConfig = [
    { key: 'id' as const, group: 'identity' as const, label: t(locale, 'common.tableId'), header: () => <>{t(locale, 'common.tableId')}</>, cell: (lead: Lead) => <td title={lead.id}>{lead.id.slice(0, 8)}</td> },
    { key: 'name' as const, group: 'identity' as const, label: t(locale, 'clients.tableName'), header: () => <>{t(locale, 'clients.tableName')}</>, cell: (lead: Lead) => <td>{`${lead.firstName ?? ''} ${lead.paternalLastName ?? ''}`.trim() || '—'}</td> },
    { key: 'firstName' as const, group: 'identity' as const, label: t(locale, 'leads.firstName'), header: () => <>{t(locale, 'leads.firstName')}</>, cell: (lead: Lead) => <td>{lead.firstName || '—'}</td> },
    { key: 'paternalLastName' as const, group: 'identity' as const, label: t(locale, 'leads.paternalLastName'), header: () => <>{t(locale, 'leads.paternalLastName')}</>, cell: (lead: Lead) => <td>{lead.paternalLastName || '—'}</td> },
    { key: 'email' as const, group: 'contact' as const, label: t(locale, 'leads.email'), header: () => <>{t(locale, 'leads.email')}</>, cell: (lead: Lead) => <td>{lead.email || '—'}</td> },
    { key: 'phone' as const, group: 'contact' as const, label: t(locale, 'leads.phone'), header: () => <>{t(locale, 'leads.phone')}</>, cell: (lead: Lead) => <td>{lead.phone || '—'}</td> },
    { key: 'destination' as const, group: 'travel' as const, label: t(locale, 'leads.tableDestination'), header: () => <>{t(locale, 'leads.tableDestination')}</>, cell: (lead: Lead) => <td>{lead.destination}</td> },
    { key: 'status' as const, group: 'qualification' as const, label: t(locale, 'leads.tableStatus'), header: () => <>{t(locale, 'leads.tableStatus')}</>, cell: (lead: Lead) => <td><span className="pill">{leadOptionLabel('labels.leadStatus', lead.status)}</span></td> },
    { key: 'priority' as const, group: 'qualification' as const, label: t(locale, 'leads.tablePriority'), header: () => <>{t(locale, 'leads.tablePriority')}</>, cell: (lead: Lead) => <td>{leadOptionLabel('labels.priority', lead.priority)}</td> },
    {
      key: 'leadTemperature' as const,
      group: 'qualification' as const,
      label: t(locale, 'leads.tableTemperature'),
      header: () => (
        <button type="button" className="table-sort-btn" onClick={() => toggleLeadSort('leadTemperature')}>
          {t(locale, 'leads.tableTemperature')} {sortIndicator('leadTemperature')}
        </button>
      ),
      cell: (lead: Lead) => <td>{lead.leadTemperature ? leadOptionLabel('labels.leadTemperature', lead.leadTemperature) : '—'}</td>
    },
    {
      key: 'probabilityOfSale' as const,
      group: 'qualification' as const,
      label: t(locale, 'leads.tableProbability'),
      header: () => (
        <button type="button" className="table-sort-btn" onClick={() => toggleLeadSort('probabilityOfSale')}>
          {t(locale, 'leads.tableProbability')} {sortIndicator('probabilityOfSale')}
        </button>
      ),
      cell: (lead: Lead) => <td>{typeof lead.probabilityOfSale === 'number' ? `${lead.probabilityOfSale}%` : '—'}</td>
    },
    {
      key: 'lastContactDate' as const,
      group: 'ownership' as const,
      label: t(locale, 'leads.tableLastContact'),
      header: () => (
        <button type="button" className="table-sort-btn" onClick={() => toggleLeadSort('lastContactDate')}>
          {t(locale, 'leads.tableLastContact')} {sortIndicator('lastContactDate')}
        </button>
      ),
      cell: (lead: Lead) => <td>{lead.lastContactDate || '—'}</td>
    },
    { key: 'assignedAgentName' as const, group: 'ownership' as const, label: t(locale, 'leads.assignedAgent'), header: () => <>{t(locale, 'leads.assignedAgent')}</>, cell: (lead: Lead) => <td>{lead.assignedAgentName || '—'}</td> },
    { key: 'source' as const, group: 'ownership' as const, label: t(locale, 'leads.source'), header: () => <>{t(locale, 'leads.source')}</>, cell: (lead: Lead) => <td>{lead.source ? leadOptionLabel('labels.source', lead.source) : '—'}</td> },
    { key: 'urgencyTimeframe' as const, group: 'qualification' as const, label: t(locale, 'leads.urgencyTimeframe'), header: () => <>{t(locale, 'leads.urgencyTimeframe')}</>, cell: (lead: Lead) => <td>{lead.urgencyTimeframe ? leadOptionLabel('labels.leadUrgencyTimeframe', lead.urgencyTimeframe) : '—'}</td> },
    { key: 'travelStartDate' as const, group: 'travel' as const, label: t(locale, 'leads.travelDate'), header: () => <>{t(locale, 'leads.travelDate')}</>, cell: (lead: Lead) => <td>{lead.travelStartDate || '—'}</td> },
    { key: 'budgetMin' as const, group: 'financial' as const, label: t(locale, 'leads.estimatedBudgetMin'), header: () => <>{t(locale, 'leads.estimatedBudgetMin')}</>, cell: (lead: Lead) => <td>{lead.budgetMin ?? '—'}</td> },
    { key: 'budgetMax' as const, group: 'financial' as const, label: t(locale, 'leads.estimatedBudgetMax'), header: () => <>{t(locale, 'leads.estimatedBudgetMax')}</>, cell: (lead: Lead) => <td>{lead.budgetMax ?? '—'}</td> },
  ];

  const selectedLeadListColumns = leadListColumns
    .map((key) => leadListColumnsConfig.find((column) => column.key === key))
    .filter((column): column is (typeof leadListColumnsConfig)[number] => Boolean(column));

  const filteredLeadListColumnsConfig = leadListColumnsConfig.filter((column) => {
    const term = leadColumnsFilterTerm.trim().toLowerCase();
    if (!term) return true;
    return column.label.toLowerCase().includes(term);
  });

  const leadColumnGroupOrder = leadColumnGroupKeys;
  const leadColumnGroupLabels: Record<(typeof leadColumnGroupOrder)[number], string> = {
    identity: t(locale, 'common.columnGroups.identity'),
    contact: t(locale, 'common.columnGroups.contact'),
    qualification: t(locale, 'common.columnGroups.qualification'),
    travel: t(locale, 'common.columnGroups.travel'),
    ownership: t(locale, 'common.columnGroups.ownership'),
    financial: t(locale, 'common.columnGroups.financial'),
  };

  const groupedFilteredLeadColumns = leadColumnGroupOrder
    .map((group) => ({
      group,
      columns: filteredLeadListColumnsConfig.filter((column) => column.group === group)
    }))
    .filter((entry) => entry.columns.length > 0);

  const selectedLeadOverlayColumns = leadListColumns
    .map((key) => leadListColumnsConfig.find((column) => column.key === key))
    .filter((column): column is (typeof leadListColumnsConfig)[number] => Boolean(column));

  const canConvert = Boolean(selectedLeadId)
    && convertForm.firstName.trim().length > 0
    && convertForm.paternalLastName.trim().length > 0
    && convertForm.email.trim().length > 0
    && !isConverting;

  async function handleConvertLeadClick() {
    if (isConverting) return;
    setIsConverting(true);
    setConvertTimeoutRecovered(false);
    const controller = new AbortController();
    const timeoutHandle = window.setTimeout(() => {
      setConvertTimeoutRecovered(true);
      controller.abort();
    }, 15000);

    try {
      const convertedClientId = await onConvertLead(controller.signal);
      if (!convertedClientId) return;
      onOpenConvertedClient(convertedClientId);
    } finally {
      window.clearTimeout(timeoutHandle);
      setIsConverting(false);
    }
  }

  async function handleLeadSaveClick(mode: 'create' | 'detail') {
    const result = await onSaveLead();
    if (!result) return;

    if (result === 'created') {
      setLeadSaveNotice(t(locale, 'status.leadSaved'));
      if (mode === 'create') {
        setActivePage('list');
      }
      return;
    }

    setLeadSaveNotice(t(locale, 'status.leadUpdated'));
  }

  const convertContactCount = useMemo(() => {
    let count = 0;
    if (convertForm.email.trim()) count += 1;
    if (convertForm.phone.trim()) count += 1;
    return count;
  }, [convertForm.email, convertForm.phone]);

  function applyLeadDataToConvertForm() {
    if (!selectedLead) return;
    onConvertFormChange((previous) => ({
      ...previous,
      firstName: selectedLead.firstName ?? previous.firstName,
      paternalLastName: selectedLead.paternalLastName ?? previous.paternalLastName,
      email: selectedLead.email ?? previous.email,
      phone: selectedLead.phone ?? previous.phone,
    }));
  }

  function openLeadDetail(lead: Lead) {
    onSelectLead(lead.id);
    onStartEditLead(lead.id);
    onConvertFormChange({
      firstName: lead.firstName ?? convertForm.firstName,
      paternalLastName: lead.paternalLastName ?? convertForm.paternalLastName,
      email: lead.email ?? convertForm.email,
      phone: lead.phone ?? convertForm.phone,
    });
    setActiveTab('travel');
    setActivePage('detail');
  }

  function renderLeadTabs() {
    const leadServiceTypes = list(locale, 'options.leadServiceTypes');

    return (
      <div className="profile-shell">
        <aside className="profile-tabs">
          <button type="button" className={`profile-tab-btn ${activeTab === 'travel' ? 'active' : ''}`} onClick={() => setActiveTab('travel')}>{t(locale, 'leads.tabs.travel')}</button>
          <button type="button" className={`profile-tab-btn ${activeTab === 'qualification' ? 'active' : ''}`} onClick={() => setActiveTab('qualification')}>{t(locale, 'leads.tabs.qualification')}</button>
          <button type="button" className={`profile-tab-btn ${activeTab === 'attribution' ? 'active' : ''}`} onClick={() => setActiveTab('attribution')}>{t(locale, 'leads.tabs.attribution')}</button>
          <button type="button" className={`profile-tab-btn ${activeTab === 'internal' ? 'active' : ''}`} onClick={() => setActiveTab('internal')}>{t(locale, 'leads.tabs.internal')}</button>
        </aside>
        <div>
          {activeTab === 'travel' ? (
            <div className="sub-card">
              <h3>{t(locale, 'leads.tabs.travel')}</h3>
              <div className="profile-grid-2">
                <div className="field"><label>{t(locale, 'leads.firstName')}</label><input value={leadForm.firstName} onChange={(event) => onLeadFormChange((prev) => ({ ...prev, firstName: event.target.value }))} /></div>
                <div className="field"><label>{t(locale, 'leads.paternalLastName')}</label><input value={leadForm.paternalLastName} onChange={(event) => onLeadFormChange((prev) => ({ ...prev, paternalLastName: event.target.value }))} /></div>
              </div>
              <div className="profile-grid-2">
                <div className="field"><label>{t(locale, 'leads.email')}</label><input value={leadForm.email} onChange={(event) => onLeadFormChange((prev) => ({ ...prev, email: event.target.value }))} /></div>
                <div className="field"><label>{t(locale, 'leads.phone')}</label><input value={leadForm.phone} onChange={(event) => onLeadFormChange((prev) => ({ ...prev, phone: event.target.value }))} /></div>
              </div>
              <div className="field"><label>{t(locale, 'leads.destination')}</label><input value={leadForm.destination} onChange={(event) => onLeadFormChange((prev) => ({ ...prev, destination: event.target.value }))} /></div>
              <div className="profile-grid-2">
                <div className="field"><label>{t(locale, 'leads.travelDate')}</label><input type="date" value={leadForm.travelStartDate} onChange={(event) => onLeadFormChange((prev) => ({ ...prev, travelStartDate: event.target.value }))} /></div>
                <div className="field"><label>{t(locale, 'leads.dateFlexibility')}</label><select value={leadForm.dateFlexibility} onChange={(event) => onLeadFormChange((prev) => ({ ...prev, dateFlexibility: event.target.value }))}>{list(locale, 'options.leadDateFlexibility').map((item) => <option key={item} value={item}>{leadOptionLabel('labels.leadDateFlexibility', item)}</option>)}</select></div>
              </div>
              <div className="profile-grid-2">
                <div className="field"><label>{t(locale, 'leads.adults')}</label><input type="number" min={0} value={leadForm.adultsCount} onChange={(event) => onLeadFormChange((prev) => ({ ...prev, adultsCount: Number(event.target.value) || 0 }))} /></div>
                <div className="field"><label>{t(locale, 'leads.children')}</label><input type="number" min={0} value={leadForm.childrenCount} onChange={(event) => onLeadFormChange((prev) => ({ ...prev, childrenCount: Number(event.target.value) || 0 }))} /></div>
              </div>
              <div className="field"><label>{t(locale, 'leads.preferredContactMethod')}</label><select value={leadForm.preferredContactMethod} onChange={(event) => onLeadFormChange((prev) => ({ ...prev, preferredContactMethod: event.target.value }))}>{list(locale, 'options.leadPreferredContactMethod').map((item) => <option key={item} value={item}>{leadOptionLabel('labels.leadPreferredContactMethod', item)}</option>)}</select></div>
              <div className="field">
                <label>{t(locale, 'leads.services')}</label>
                <div className="checkbox-grid">
                  {leadServiceTypes.map((serviceType) => {
                    const checked = leadForm.serviceTypes.includes(serviceType);
                    return (
                      <label key={serviceType}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => onLeadFormChange((prev) => ({
                            ...prev,
                            serviceTypes: checked
                              ? prev.serviceTypes.filter((item) => item !== serviceType)
                              : [...prev.serviceTypes, serviceType]
                          }))}
                        />
                        {serviceType}
                      </label>
                    );
                  })}
                </div>
              </div>
              <div className="field"><label>{t(locale, 'leads.preferences')}</label><input value={leadForm.preferences} onChange={(event) => onLeadFormChange((prev) => ({ ...prev, preferences: event.target.value }))} /></div>
              <div className="field"><label>{t(locale, 'leads.additionalComments')}</label><textarea value={leadForm.additionalComments} onChange={(event) => onLeadFormChange((prev) => ({ ...prev, additionalComments: event.target.value }))} /></div>
            </div>
          ) : null}

          {activeTab === 'qualification' ? (
            <div className="sub-card">
              <h3>{t(locale, 'leads.tabs.qualification')}</h3>
              <div className="profile-grid-2">
                <div className="field"><label>{t(locale, 'leads.status')}</label><select value={leadForm.status} onChange={(event) => onLeadFormChange((prev) => ({ ...prev, status: event.target.value }))}>{list(locale, 'options.leadStatus').map((item) => <option key={item} value={item}>{leadOptionLabel('labels.leadStatus', item)}</option>)}</select></div>
                <div className="field"><label>{t(locale, 'leads.priority')}</label><select value={leadForm.priority} onChange={(event) => onLeadFormChange((prev) => ({ ...prev, priority: event.target.value }))}>{list(locale, 'options.priority').map((priority) => <option key={priority} value={priority}>{leadOptionLabel('labels.priority', priority)}</option>)}</select></div>
              </div>
              <div className="profile-grid-2">
                <div className="field"><label>{t(locale, 'leads.estimatedBudgetMin')}</label><input type="number" min={0} value={leadForm.estimatedBudgetMin} onChange={(event) => onLeadFormChange((prev) => ({ ...prev, estimatedBudgetMin: event.target.value }))} /></div>
                <div className="field"><label>{t(locale, 'leads.estimatedBudgetMax')}</label><input type="number" min={0} value={leadForm.estimatedBudgetMax} onChange={(event) => onLeadFormChange((prev) => ({ ...prev, estimatedBudgetMax: event.target.value }))} /></div>
              </div>
              <div className="profile-grid-2">
                <div className="field"><label>{t(locale, 'leads.urgencyTimeframe')}</label><select value={leadForm.urgencyTimeframe} onChange={(event) => onLeadFormChange((prev) => ({ ...prev, urgencyTimeframe: event.target.value }))}>{list(locale, 'options.leadUrgencyTimeframe').map((item) => <option key={item} value={item}>{leadOptionLabel('labels.leadUrgencyTimeframe', item)}</option>)}</select></div>
                <div className="field"><label>{t(locale, 'leads.tripOccasion')}</label><input value={leadForm.tripOccasion} onChange={(event) => onLeadFormChange((prev) => ({ ...prev, tripOccasion: event.target.value }))} /></div>
              </div>
              <div className="profile-grid-2">
                <div className="field"><label>{t(locale, 'leads.leadTemperature')}</label><select value={leadForm.leadTemperature} onChange={(event) => onLeadFormChange((prev) => ({ ...prev, leadTemperature: event.target.value }))}>{list(locale, 'options.leadTemperature').map((item) => <option key={item} value={item}>{leadOptionLabel('labels.leadTemperature', item)}</option>)}</select></div>
                <div className="field">
                  <label>{t(locale, 'leads.probabilityOfSale')}</label>
                  <input type="range" min={0} max={100} value={leadForm.probabilityOfSale} onChange={(event) => onLeadFormChange((prev) => ({ ...prev, probabilityOfSale: Number(event.target.value) || 0 }))} />
                  <p className="muted">{leadForm.probabilityOfSale}%</p>
                </div>
              </div>
            </div>
          ) : null}

          {activeTab === 'attribution' ? (
            <div className="sub-card">
              <h3>{t(locale, 'leads.tabs.attribution')}</h3>
              <div className="field"><label>{t(locale, 'leads.source')}</label><select value={leadForm.source} onChange={(event) => onLeadFormChange((prev) => ({ ...prev, source: event.target.value }))}>{list(locale, 'options.leadSource').map((source) => <option key={source} value={source}>{leadOptionLabel('labels.source', source)}</option>)}</select></div>
              <div className="field"><label>{t(locale, 'leads.campaignId')}</label><input value={leadForm.campaignId} onChange={(event) => onLeadFormChange((prev) => ({ ...prev, campaignId: event.target.value }))} /></div>
              <div className="field"><label>{t(locale, 'leads.referralName')}</label><input value={leadForm.referralName} onChange={(event) => onLeadFormChange((prev) => ({ ...prev, referralName: event.target.value }))} /></div>
            </div>
          ) : null}

          {activeTab === 'internal' ? (
            <div className="sub-card">
              <h3>{t(locale, 'leads.tabs.internal')}</h3>
              <div className="field"><label>{t(locale, 'leads.assignedAgent')}</label><select value={leadForm.assignedAgentName} onChange={(event) => onLeadFormChange((prev) => ({ ...prev, assignedAgentName: event.target.value }))}>{list(locale, 'options.leadAgents').map((agent) => <option key={agent} value={agent}>{agent}</option>)}</select></div>
              <div className="field"><label>{t(locale, 'leads.lastContactDate')}</label><input type="date" value={leadForm.lastContactDate} onChange={(event) => onLeadFormChange((prev) => ({ ...prev, lastContactDate: event.target.value }))} /></div>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  if (activePage === 'detail') {
    return (
      <section className="card">
        <h2>{t(locale, 'common.detailTitle')}</h2>
        {leadSaveNotice ? <div className="status">{leadSaveNotice}</div> : null}
        <div className="btn-row"><button type="button" className="ghost" onClick={() => setActivePage('list')}>{t(locale, 'common.actions.backToList')}</button></div>
        <p className="muted">{t(locale, 'leads.selectedLead')}: {selectedLeadId ?? '—'}</p>
        {selectedLead ? renderLeadTabs() : <p className="muted">{t(locale, 'common.selectRow')}</p>}

        <div className="btn-row">
          <button type="button" onClick={() => void handleLeadSaveClick('detail')}>{t(locale, 'common.actions.save')}</button>
        </div>
        <pre className="result">{leadResult}</pre>

        <div className="sub-card">
          <h3>{t(locale, 'leads.convertTitle')}</h3>
          <p className="muted">{t(locale, 'leads.convertSubtitle')}</p>
          <div className="btn-row">
            <button type="button" className="ghost" onClick={applyLeadDataToConvertForm} disabled={!selectedLead}>
              {t(locale, 'leads.convertUseLeadData')}
            </button>
          </div>
          <div className="profile-grid-2">
            <div className="field"><label>{t(locale, 'leads.firstName')}</label><input value={convertForm.firstName} onChange={(event) => onConvertFormChange((prev) => ({ ...prev, firstName: event.target.value }))} /></div>
            <div className="field"><label>{t(locale, 'leads.paternalLastName')}</label><input value={convertForm.paternalLastName} onChange={(event) => onConvertFormChange((prev) => ({ ...prev, paternalLastName: event.target.value }))} /></div>
            <div className="field"><label>{t(locale, 'leads.email')}</label><input value={convertForm.email} onChange={(event) => onConvertFormChange((prev) => ({ ...prev, email: event.target.value }))} /></div>
            <div className="field"><label>{t(locale, 'leads.phone')}</label><input value={convertForm.phone} onChange={(event) => onConvertFormChange((prev) => ({ ...prev, phone: event.target.value }))} /></div>
          </div>
          <div className="btn-row">
            <button type="button" className="secondary" onClick={() => void handleConvertLeadClick()} disabled={!canConvert}>{t(locale, isConverting ? 'leads.convertButtonLoading' : 'leads.convertButton')}</button>
          </div>
          {convertTimeoutRecovered ? <p className="muted">{t(locale, 'leads.convertTimeoutRecovered')}</p> : null}
        </div>

        <div className="sub-card">
          <h3>{t(locale, 'leads.convertPreviewTitle')}</h3>
          <p><strong>{t(locale, 'leads.convertPreviewClientName')}:</strong> {`${convertForm.firstName} ${convertForm.paternalLastName}`.trim() || '—'}</p>
          <p><strong>{t(locale, 'leads.convertPreviewContacts')}:</strong> {convertContactCount}</p>
          <p><strong>{t(locale, 'leads.convertPreviewLeadStatus')}:</strong> {selectedLead?.status ? leadOptionLabel('labels.leadStatus', selectedLead.status) : '—'}</p>
          <p><strong>{t(locale, 'leads.convertPreviewPostStatus')}:</strong> {leadOptionLabel('labels.leadStatus', 'closed_won')}</p>
          <p className="muted">{t(locale, 'leads.lastClientId')}: {lastClientId}</p>
          {lastClientId && lastClientId !== '—' ? (
            <div role="status" className="inline-delete-error" style={{ textAlign: 'left' }}>
              <div>{t(locale, 'leads.convertSuccessCallout')}</div>
              <div className="btn-row">
                <button type="button" className="ghost" onClick={onOpenClientsList}>{t(locale, 'leads.openClientsList')}</button>
                <button type="button" className="ghost" onClick={() => onOpenConvertedClient()}>{t(locale, 'leads.openConvertedClient')}</button>
              </div>
            </div>
          ) : (
            <div className="btn-row">
              <button type="button" className="ghost" onClick={onOpenClientsList}>{t(locale, 'leads.openClientsList')}</button>
              <button type="button" className="ghost" onClick={() => onOpenConvertedClient()} disabled>{t(locale, 'leads.openConvertedClient')}</button>
            </div>
          )}
        </div>
        <pre className="result">{convertResult}</pre>
        {import.meta.env.DEV ? (
          <div className="sub-card">
            <h3>Dev telemetry</h3>
            <p className="muted">Latest event: {lastConvertTelemetry ? `${lastConvertTelemetry.phase} @ ${lastConvertTelemetry.timestamp}` : '—'}</p>
            {isTelemetryPaused ? <p className="muted">Ingestion paused.</p> : null}
            <div className="profile-grid-2">
              <div className="field">
                <label>Phase</label>
                <select value={telemetryPhaseFilter} onChange={(event) => setTelemetryPhaseFilter(event.target.value as TelemetryPhaseFilter)}>
                  <option value="all">all</option>
                  <option value="start">start</option>
                  <option value="invalid">invalid</option>
                  <option value="abort">abort</option>
                  <option value="fail">fail</option>
                  <option value="success">success</option>
                </select>
              </div>
              <div className="field">
                <label>Outcome</label>
                <select value={telemetryOutcomeFilter} onChange={(event) => setTelemetryOutcomeFilter(event.target.value as TelemetryOutcomeFilter)}>
                  <option value="all">all</option>
                  <option value="success">success</option>
                  <option value="error">error</option>
                </select>
              </div>
            </div>
            <div className="btn-row">
              <button type="button" className="ghost" onClick={() => setIsTelemetryPaused((previous) => !previous)} aria-pressed={isTelemetryPaused}>{isTelemetryPaused ? 'Resume ingestion' : 'Pause ingestion'}</button>
              <button type="button" className="ghost" onClick={resetTelemetryFilters} disabled={telemetryPhaseFilter === 'all' && telemetryOutcomeFilter === 'all'}>Reset filters</button>
              <button type="button" className="ghost" onClick={clearConvertTelemetryFeed}>Clear telemetry</button>
              <button type="button" className="ghost" onClick={clearErrorConvertTelemetryEvents} disabled={convertTelemetryCounters.error === 0}>Clear errors</button>
              <button type="button" className="ghost" onClick={retainOnlyErrorConvertTelemetryEvents} disabled={convertTelemetryCounters.error === 0}>Retain only errors</button>
              <button type="button" className="ghost" onClick={() => void copyLatestTelemetryJson()} disabled={!lastConvertTelemetry}>Copy latest</button>
              <button type="button" className="ghost" onClick={() => void copyFilteredTelemetryJson()} disabled={filteredConvertTelemetryFeed.length === 0}>Copy JSON</button>
              <button type="button" className="ghost" onClick={downloadFilteredTelemetryJson} disabled={filteredConvertTelemetryFeed.length === 0}>Download JSON</button>
            </div>
            <p className="muted">Showing {filteredConvertTelemetryFeed.length} of {convertTelemetryFeed.length} events</p>
            <p className="muted">
              Total {convertTelemetryCounters.total} · Success {convertTelemetryCounters.success} · Error {convertTelemetryCounters.error}
              {' '}· Start {convertTelemetryCounters.start} · Invalid {convertTelemetryCounters.invalid} · Abort {convertTelemetryCounters.abort} · Fail {convertTelemetryCounters.fail}
            </p>
            <p className="muted">Filtered: Total {filteredConvertTelemetryCounters.total} · Success {filteredConvertTelemetryCounters.success} · Error {filteredConvertTelemetryCounters.error}</p>
            {telemetryCopyStatus === 'copiedLatest' ? <p className="muted">Latest telemetry event copied.</p> : null}
            {telemetryCopyStatus === 'copiedFeed' ? <p className="muted">Telemetry JSON copied.</p> : null}
            {telemetryCopyStatus === 'downloadedFeed' ? <p className="muted">Telemetry JSON downloaded.</p> : null}
            {telemetryCopyStatus === 'failed' ? <p className="muted">Unable to export telemetry JSON.</p> : null}
            <pre ref={telemetryOutputRef} tabIndex={-1} className="result">{filteredConvertTelemetryFeed.length > 0 ? JSON.stringify(filteredConvertTelemetryFeed, null, 2) : 'No conversion telemetry events match current filters.'}</pre>
          </div>
        ) : null}
      </section>
    );
  }

  if (activePage === 'create') {
    return (
      <section className="card">
        <h2>{t(locale, 'leads.createTitle')}</h2>
        {leadSaveNotice ? <div className="status">{leadSaveNotice}</div> : null}
        {renderLeadTabs()}
        <div className="btn-row">
          <button type="button" onClick={() => void handleLeadSaveClick('create')}>{t(locale, 'leads.createButton')}</button>
          <button type="button" className="ghost" onClick={() => { onCancelEditLead(); setActivePage('list'); }}>{t(locale, 'common.actions.cancel')}</button>
        </div>
        <pre className="result">{leadResult}</pre>
      </section>
    );
  }

  return (
    <section className="card">
      <div className="leads-list-header">
        <h2>{t(locale, 'leads.tableTitle')} › {leadScopeLabel}</h2>
        <div className="leads-list-header-actions">
          <span className="leads-list-count">{sortedLeads.length} {t(locale, 'leads.tableTitle').toLowerCase()}</span>
          <div className="icon-menu-wrap" ref={leadExportMenuRef}>
            <button
              ref={leadExportToggleRef}
              type="button"
              className="ghost icon-btn"
              onClick={() => setShowLeadExportMenu((previous) => !previous)}
              aria-label={t(locale, 'leads.exportVisible')}
              aria-expanded={showLeadExportMenu}
              title={t(locale, 'leads.exportVisible')}
            >
              ⬇
            </button>
            {showLeadExportMenu ? (
              <div className="icon-menu">
                <button type="button" className="ghost icon-menu-item" onClick={() => { exportLeadsToCsv('visible'); setShowLeadExportMenu(false); }} disabled={!canExportVisibleCsv}>
                  {t(locale, 'leads.exportVisible')}
                </button>
                <button type="button" className="ghost icon-menu-item" onClick={() => { exportLeadsToCsv('all'); setShowLeadExportMenu(false); }} disabled={!canExportAllCsv}>
                  {t(locale, 'leads.exportAll')}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      {leadSaveNotice ? <div className="status">{leadSaveNotice}</div> : null}
      <div className="btn-row leads-actions-row list-primary-toolbar">
        <input
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') {
              if (sortedLeads.length === 0) return;
              event.preventDefault();
              focusFirstLeadRowAction();
              return;
            }
            if (event.key === 'Enter') {
              if (sortedLeads.length === 0) return;
              event.preventDefault();
              openLeadDetail(sortedLeads[0]);
              return;
            }
            if (event.key !== 'Escape') return;
            if (!searchTerm.trim()) return;
            setSearchTerm('');
          }}
          placeholder={t(locale, 'common.searchPlaceholder')}
        />
        <button type="button" onClick={() => { onStartCreateLead(); setActivePage('create'); }}>{t(locale, 'common.actions.addNew')}</button>
        <div className="icon-menu-wrap view-menu-wrap" ref={leadViewMenuRef}>
          <button
            ref={leadViewToggleRef}
            type="button"
            className="ghost view-menu-toggle"
            onClick={() => setShowLeadViewMenu((previous) => !previous)}
            aria-expanded={showLeadViewMenu}
          >
            {`${t(locale, 'leads.viewLabel')}: ${leadScopeLabel} (${sortedLeads.length})`}
          </button>
          {showLeadViewMenu ? (
            <div className="icon-menu view-menu">
              <button type="button" className="ghost icon-menu-item" onClick={() => { setLeadListScope('open'); setShowLeadViewMenu(false); }}>
                <span className="menu-item-check" aria-hidden="true">{leadListScope === 'open' ? '✓' : ''}</span>
                <span className="menu-item-label">{`${t(locale, 'leads.scopeOpen')} (${leadScopeCounts.open})`}</span>
              </button>
              <button type="button" className="ghost icon-menu-item" onClick={() => { setLeadListScope('converted'); setShowLeadViewMenu(false); }}>
                <span className="menu-item-check" aria-hidden="true">{leadListScope === 'converted' ? '✓' : ''}</span>
                <span className="menu-item-label">{`${t(locale, 'leads.scopeConverted')} (${leadScopeCounts.converted})`}</span>
              </button>
              <button type="button" className="ghost icon-menu-item" onClick={() => { setLeadListScope('lost'); setShowLeadViewMenu(false); }}>
                <span className="menu-item-check" aria-hidden="true">{leadListScope === 'lost' ? '✓' : ''}</span>
                <span className="menu-item-label">{`${t(locale, 'leads.scopeLost')} (${leadScopeCounts.lost})`}</span>
              </button>
              <button type="button" className="ghost icon-menu-item" onClick={() => { setLeadListScope('junk'); setShowLeadViewMenu(false); }}>
                <span className="menu-item-check" aria-hidden="true">{leadListScope === 'junk' ? '✓' : ''}</span>
                <span className="menu-item-label">{`${t(locale, 'leads.scopeJunk')} (${leadScopeCounts.junk})`}</span>
              </button>
              <button type="button" className="ghost icon-menu-item" onClick={() => { setLeadListScope('all'); setShowLeadViewMenu(false); }}>
                <span className="menu-item-check" aria-hidden="true">{leadListScope === 'all' ? '✓' : ''}</span>
                <span className="menu-item-label">{`${t(locale, 'leads.scopeAll')} (${leadScopeCounts.all})`}</span>
              </button>
            </div>
          ) : null}
        </div>
        <button
          ref={leadMoreFiltersToggleRef}
          type="button"
          className="ghost"
          onClick={() => setShowLeadMoreFilters((previous) => !previous)}
          aria-expanded={showLeadMoreFilters}
        >
          {showLeadMoreFilters ? t(locale, 'common.actions.lessFilters') : `${t(locale, 'common.actions.moreFilters')}${activeSummaryChips.length > 0 ? ` (${activeSummaryChips.length})` : ''}`}
        </button>
      </div>
      {showLeadMoreFilters ? (
        <div ref={leadMoreFiltersPanelRef} className="list-secondary-panel">
          <div className="btn-row list-secondary-header">
            <button type="button" className="ghost" onClick={onRefreshLeads}>{t(locale, 'common.actions.refresh')}</button>
          </div>
          <details className="leads-export-config">
            <summary>{t(locale, 'leads.exportColumns')}</summary>
            <div className="btn-row">
              <button type="button" className="ghost" onClick={() => setExportColumns([...allExportColumns])}>{t(locale, 'leads.exportSelectAll')}</button>
              <button type="button" className="ghost" onClick={() => setExportColumns([])}>{t(locale, 'leads.exportClearAll')}</button>
            </div>
            <div className="checkbox-grid">
              {exportColumnsConfig.map((column) => (
                <label key={column.key}>
                  <input type="checkbox" checked={exportColumns.includes(column.key)} onChange={() => toggleExportColumn(column.key)} />
                  {column.label}
                </label>
              ))}
            </div>
          </details>
          <div className="btn-row leads-quick-filters">
            <button type="button" className={quickFilters.hot ? 'secondary' : 'ghost'} aria-pressed={quickFilters.hot} onClick={() => toggleQuickFilter('hot')}>{t(locale, 'leads.quickFilters.hot')}</button>
            <button type="button" className={quickFilters.urgent ? 'secondary' : 'ghost'} aria-pressed={quickFilters.urgent} onClick={() => toggleQuickFilter('urgent')}>{t(locale, 'leads.quickFilters.urgent')}</button>
            <button type="button" className={quickFilters.stale ? 'secondary' : 'ghost'} aria-pressed={quickFilters.stale} onClick={() => toggleQuickFilter('stale')}>{t(locale, 'leads.quickFilters.stale')}</button>
            <button type="button" className={quickFilters.highProbability ? 'secondary' : 'ghost'} aria-pressed={quickFilters.highProbability} onClick={() => toggleQuickFilter('highProbability')}>{t(locale, 'leads.quickFilters.highProbability')}</button>
            <button type="button" className="ghost" onClick={clearQuickFilters}>{t(locale, 'leads.quickFilters.clear')}</button>
          </div>
          <div className="leads-today-queue">
            <span className="muted leads-today-label">{t(locale, 'leads.todayQueue.title')}</span>
            <div className="btn-row">
              <button type="button" className={todayQueuePreset === 'followUpToday' ? 'secondary' : 'ghost'} aria-pressed={todayQueuePreset === 'followUpToday'} onClick={() => applyTodayQueuePreset('followUpToday')}>
                {t(locale, 'leads.todayQueue.followUpToday')} ({todayQueueCounts.followUpToday})
              </button>
              <button type="button" className={todayQueuePreset === 'hotUrgent' ? 'secondary' : 'ghost'} aria-pressed={todayQueuePreset === 'hotUrgent'} onClick={() => applyTodayQueuePreset('hotUrgent')}>
                {t(locale, 'leads.todayQueue.hotUrgent')} ({todayQueueCounts.hotUrgent})
              </button>
              <button type="button" className={todayQueuePreset === 'readyToClose' ? 'secondary' : 'ghost'} aria-pressed={todayQueuePreset === 'readyToClose'} onClick={() => applyTodayQueuePreset('readyToClose')}>
                {t(locale, 'leads.todayQueue.readyToClose')} ({todayQueueCounts.readyToClose})
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {activeSummaryChips.length > 0 ? (
        <div className="leads-active-summary">
          <div className="leads-active-summary-header">
            <span className="muted leads-active-summary-label">{t(locale, 'leads.activeSummary.title')}</span>
            <div className="btn-row">
              <button type="button" className="ghost" onClick={clearTodayQueuePreset} disabled={!todayQueuePreset}>{t(locale, 'leads.activeSummary.clearQueue')}</button>
              <button type="button" className="ghost" onClick={clearLeadSearchTerm} disabled={!searchTerm.trim()}>{t(locale, 'leads.activeSummary.clearSearch')}</button>
              <button type="button" className="ghost" onClick={resetLeadListView}>{t(locale, 'leads.activeSummary.reset')}</button>
            </div>
          </div>
          <div className="leads-active-summary-chips">
            {activeSummaryChips.map((chip) => (
              <button key={chip.id} type="button" className="leads-summary-chip" aria-label={`${t(locale, 'leads.activeSummary.removeFilter')}: ${chip.label}`} onClick={chip.onClick}>
                {chip.label} ×
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <p className="muted leads-scope-count">{t(locale, 'leads.scopeCount').replace('{visible}', String(sortedLeads.length)).replace('{total}', String(leads.length))}</p>
      <div className="leads-grid-layout">
        <div className="leads-grid-main">
          <table ref={leadsTableRef} className="leads-grid-table">
            <thead>
              <tr>
                {selectedLeadListColumns.map((column) => <th key={column.key}>{column.header()}</th>)}
                <th>
                  <div className="table-header-actions">
                    <span>{t(locale, 'common.tableAction')}</span>
                    <button
                      ref={leadColumnsToggleRef}
                      type="button"
                      className="ghost icon-btn table-header-gear"
                      onClick={() => setShowLeadColumnsPanel((previous) => !previous)}
                      aria-pressed={showLeadColumnsPanel}
                      aria-label={t(locale, 'common.visibleColumns')}
                      title={t(locale, 'common.visibleColumns')}
                    >
                      ⚙
                    </button>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedLeads.length === 0 ? <tr><td colSpan={selectedLeadListColumns.length + 1}>{t(locale, 'leads.empty')}</td></tr> : sortedLeads.map((lead) => (
                <tr key={lead.id} onClick={() => openLeadDetail(lead)} className="clickable-row">
                  {selectedLeadListColumns.map((column) => <Fragment key={column.key}>{column.cell(lead)}</Fragment>)}
                  <td>
                    <div className="btn-row table-actions">
                      <button type="button" className="ghost" onClick={(event) => { event.stopPropagation(); openLeadDetail(lead); }}>{t(locale, 'common.actions.view')}</button>
                      {pendingDeleteLeadId === lead.id ? (
                        <>
                          <button type="button" className="secondary" onClick={(event) => { event.stopPropagation(); onDeleteLead(lead.id); }}>{t(locale, 'common.actions.confirmDelete')}</button>
                          <button type="button" className="ghost" onClick={(event) => { event.stopPropagation(); onCancelDeleteLead(); }}>{t(locale, 'common.actions.cancel')}</button>
                        </>
                      ) : (
                        <button type="button" className="ghost" onClick={(event) => { event.stopPropagation(); onRequestDeleteLead(lead.id); }}>{t(locale, 'common.actions.delete')}</button>
                      )}
                    </div>
                    {deleteLeadError?.id === lead.id ? (
                      <div className="inline-delete-error">
                        <div>{deleteLeadError.message}</div>
                        <button type="button" className="secondary" onClick={(event) => { event.stopPropagation(); onForceDeleteLead(lead.id); }}>{t(locale, 'common.actions.deleteAll')}</button>
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <aside
          ref={leadColumnsPanelRef}
          className={`leads-columns-panel ${showLeadColumnsPanel ? 'is-open' : 'is-closed'}`}
          aria-hidden={!showLeadColumnsPanel}
        >
            <div className="leads-columns-panel-header">
              <strong>{t(locale, 'common.visibleColumns')}</strong>
              <button type="button" className="ghost" onClick={() => setShowLeadColumnsPanel(false)}>{t(locale, 'common.actions.cancel')}</button>
            </div>
            <input
              value={leadColumnsFilterTerm}
              onChange={(event) => setLeadColumnsFilterTerm(event.target.value)}
              placeholder={t(locale, 'common.searchPlaceholder')}
            />
            <div className="btn-row">
              <button type="button" className="ghost" onClick={() => setLeadListColumns([...defaultLeadListColumns])}>{t(locale, 'common.actions.resetDefaults')}</button>
              <button type="button" className="ghost" onClick={() => setAllLeadColumnGroupsExpanded(true)}>{t(locale, 'common.actions.expandAll')}</button>
              <button type="button" className="ghost" onClick={() => setAllLeadColumnGroupsExpanded(false)}>{t(locale, 'common.actions.collapseAll')}</button>
            </div>
            <div className="checkbox-grid">
              <details className="column-group selected-column-group" open>
                <summary className="column-group-title">{t(locale, 'common.columnGroups.selected')}</summary>
                <p className="selected-column-hint muted">{t(locale, 'common.visibleColumnsReorderHint')}</p>
                {selectedLeadOverlayColumns.map((column, index) => (
                  <div
                    key={`selected-${column.key}`}
                    className="leads-column-item is-selected is-draggable"
                    style={{ justifyContent: 'space-between' }}
                    draggable
                    tabIndex={0}
                    onDragStart={() => setDraggedLeadColumnKey(column.key)}
                    onDragEnd={() => setDraggedLeadColumnKey(null)}
                    onDragOver={(event) => event.preventDefault()}
                    onKeyDown={(event) => {
                      const moveUpShortcut = event.key === 'ArrowUp' && (
                        event.altKey
                        || (event.metaKey && event.shiftKey)
                        || (event.ctrlKey && event.shiftKey)
                      );
                      const moveDownShortcut = event.key === 'ArrowDown' && (
                        event.altKey
                        || (event.metaKey && event.shiftKey)
                        || (event.ctrlKey && event.shiftKey)
                      );
                      if (!moveUpShortcut && !moveDownShortcut) return;
                      event.preventDefault();
                      event.stopPropagation();
                      moveLeadListColumn(column.key, moveUpShortcut ? 'up' : 'down');
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      if (!draggedLeadColumnKey || draggedLeadColumnKey === column.key) return;
                      reorderLeadListColumn(draggedLeadColumnKey, column.key);
                    }}
                  >
                    <span className="selected-column-order" aria-label={`Order ${index + 1}`}>{index + 1}</span>
                    <label>
                      <input
                        type="checkbox"
                        checked
                        onChange={() => toggleLeadListColumn(column.key)}
                        disabled={leadListColumns.length <= 1}
                      />
                      {column.label}
                    </label>
                    <div className="column-order-actions">
                      <button
                        type="button"
                        className="ghost column-order-btn"
                        aria-label={t(locale, 'common.actions.moveUp')}
                        title={t(locale, 'common.actions.moveUp')}
                        onClick={(event) => {
                          event.stopPropagation();
                          moveLeadListColumn(column.key, 'up');
                        }}
                        disabled={index === 0}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="ghost column-order-btn"
                        aria-label={t(locale, 'common.actions.moveDown')}
                        title={t(locale, 'common.actions.moveDown')}
                        onClick={(event) => {
                          event.stopPropagation();
                          moveLeadListColumn(column.key, 'down');
                        }}
                        disabled={index === selectedLeadOverlayColumns.length - 1}
                      >
                        ↓
                      </button>
                      <span className="muted" aria-hidden="true">↕</span>
                    </div>
                  </div>
                ))}
              </details>
              {groupedFilteredLeadColumns.map((entry) => (
                <details
                  key={entry.group}
                  className="column-group"
                  open={leadColumnGroupsExpanded[entry.group]}
                  onToggle={(event) => setLeadColumnGroupExpanded(entry.group, event.currentTarget.open)}
                >
                  <summary className="column-group-title">{leadColumnGroupLabels[entry.group]}</summary>
                  {entry.columns.map((column) => {
                    const isSelected = leadListColumns.includes(column.key);
                    return (
                      <div
                        key={column.key}
                        className={`leads-column-item ${isSelected ? 'is-selected' : ''}`}
                      >
                        <label>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleLeadListColumn(column.key)}
                            disabled={isSelected && leadListColumns.length <= 1}
                          />
                          {column.label}
                        </label>
                      </div>
                    );
                  })}
                </details>
              ))}
            </div>
        </aside>
      </div>
    </section>
  );
}
