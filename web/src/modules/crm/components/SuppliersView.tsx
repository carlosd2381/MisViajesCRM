import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { list, t } from '../i18n';
import { SUPPLIERS_LIST_ALL_COLUMNS, SUPPLIERS_LIST_DEFAULT_COLUMNS, type SupplierListColumnKey } from '../list-column-defaults';
import type { Locale, Supplier, SupplierIncident, SupplierRecentBooking } from '../types';
import { loadViewPrefs, saveViewPrefs } from '../view-prefs';

interface SupplierForm {
  name: string;
  tradeName: string;
  type: string;
  serviceModel: string;
  marketFocusTags: string[];
  tierLevel: string;
  rfc: string;
  billingAddress: string;
  status: string;
  defaultCurrency: 'MXN' | 'USD' | 'EUR';
  commissionType: string;
  commissionRate: number;
  payoutTerms: string;
  contractExpiryDate: string;
  blackoutDates: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  internalRating: number;
  responseTimeScore: number;
  internalRiskFlag: string;
}

interface SuppliersViewProps {
  locale: Locale;
  suppliers: Supplier[];
  supplierForm: SupplierForm;
  selectedSupplierId: string | null;
  pendingDeleteSupplierId: string | null;
  deleteSupplierError: { id: string; message: string } | null;
  supplierResult: string;
  supplierIncidents: SupplierIncident[];
  supplierRecentBookings: SupplierRecentBooking[];
  onSupplierFormChange: (next: SupplierForm | ((previous: SupplierForm) => SupplierForm)) => void;
  onRefreshSuppliers: () => void;
  onViewSupplier: (supplierId: string) => void;
  onLoadSupplierIncidents: (supplierId: string) => void;
  onLoadSupplierRecentBookings: (supplierId: string) => void;
  onAddSupplierIncident: (
    supplierId: string,
    payload: { occurredAt?: string; clientName?: string; summary: string; severity: 'low' | 'medium' | 'high' }
  ) => void;
  onStartCreateSupplier: () => void;
  onCancelEditSupplier: () => void;
  onSaveSupplier: () => void;
  onRequestDeleteSupplier: (supplierId: string) => void;
  onCancelDeleteSupplier: () => void;
  onDeleteSupplier: (supplierId: string) => void;
  onForceDeleteSupplier: (supplierId: string) => void;
}

export function SuppliersView({
  locale,
  suppliers,
  supplierForm,
  selectedSupplierId,
  pendingDeleteSupplierId,
  deleteSupplierError,
  supplierResult,
  supplierIncidents,
  supplierRecentBookings,
  onSupplierFormChange,
  onRefreshSuppliers,
  onViewSupplier,
  onLoadSupplierIncidents,
  onLoadSupplierRecentBookings,
  onAddSupplierIncident,
  onStartCreateSupplier,
  onCancelEditSupplier,
  onSaveSupplier,
  onRequestDeleteSupplier,
  onCancelDeleteSupplier,
  onDeleteSupplier,
  onForceDeleteSupplier,
}: SuppliersViewProps) {
  type SupplierDetailTab = 'classification' | 'contractRates' | 'operations' | 'performance' | 'recentBookings';
  type SupplierListScope = 'active' | 'archived' | 'all';
  type SupplierQueuePreset = 'expiringContracts' | 'lowPerformance' | 'highRisk' | 'blacklisted' | null;
  type SupplierColumnGroupKey = 'identity' | 'classification' | 'financial' | 'performance' | 'compliance';
  const SUPPLIERS_VIEW_PREFS_KEY = 'misviajescrm.web.suppliers.viewprefs';
  const allSupplierListColumns: SupplierListColumnKey[] = [...SUPPLIERS_LIST_ALL_COLUMNS];
  const defaultSupplierListColumns: SupplierListColumnKey[] = [...SUPPLIERS_LIST_DEFAULT_COLUMNS];
  const supplierColumnGroupKeys: SupplierColumnGroupKey[] = ['identity', 'classification', 'financial', 'performance', 'compliance'];
  type SuppliersViewPrefs = {
    searchTerm?: string;
    supplierListScope?: SupplierListScope;
    activeQueuePreset?: SupplierQueuePreset;
    supplierListColumns?: SupplierListColumnKey[];
    supplierColumnGroupsExpanded?: Partial<Record<SupplierColumnGroupKey, boolean>>;
  };

  function restoreSearchTerm(): string {
    const prefs = loadViewPrefs<SuppliersViewPrefs>(SUPPLIERS_VIEW_PREFS_KEY);
    return typeof prefs?.searchTerm === 'string' ? prefs.searchTerm : '';
  }

  function restoreQueuePreset(): SupplierQueuePreset {
    const prefs = loadViewPrefs<SuppliersViewPrefs>(SUPPLIERS_VIEW_PREFS_KEY);
    const next = prefs?.activeQueuePreset;
    if (!next) return null;
    if (!['expiringContracts', 'lowPerformance', 'highRisk', 'blacklisted'].includes(next)) return null;
    return next;
  }

  function restoreSupplierListScope(): SupplierListScope {
    const prefs = loadViewPrefs<SuppliersViewPrefs>(SUPPLIERS_VIEW_PREFS_KEY);
    const next = prefs?.supplierListScope;
    if (next === 'archived') return 'archived';
    if (next === 'all') return 'all';
    return 'active';
  }

  function restoreSupplierListColumns(): SupplierListColumnKey[] {
    const prefs = loadViewPrefs<SuppliersViewPrefs>(SUPPLIERS_VIEW_PREFS_KEY);
    const next = prefs?.supplierListColumns;
    if (!Array.isArray(next)) return allSupplierListColumns;
    const allowedColumns = next.filter((column): column is SupplierListColumnKey => allSupplierListColumns.includes(column));
    return allowedColumns.length > 0 ? allowedColumns : allSupplierListColumns;
  }

  function restoreSupplierColumnGroupsExpanded(): Record<SupplierColumnGroupKey, boolean> {
    const defaults = Object.fromEntries(supplierColumnGroupKeys.map((group) => [group, false])) as Record<SupplierColumnGroupKey, boolean>;
    const prefs = loadViewPrefs<SuppliersViewPrefs>(SUPPLIERS_VIEW_PREFS_KEY);
    const next = prefs?.supplierColumnGroupsExpanded;
    if (!next || typeof next !== 'object' || Array.isArray(next)) return defaults;

    const restored = { ...defaults };
    for (const group of supplierColumnGroupKeys) {
      if (typeof next[group] === 'boolean') {
        restored[group] = next[group];
      }
    }
    return restored;
  }

  const [searchTerm, setSearchTerm] = useState(restoreSearchTerm);
  const [activePage, setActivePage] = useState<'list' | 'detail' | 'create'>('list');
  const [activeTab, setActiveTab] = useState<SupplierDetailTab>('classification');
  const [supplierListScope, setSupplierListScope] = useState<SupplierListScope>(restoreSupplierListScope);
  const [activeQueuePreset, setActiveQueuePreset] = useState<SupplierQueuePreset>(restoreQueuePreset);
  const [supplierListColumns, setSupplierListColumns] = useState<SupplierListColumnKey[]>(restoreSupplierListColumns);
  const [supplierColumnGroupsExpanded, setSupplierColumnGroupsExpanded] = useState<Record<SupplierColumnGroupKey, boolean>>(restoreSupplierColumnGroupsExpanded);
  const [showSupplierColumnsPanel, setShowSupplierColumnsPanel] = useState(false);
  const [showSupplierMoreFilters, setShowSupplierMoreFilters] = useState(false);
  const [showSupplierExportMenu, setShowSupplierExportMenu] = useState(false);
  const [showSupplierViewMenu, setShowSupplierViewMenu] = useState(false);
  const [supplierColumnsFilterTerm, setSupplierColumnsFilterTerm] = useState('');
  const [draggedSupplierColumnKey, setDraggedSupplierColumnKey] = useState<SupplierListColumnKey | null>(null);
  const [incidentForm, setIncidentForm] = useState({ occurredAt: '', clientName: '', summary: '', severity: 'medium' as 'low' | 'medium' | 'high' });
  const suppliersTableRef = useRef<HTMLTableElement | null>(null);
  const supplierColumnsPanelRef = useRef<HTMLDivElement | null>(null);
  const supplierColumnsToggleRef = useRef<HTMLButtonElement | null>(null);
  const supplierMoreFiltersPanelRef = useRef<HTMLDivElement | null>(null);
  const supplierMoreFiltersToggleRef = useRef<HTMLButtonElement | null>(null);
  const supplierExportMenuRef = useRef<HTMLDivElement | null>(null);
  const supplierExportToggleRef = useRef<HTMLButtonElement | null>(null);
  const supplierViewMenuRef = useRef<HTMLDivElement | null>(null);
  const supplierViewToggleRef = useRef<HTMLButtonElement | null>(null);
  const selectedSupplier = selectedSupplierId ? suppliers.find((supplier) => supplier.id === selectedSupplierId) ?? null : null;

  useEffect(() => {
    saveViewPrefs(SUPPLIERS_VIEW_PREFS_KEY, { searchTerm, supplierListScope, activeQueuePreset, supplierListColumns, supplierColumnGroupsExpanded });
  }, [searchTerm, supplierListScope, activeQueuePreset, supplierListColumns, supplierColumnGroupsExpanded]);

  useEffect(() => {
    if (activePage !== 'detail' || !selectedSupplierId) return;
    onLoadSupplierIncidents(selectedSupplierId);
    onLoadSupplierRecentBookings(selectedSupplierId);
  }, [activePage, selectedSupplierId, onLoadSupplierIncidents, onLoadSupplierRecentBookings]);

  useEffect(() => {
    if (!showSupplierColumnsPanel || typeof window === 'undefined') return;

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedInsidePanel = Boolean(supplierColumnsPanelRef.current?.contains(target));
      const clickedToggleButton = Boolean(supplierColumnsToggleRef.current?.contains(target));
      if (clickedInsidePanel || clickedToggleButton) return;
      setShowSupplierColumnsPanel(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setShowSupplierColumnsPanel(false);
    };

    window.addEventListener('mousedown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [showSupplierColumnsPanel]);

  useEffect(() => {
    if (!showSupplierMoreFilters || typeof window === 'undefined') return;

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedInsidePanel = Boolean(supplierMoreFiltersPanelRef.current?.contains(target));
      const clickedToggleButton = Boolean(supplierMoreFiltersToggleRef.current?.contains(target));
      if (clickedInsidePanel || clickedToggleButton) return;
      setShowSupplierMoreFilters(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setShowSupplierMoreFilters(false);
    };

    window.addEventListener('mousedown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [showSupplierMoreFilters]);

  useEffect(() => {
    if (!showSupplierExportMenu || typeof window === 'undefined') return;

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedInsideMenu = Boolean(supplierExportMenuRef.current?.contains(target));
      const clickedToggleButton = Boolean(supplierExportToggleRef.current?.contains(target));
      if (clickedInsideMenu || clickedToggleButton) return;
      setShowSupplierExportMenu(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setShowSupplierExportMenu(false);
    };

    window.addEventListener('mousedown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [showSupplierExportMenu]);

  useEffect(() => {
    if (!showSupplierViewMenu || typeof window === 'undefined') return;

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedInsideMenu = Boolean(supplierViewMenuRef.current?.contains(target));
      const clickedToggleButton = Boolean(supplierViewToggleRef.current?.contains(target));
      if (clickedInsideMenu || clickedToggleButton) return;
      setShowSupplierViewMenu(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setShowSupplierViewMenu(false);
    };

    window.addEventListener('mousedown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [showSupplierViewMenu]);

  function parseMarketFocusInput(value: string): string[] {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  function formatMarketFocus(values: string[] | undefined): string {
    if (!values || values.length === 0) return '—';
    return values.join(', ');
  }

  function humanizeRawValue(value: string): string {
    return value
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  function supplierOptionLabel(labelPath: string, option: string): string {
    const key = `${labelPath}.${option}`;
    const translated = t(locale, key);
    return translated === key ? humanizeRawValue(option) : translated;
  }

  function isContractExpirySoon(contractExpiryDate: string | undefined): boolean {
    if (!contractExpiryDate) return false;
    const expiryDate = new Date(contractExpiryDate);
    if (Number.isNaN(expiryDate.getTime())) return false;
    const now = new Date();
    const ms = expiryDate.getTime() - now.getTime();
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    return days >= 0 && days <= 30;
  }

  function isLowPerformanceSupplier(supplier: Supplier): boolean {
    const lowRating = typeof supplier.internalRating === 'number' && supplier.internalRating <= 2;
    const slowResponse = typeof supplier.responseTimeScore === 'number' && supplier.responseTimeScore < 50;
    return lowRating || slowResponse;
  }

  function isHighRiskSupplier(supplier: Supplier): boolean {
    return supplier.internalRiskFlag === 'high_risk';
  }

  function isBlacklistedSupplier(supplier: Supplier): boolean {
    return supplier.status === 'blacklisted';
  }

  function isArchivedSupplier(supplier: Supplier): boolean {
    return supplier.status === 'inactive' || supplier.status === 'blacklisted';
  }

  function submitIncident() {
    if (!selectedSupplierId || !incidentForm.summary.trim()) return;
    onAddSupplierIncident(selectedSupplierId, {
      occurredAt: incidentForm.occurredAt || undefined,
      clientName: incidentForm.clientName.trim() || undefined,
      summary: incidentForm.summary.trim(),
      severity: incidentForm.severity
    });
    setIncidentForm({ occurredAt: '', clientName: '', summary: '', severity: 'medium' });
  }

  const filteredSuppliers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const suppliersByScope = supplierListScope === 'active'
      ? suppliers.filter((supplier) => !isArchivedSupplier(supplier))
      : supplierListScope === 'archived'
        ? suppliers.filter((supplier) => isArchivedSupplier(supplier))
        : suppliers;

    const scopedSuppliers = activeQueuePreset === 'expiringContracts'
      ? suppliersByScope.filter((supplier) => isContractExpirySoon(supplier.contractExpiryDate))
      : activeQueuePreset === 'lowPerformance'
        ? suppliersByScope.filter((supplier) => isLowPerformanceSupplier(supplier))
        : activeQueuePreset === 'highRisk'
          ? suppliersByScope.filter((supplier) => isHighRiskSupplier(supplier))
          : activeQueuePreset === 'blacklisted'
            ? suppliersByScope.filter((supplier) => isBlacklistedSupplier(supplier))
            : suppliersByScope;
    if (!term) return scopedSuppliers;
    return scopedSuppliers.filter((supplier) =>
      supplier.id.toLowerCase().includes(term)
      || supplier.name.toLowerCase().includes(term)
      || supplier.type.toLowerCase().includes(term)
      || supplier.status.toLowerCase().includes(term)
      || (supplier.tierLevel ?? '').toLowerCase().includes(term)
      || (supplier.marketFocusTags ?? []).join(' ').toLowerCase().includes(term)
    );
  }, [suppliers, searchTerm, activeQueuePreset, supplierListScope]);

  const expiringCount = useMemo(() => suppliers.filter((supplier) => isContractExpirySoon(supplier.contractExpiryDate)).length, [suppliers]);
  const lowPerformanceCount = useMemo(() => suppliers.filter((supplier) => isLowPerformanceSupplier(supplier)).length, [suppliers]);
  const highRiskCount = useMemo(() => suppliers.filter((supplier) => isHighRiskSupplier(supplier)).length, [suppliers]);
  const blacklistedCount = useMemo(() => suppliers.filter((supplier) => isBlacklistedSupplier(supplier)).length, [suppliers]);
  const supplierScopeCounts = useMemo(() => {
    const archived = suppliers.filter((supplier) => isArchivedSupplier(supplier)).length;
    const all = suppliers.length;
    const active = all - archived;
    return { active, archived, all };
  }, [suppliers]);
  const activeQueueLabel = useMemo(() => {
    if (activeQueuePreset === 'blacklisted') return t(locale, 'suppliers.blacklistedQueue');
    if (activeQueuePreset === 'highRisk') return t(locale, 'suppliers.highRiskQueue');
    if (activeQueuePreset === 'lowPerformance') return t(locale, 'suppliers.lowPerformanceQueue');
    if (activeQueuePreset === 'expiringContracts') return t(locale, 'suppliers.expiryQueue');
    return null;
  }, [activeQueuePreset, locale]);
  const activeSummaryChips = useMemo(() => {
    const chips: Array<{ id: string; label: string; onClick: () => void }> = [];
    if (supplierListScope !== 'active') {
      chips.push({
        id: 'scope',
        label: `${t(locale, 'suppliers.activeSummaryScope')}: ${supplierListScope === 'archived' ? t(locale, 'suppliers.scopeArchived') : t(locale, 'suppliers.scopeAll')}`,
        onClick: () => setSupplierListScope('active')
      });
    }
    if (activeQueueLabel) {
      chips.push({
        id: 'queue',
        label: `${t(locale, 'suppliers.activeQueue')}: ${activeQueueLabel}`,
        onClick: () => setActiveQueuePreset(null)
      });
    }
    const term = searchTerm.trim();
    if (term) {
      chips.push({
        id: 'search',
        label: `${t(locale, 'suppliers.activeSummarySearch')}: ${term}`,
        onClick: () => setSearchTerm('')
      });
    }
    return chips;
  }, [activeQueueLabel, searchTerm, locale, supplierListScope]);

  const supplierScopeLabel = useMemo(() => {
    if (supplierListScope === 'archived') return t(locale, 'suppliers.scopeArchived');
    if (supplierListScope === 'all') return t(locale, 'suppliers.scopeAll');
    return t(locale, 'suppliers.scopeActive');
  }, [supplierListScope, locale]);

  function focusFirstSupplierRowAction() {
    const firstActionButton = suppliersTableRef.current?.querySelector('tbody tr button') as HTMLButtonElement | null;
    firstActionButton?.focus();
  }

  function toggleSupplierListColumn(columnKey: SupplierListColumnKey) {
    setSupplierListColumns((previous) => {
      const isSelected = previous.includes(columnKey);
      if (isSelected) {
        if (previous.length <= 1) return previous;
        return previous.filter((key) => key !== columnKey);
      }
      return [columnKey, ...previous];
    });
  }

  function reorderSupplierListColumn(fromColumnKey: SupplierListColumnKey, toColumnKey: SupplierListColumnKey) {
    setSupplierListColumns((previous) => {
      const fromIndex = previous.indexOf(fromColumnKey);
      const toIndex = previous.indexOf(toColumnKey);
      if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return previous;
      const next = [...previous];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }

  function moveSupplierListColumn(columnKey: SupplierListColumnKey, direction: 'up' | 'down') {
    const currentIndex = supplierListColumns.indexOf(columnKey);
    if (currentIndex === -1) return;
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= supplierListColumns.length) return;
    const targetColumnKey = supplierListColumns[targetIndex];
    reorderSupplierListColumn(columnKey, targetColumnKey);
  }

  function setAllSupplierColumnGroupsExpanded(expanded: boolean) {
    setSupplierColumnGroupsExpanded((previous) => {
      const next = { ...previous };
      for (const group of supplierColumnGroupKeys) {
        next[group] = expanded;
      }
      return next;
    });
  }

  function setSupplierColumnGroupExpanded(group: SupplierColumnGroupKey, expanded: boolean) {
    setSupplierColumnGroupsExpanded((previous) => ({ ...previous, [group]: expanded }));
  }

  const supplierListColumnsConfig = [
    { key: 'id' as const, group: 'identity' as const, label: t(locale, 'common.tableId'), cell: (supplier: Supplier) => <td title={supplier.id}>{supplier.id.slice(0, 8)}</td> },
    { key: 'name' as const, group: 'identity' as const, label: t(locale, 'suppliers.tableName'), cell: (supplier: Supplier) => <td>{supplier.name}</td> },
    { key: 'tradeName' as const, group: 'identity' as const, label: t(locale, 'suppliers.fieldTradeName'), cell: (supplier: Supplier) => <td>{supplier.tradeName || '—'}</td> },
    { key: 'type' as const, group: 'classification' as const, label: t(locale, 'suppliers.tableType'), cell: (supplier: Supplier) => <td>{supplierOptionLabel('labels.supplierType', supplier.type)}</td> },
    { key: 'serviceModel' as const, group: 'classification' as const, label: t(locale, 'suppliers.fieldServiceModel'), cell: (supplier: Supplier) => <td>{supplier.serviceModel ? supplierOptionLabel('labels.supplierServiceModel', supplier.serviceModel) : '—'}</td> },
    { key: 'marketFocusTags' as const, group: 'classification' as const, label: t(locale, 'suppliers.fieldMarketFocus'), cell: (supplier: Supplier) => <td>{supplier.marketFocusTags.length > 0 ? supplier.marketFocusTags.join(', ') : '—'}</td> },
    { key: 'tierLevel' as const, group: 'classification' as const, label: t(locale, 'suppliers.fieldTierLevel'), cell: (supplier: Supplier) => <td>{supplier.tierLevel ? supplierOptionLabel('labels.supplierTierLevel', supplier.tierLevel) : '—'}</td> },
    { key: 'status' as const, group: 'classification' as const, label: t(locale, 'suppliers.tableStatus'), cell: (supplier: Supplier) => <td><span className="pill">{supplierOptionLabel('labels.supplierStatus', supplier.status)}</span></td> },
    { key: 'defaultCurrency' as const, group: 'financial' as const, label: t(locale, 'suppliers.fieldDefaultCurrency'), cell: (supplier: Supplier) => <td>{supplierOptionLabel('labels.currency', supplier.defaultCurrency)}</td> },
    { key: 'commissionType' as const, group: 'financial' as const, label: t(locale, 'suppliers.fieldCommissionType'), cell: (supplier: Supplier) => <td>{supplierOptionLabel('labels.supplierCommissionType', supplier.commissionType)}</td> },
    { key: 'commissionRate' as const, group: 'financial' as const, label: t(locale, 'suppliers.fieldCommissionRate'), cell: (supplier: Supplier) => <td>{supplier.commissionRate}</td> },
    { key: 'payoutTerms' as const, group: 'financial' as const, label: t(locale, 'suppliers.fieldPayoutTerms'), cell: (supplier: Supplier) => <td>{supplierOptionLabel('labels.supplierPayoutTerm', supplier.payoutTerms)}</td> },
    { key: 'contractExpiryDate' as const, group: 'compliance' as const, label: t(locale, 'suppliers.fieldContractExpiryDate'), cell: (supplier: Supplier) => <td>{supplier.contractExpiryDate || '—'}</td> },
    { key: 'internalRating' as const, group: 'performance' as const, label: t(locale, 'suppliers.fieldInternalRating'), cell: (supplier: Supplier) => <td>{supplier.internalRating ?? '—'}</td> },
    { key: 'responseTimeScore' as const, group: 'performance' as const, label: t(locale, 'suppliers.fieldResponseTimeScore'), cell: (supplier: Supplier) => <td>{supplier.responseTimeScore ?? '—'}</td> },
    { key: 'internalRiskFlag' as const, group: 'compliance' as const, label: t(locale, 'suppliers.fieldInternalRiskFlag'), cell: (supplier: Supplier) => <td>{supplierOptionLabel('labels.supplierRiskFlag', supplier.internalRiskFlag)}</td> },
    { key: 'rfc' as const, group: 'compliance' as const, label: t(locale, 'suppliers.fieldRfc'), cell: (supplier: Supplier) => <td>{supplier.rfc || '—'}</td> },
  ];

  const selectedSupplierListColumns = supplierListColumns
    .map((key) => supplierListColumnsConfig.find((column) => column.key === key))
    .filter((column): column is (typeof supplierListColumnsConfig)[number] => Boolean(column));

  const filteredSupplierListColumnsConfig = supplierListColumnsConfig.filter((column) => {
    const term = supplierColumnsFilterTerm.trim().toLowerCase();
    if (!term) return true;
    return column.label.toLowerCase().includes(term);
  });

  const supplierColumnGroupOrder = supplierColumnGroupKeys;
  const supplierColumnGroupLabels: Record<(typeof supplierColumnGroupOrder)[number], string> = {
    identity: t(locale, 'common.columnGroups.identity'),
    classification: t(locale, 'common.columnGroups.classification'),
    financial: t(locale, 'common.columnGroups.financial'),
    performance: t(locale, 'common.columnGroups.performance'),
    compliance: t(locale, 'common.columnGroups.compliance'),
  };

  const groupedFilteredSupplierColumns = supplierColumnGroupOrder
    .map((group) => ({
      group,
      columns: filteredSupplierListColumnsConfig.filter((column) => column.group === group)
    }))
    .filter((entry) => entry.columns.length > 0);

  const selectedSupplierOverlayColumns = supplierListColumns
    .map((key) => supplierListColumnsConfig.find((column) => column.key === key))
    .filter((column): column is (typeof supplierListColumnsConfig)[number] => Boolean(column));

  const supplierExportColumnsConfig = [
    { key: 'id' as const, label: t(locale, 'common.tableId'), value: (supplier: Supplier) => supplier.id },
    { key: 'name' as const, label: t(locale, 'suppliers.tableName'), value: (supplier: Supplier) => supplier.name },
    { key: 'tradeName' as const, label: t(locale, 'suppliers.fieldTradeName'), value: (supplier: Supplier) => supplier.tradeName ?? '' },
    { key: 'type' as const, label: t(locale, 'suppliers.tableType'), value: (supplier: Supplier) => supplierOptionLabel('labels.supplierType', supplier.type) },
    { key: 'serviceModel' as const, label: t(locale, 'suppliers.fieldServiceModel'), value: (supplier: Supplier) => supplier.serviceModel ? supplierOptionLabel('labels.supplierServiceModel', supplier.serviceModel) : '' },
    { key: 'marketFocusTags' as const, label: t(locale, 'suppliers.fieldMarketFocus'), value: (supplier: Supplier) => (supplier.marketFocusTags ?? []).join(' | ') },
    { key: 'tierLevel' as const, label: t(locale, 'suppliers.fieldTierLevel'), value: (supplier: Supplier) => supplier.tierLevel ? supplierOptionLabel('labels.supplierTierLevel', supplier.tierLevel) : '' },
    { key: 'status' as const, label: t(locale, 'suppliers.tableStatus'), value: (supplier: Supplier) => supplierOptionLabel('labels.supplierStatus', supplier.status) },
    { key: 'defaultCurrency' as const, label: t(locale, 'suppliers.fieldDefaultCurrency'), value: (supplier: Supplier) => supplierOptionLabel('labels.currency', supplier.defaultCurrency) },
    { key: 'commissionType' as const, label: t(locale, 'suppliers.fieldCommissionType'), value: (supplier: Supplier) => supplierOptionLabel('labels.supplierCommissionType', supplier.commissionType) },
    { key: 'commissionRate' as const, label: t(locale, 'suppliers.fieldCommissionRate'), value: (supplier: Supplier) => supplier.commissionRate },
    { key: 'payoutTerms' as const, label: t(locale, 'suppliers.fieldPayoutTerms'), value: (supplier: Supplier) => supplierOptionLabel('labels.supplierPayoutTerm', supplier.payoutTerms) },
    { key: 'contractExpiryDate' as const, label: t(locale, 'suppliers.fieldContractExpiryDate'), value: (supplier: Supplier) => supplier.contractExpiryDate ?? '' },
    { key: 'internalRating' as const, label: t(locale, 'suppliers.fieldInternalRating'), value: (supplier: Supplier) => supplier.internalRating ?? '' },
    { key: 'responseTimeScore' as const, label: t(locale, 'suppliers.fieldResponseTimeScore'), value: (supplier: Supplier) => supplier.responseTimeScore ?? '' },
    { key: 'internalRiskFlag' as const, label: t(locale, 'suppliers.fieldInternalRiskFlag'), value: (supplier: Supplier) => supplierOptionLabel('labels.supplierRiskFlag', supplier.internalRiskFlag) },
    { key: 'rfc' as const, label: t(locale, 'suppliers.fieldRfc'), value: (supplier: Supplier) => supplier.rfc ?? '' },
  ];

  const visibleSupplierExportColumns = supplierListColumns
    .map((key) => supplierExportColumnsConfig.find((column) => column.key === key))
    .filter((column): column is (typeof supplierExportColumnsConfig)[number] => Boolean(column));

  const canExportVisibleSupplierCsv = filteredSuppliers.length > 0 && visibleSupplierExportColumns.length > 0;
  const canExportAllSupplierCsv = filteredSuppliers.length > 0;

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

  function exportSuppliersToCsv(scope: 'visible' | 'all') {
    const scopedColumns = scope === 'all' ? supplierExportColumnsConfig : visibleSupplierExportColumns;
    if (filteredSuppliers.length === 0 || scopedColumns.length === 0) return;

    const rows = filteredSuppliers.map((supplier) => scopedColumns.map((column) => column.value(supplier)));
    const header = scopedColumns.map((column) => column.label);
    const csvContent = [header, ...rows].map((row) => row.map((cell) => csvEscape(cell)).join(',')).join('\n');
    const utf8Bom = '\uFEFF';
    const blob = new Blob([utf8Bom, csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const exportedAtIso = new Date().toISOString();
    const exportDateStamp = exportedAtIso.slice(0, 10);
    const exportTimeStamp = exportedAtIso.slice(11, 19).replace(/:/g, '-');
    const localeStamp = locale.replace(/[^a-zA-Z0-9-]/g, '-');
    const scopeStamp = `${filteredSuppliers.length}-of-${suppliers.length}`;
    const columnStamp = scope === 'all' ? 'all-columns' : 'visible-columns';
    link.href = url;
    link.download = `${t(locale, 'suppliers.exportFilenamePrefix')}-${localeStamp}-${exportDateStamp}_${exportTimeStamp}-${scopeStamp}-${columnStamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function renderDetailTabs() {
    return (
      <div className="profile-shell">
        <aside className="profile-tabs">
          <button type="button" className={`profile-tab-btn ${activeTab === 'classification' ? 'active' : ''}`} onClick={() => setActiveTab('classification')}>{t(locale, 'suppliers.tabs.classification')}</button>
          <button type="button" className={`profile-tab-btn ${activeTab === 'contractRates' ? 'active' : ''}`} onClick={() => setActiveTab('contractRates')}>{t(locale, 'suppliers.tabs.contractRates')}</button>
          <button type="button" className={`profile-tab-btn ${activeTab === 'operations' ? 'active' : ''}`} onClick={() => setActiveTab('operations')}>{t(locale, 'suppliers.tabs.operations')}</button>
          <button type="button" className={`profile-tab-btn ${activeTab === 'performance' ? 'active' : ''}`} onClick={() => setActiveTab('performance')}>{t(locale, 'suppliers.tabs.performance')}</button>
          <button type="button" className={`profile-tab-btn ${activeTab === 'recentBookings' ? 'active' : ''}`} onClick={() => setActiveTab('recentBookings')}>{t(locale, 'suppliers.tabs.recentBookings')}</button>
        </aside>
        <div>
          {activeTab === 'classification' && selectedSupplier ? (
            <div className="sub-card">
              <h3>{t(locale, 'suppliers.tabs.classification')}</h3>
              <p><strong>{t(locale, 'suppliers.tableName')}:</strong> {selectedSupplier.name}</p>
              <p><strong>{t(locale, 'suppliers.fieldTradeName')}:</strong> {selectedSupplier.tradeName || '—'}</p>
              <p><strong>{t(locale, 'suppliers.tableType')}:</strong> {supplierOptionLabel('labels.supplierType', selectedSupplier.type)}</p>
              <p><strong>{t(locale, 'suppliers.fieldServiceModel')}:</strong> {selectedSupplier.serviceModel ? supplierOptionLabel('labels.supplierServiceModel', selectedSupplier.serviceModel) : '—'}</p>
              <p><strong>{t(locale, 'suppliers.fieldMarketFocus')}:</strong> {formatMarketFocus(selectedSupplier.marketFocusTags)}</p>
              <p><strong>{t(locale, 'suppliers.fieldTierLevel')}:</strong> {selectedSupplier.tierLevel ? supplierOptionLabel('labels.supplierTierLevel', selectedSupplier.tierLevel) : '—'}</p>
            </div>
          ) : null}

          {activeTab === 'contractRates' && selectedSupplier ? (
            <div className="sub-card">
              <h3>{t(locale, 'suppliers.tabs.contractRates')}</h3>
              <p><strong>{t(locale, 'suppliers.fieldCommissionType')}:</strong> {supplierOptionLabel('labels.supplierCommissionType', selectedSupplier.commissionType)}</p>
              <p><strong>{t(locale, 'suppliers.fieldCommissionRate')}:</strong> {selectedSupplier.commissionRate}</p>
              <p><strong>{t(locale, 'suppliers.fieldPayoutTerms')}:</strong> {supplierOptionLabel('labels.supplierPayoutTerm', selectedSupplier.payoutTerms)}</p>
              <p><strong>{t(locale, 'suppliers.fieldContractExpiryDate')}:</strong> {selectedSupplier.contractExpiryDate || '—'}</p>
              {isContractExpirySoon(selectedSupplier.contractExpiryDate) ? <p className="muted">{t(locale, 'suppliers.contractExpiryAlert')}</p> : null}
              <p><strong>{t(locale, 'suppliers.fieldBlackoutDates')}:</strong> {selectedSupplier.blackoutDates || '—'}</p>
            </div>
          ) : null}

          {activeTab === 'operations' && selectedSupplier ? (
            <div className="sub-card">
              <h3>{t(locale, 'suppliers.tabs.operations')}</h3>
              <p><strong>{t(locale, 'suppliers.fieldRfc')}:</strong> {selectedSupplier.rfc || '—'}</p>
              <p><strong>{t(locale, 'suppliers.fieldBillingAddress')}:</strong> {selectedSupplier.billingAddress || '—'}</p>
              <p><strong>{t(locale, 'suppliers.fieldCurrency')}:</strong> {supplierOptionLabel('labels.currency', selectedSupplier.defaultCurrency)}</p>
              <p><strong>{t(locale, 'suppliers.fieldEmergencyContactName')}:</strong> {selectedSupplier.emergencyContactName || '—'}</p>
              <p><strong>{t(locale, 'suppliers.fieldEmergencyContactPhone')}:</strong> {selectedSupplier.emergencyContactPhone || '—'}</p>
            </div>
          ) : null}

          {activeTab === 'performance' && selectedSupplier ? (
            <div className="sub-card">
              <h3>{t(locale, 'suppliers.tabs.performance')}</h3>
              <p><strong>{t(locale, 'suppliers.fieldInternalRating')}:</strong> {selectedSupplier.internalRating ?? '—'} / 5</p>
              <p><strong>{t(locale, 'suppliers.fieldResponseTimeScore')}:</strong> {selectedSupplier.responseTimeScore ?? '—'}</p>
              <p><strong>{t(locale, 'suppliers.fieldInternalRiskFlag')}:</strong> {supplierOptionLabel('labels.supplierRiskFlag', selectedSupplier.internalRiskFlag)}</p>

              <h4>{t(locale, 'suppliers.incidentLogTitle')}</h4>
              <div className="profile-grid-2">
                <div className="field"><label>{t(locale, 'suppliers.fieldIncidentDate')}</label><input type="date" value={incidentForm.occurredAt} onChange={(event) => setIncidentForm((prev) => ({ ...prev, occurredAt: event.target.value }))} /></div>
                <div className="field"><label>{t(locale, 'suppliers.fieldIncidentClient')}</label><input value={incidentForm.clientName} onChange={(event) => setIncidentForm((prev) => ({ ...prev, clientName: event.target.value }))} /></div>
              </div>
              <div className="profile-grid-2">
                <div className="field"><label>{t(locale, 'suppliers.fieldIncidentSeverity')}</label><select value={incidentForm.severity} onChange={(event) => setIncidentForm((prev) => ({ ...prev, severity: event.target.value as 'low' | 'medium' | 'high' }))}>{list(locale, 'options.supplierIncidentSeverity').map((option) => <option key={option} value={option}>{supplierOptionLabel('labels.supplierIncidentSeverity', option)}</option>)}</select></div>
                <div className="field"><label>{t(locale, 'suppliers.fieldIncidentSummary')}</label><input value={incidentForm.summary} onChange={(event) => setIncidentForm((prev) => ({ ...prev, summary: event.target.value }))} /></div>
              </div>
              <div className="btn-row">
                <button type="button" onClick={submitIncident}>{t(locale, 'suppliers.addIncident')}</button>
              </div>

              {supplierIncidents.length === 0 ? <p className="muted">{t(locale, 'suppliers.noIncidents')}</p> : (
                <table>
                  <thead>
                    <tr>
                      <th>{t(locale, 'suppliers.fieldIncidentDate')}</th>
                      <th>{t(locale, 'suppliers.fieldIncidentClient')}</th>
                      <th>{t(locale, 'suppliers.fieldIncidentSeverity')}</th>
                      <th>{t(locale, 'suppliers.fieldIncidentSummary')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {supplierIncidents.map((incident) => (
                      <tr key={incident.id}>
                        <td>{incident.occurredAt.slice(0, 10)}</td>
                        <td>{incident.clientName || '—'}</td>
                        <td>{supplierOptionLabel('labels.supplierIncidentSeverity', incident.severity)}</td>
                        <td>{incident.summary}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ) : null}

          {activeTab === 'recentBookings' ? (
            <div className="sub-card">
              <h3>{t(locale, 'suppliers.tabs.recentBookings')}</h3>
              {supplierRecentBookings.length === 0 ? <p className="muted">{t(locale, 'suppliers.noRecentBookings')}</p> : (
                <table>
                  <thead>
                    <tr>
                      <th>{t(locale, 'suppliers.fieldBookingClient')}</th>
                      <th>{t(locale, 'suppliers.fieldBookingItinerary')}</th>
                      <th>{t(locale, 'suppliers.fieldBookingStatus')}</th>
                      <th>{t(locale, 'suppliers.fieldBookingDates')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {supplierRecentBookings.map((booking) => (
                      <tr key={`${booking.itineraryId}-${booking.clientId}`}>
                        <td>{booking.clientName}</td>
                        <td>{booking.itineraryTitle}</td>
                        <td>{humanizeRawValue(booking.itineraryStatus)} / {humanizeRawValue(booking.commissionStatus)}</td>
                        <td>{booking.startDate || '—'} {booking.endDate ? `→ ${booking.endDate}` : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  function renderCreateTabs() {
    return (
      <div className="profile-shell">
        <aside className="profile-tabs">
          <button type="button" className={`profile-tab-btn ${activeTab === 'classification' ? 'active' : ''}`} onClick={() => setActiveTab('classification')}>{t(locale, 'suppliers.tabs.classification')}</button>
          <button type="button" className={`profile-tab-btn ${activeTab === 'contractRates' ? 'active' : ''}`} onClick={() => setActiveTab('contractRates')}>{t(locale, 'suppliers.tabs.contractRates')}</button>
          <button type="button" className={`profile-tab-btn ${activeTab === 'operations' ? 'active' : ''}`} onClick={() => setActiveTab('operations')}>{t(locale, 'suppliers.tabs.operations')}</button>
          <button type="button" className={`profile-tab-btn ${activeTab === 'performance' ? 'active' : ''}`} onClick={() => setActiveTab('performance')}>{t(locale, 'suppliers.tabs.performance')}</button>
        </aside>
        <div>
          {activeTab === 'classification' ? (
            <div className="sub-card">
              <h3>{t(locale, 'suppliers.tabs.classification')}</h3>
              <div className="field"><label>{t(locale, 'suppliers.tableName')}</label><input value={supplierForm.name} onChange={(event) => onSupplierFormChange((prev) => ({ ...prev, name: event.target.value }))} /></div>
              <div className="field"><label>{t(locale, 'suppliers.fieldTradeName')}</label><input value={supplierForm.tradeName} onChange={(event) => onSupplierFormChange((prev) => ({ ...prev, tradeName: event.target.value }))} /></div>
              <div className="profile-grid-2">
                <div className="field"><label>{t(locale, 'suppliers.tableType')}</label><select value={supplierForm.type} onChange={(event) => onSupplierFormChange((prev) => ({ ...prev, type: event.target.value }))}>{list(locale, 'options.supplierTypes').map((option) => <option key={option} value={option}>{supplierOptionLabel('labels.supplierType', option)}</option>)}</select></div>
                <div className="field"><label>{t(locale, 'suppliers.fieldServiceModel')}</label><select value={supplierForm.serviceModel} onChange={(event) => onSupplierFormChange((prev) => ({ ...prev, serviceModel: event.target.value }))}>{list(locale, 'options.supplierServiceModel').map((option) => <option key={option} value={option}>{supplierOptionLabel('labels.supplierServiceModel', option)}</option>)}</select></div>
              </div>
              <div className="profile-grid-2">
                <div className="field"><label>{t(locale, 'suppliers.fieldTierLevel')}</label><select value={supplierForm.tierLevel} onChange={(event) => onSupplierFormChange((prev) => ({ ...prev, tierLevel: event.target.value }))}>{list(locale, 'options.supplierTierLevels').map((option) => <option key={option} value={option}>{supplierOptionLabel('labels.supplierTierLevel', option)}</option>)}</select></div>
                <div className="field"><label>{t(locale, 'suppliers.tableStatus')}</label><select value={supplierForm.status} onChange={(event) => onSupplierFormChange((prev) => ({ ...prev, status: event.target.value }))}>{list(locale, 'options.supplierStatus').map((option) => <option key={option} value={option}>{supplierOptionLabel('labels.supplierStatus', option)}</option>)}</select></div>
              </div>
              <div className="field"><label>{t(locale, 'suppliers.fieldMarketFocus')}</label><input value={supplierForm.marketFocusTags.join(', ')} onChange={(event) => onSupplierFormChange((prev) => ({ ...prev, marketFocusTags: parseMarketFocusInput(event.target.value) }))} placeholder={t(locale, 'suppliers.marketFocusPlaceholder')} /></div>
            </div>
          ) : null}

          {activeTab === 'contractRates' ? (
            <div className="sub-card">
              <h3>{t(locale, 'suppliers.tabs.contractRates')}</h3>
              <div className="profile-grid-2">
                <div className="field"><label>{t(locale, 'suppliers.fieldCommissionType')}</label><select value={supplierForm.commissionType} onChange={(event) => onSupplierFormChange((prev) => ({ ...prev, commissionType: event.target.value }))}>{list(locale, 'options.supplierCommissionTypes').map((option) => <option key={option} value={option}>{supplierOptionLabel('labels.supplierCommissionType', option)}</option>)}</select></div>
                <div className="field"><label>{t(locale, 'suppliers.fieldCommissionRate')}</label><input type="number" min={0} value={supplierForm.commissionRate} onChange={(event) => onSupplierFormChange((prev) => ({ ...prev, commissionRate: Number(event.target.value) || 0 }))} /></div>
              </div>
              <div className="profile-grid-2">
                <div className="field"><label>{t(locale, 'suppliers.fieldPayoutTerms')}</label><select value={supplierForm.payoutTerms} onChange={(event) => onSupplierFormChange((prev) => ({ ...prev, payoutTerms: event.target.value }))}>{list(locale, 'options.supplierPayoutTerms').map((option) => <option key={option} value={option}>{supplierOptionLabel('labels.supplierPayoutTerm', option)}</option>)}</select></div>
                <div className="field"><label>{t(locale, 'suppliers.fieldContractExpiryDate')}</label><input type="date" value={supplierForm.contractExpiryDate} onChange={(event) => onSupplierFormChange((prev) => ({ ...prev, contractExpiryDate: event.target.value }))} /></div>
              </div>
              <div className="field"><label>{t(locale, 'suppliers.fieldBlackoutDates')}</label><textarea value={supplierForm.blackoutDates} onChange={(event) => onSupplierFormChange((prev) => ({ ...prev, blackoutDates: event.target.value }))} /></div>
            </div>
          ) : null}

          {activeTab === 'operations' ? (
            <div className="sub-card">
              <h3>{t(locale, 'suppliers.tabs.operations')}</h3>
              <div className="field"><label>{t(locale, 'suppliers.fieldRfc')}</label><input value={supplierForm.rfc} onChange={(event) => onSupplierFormChange((prev) => ({ ...prev, rfc: event.target.value }))} /></div>
              <div className="field"><label>{t(locale, 'suppliers.fieldBillingAddress')}</label><textarea value={supplierForm.billingAddress} onChange={(event) => onSupplierFormChange((prev) => ({ ...prev, billingAddress: event.target.value }))} /></div>
              <div className="profile-grid-2">
                <div className="field"><label>{t(locale, 'suppliers.fieldCurrency')}</label><select value={supplierForm.defaultCurrency} onChange={(event) => onSupplierFormChange((prev) => ({ ...prev, defaultCurrency: event.target.value as 'MXN' | 'USD' | 'EUR' }))}>{list(locale, 'options.currency').map((option) => <option key={option} value={option}>{supplierOptionLabel('labels.currency', option)}</option>)}</select></div>
                <div className="field"><label>{t(locale, 'suppliers.fieldInternalRiskFlag')}</label><select value={supplierForm.internalRiskFlag} onChange={(event) => onSupplierFormChange((prev) => ({ ...prev, internalRiskFlag: event.target.value }))}>{list(locale, 'options.supplierRiskFlags').map((option) => <option key={option} value={option}>{supplierOptionLabel('labels.supplierRiskFlag', option)}</option>)}</select></div>
              </div>
              <div className="profile-grid-2">
                <div className="field"><label>{t(locale, 'suppliers.fieldEmergencyContactName')}</label><input value={supplierForm.emergencyContactName} onChange={(event) => onSupplierFormChange((prev) => ({ ...prev, emergencyContactName: event.target.value }))} /></div>
                <div className="field"><label>{t(locale, 'suppliers.fieldEmergencyContactPhone')}</label><input value={supplierForm.emergencyContactPhone} onChange={(event) => onSupplierFormChange((prev) => ({ ...prev, emergencyContactPhone: event.target.value }))} /></div>
              </div>
            </div>
          ) : null}

          {activeTab === 'performance' ? (
            <div className="sub-card">
              <h3>{t(locale, 'suppliers.tabs.performance')}</h3>
              <div className="profile-grid-2">
                <div className="field"><label>{t(locale, 'suppliers.fieldInternalRating')}</label><input type="number" min={1} max={5} value={supplierForm.internalRating} onChange={(event) => onSupplierFormChange((prev) => ({ ...prev, internalRating: Math.min(5, Math.max(1, Number(event.target.value) || 1)) }))} /></div>
                <div className="field"><label>{t(locale, 'suppliers.fieldResponseTimeScore')}</label><input type="number" min={0} max={100} value={supplierForm.responseTimeScore} onChange={(event) => onSupplierFormChange((prev) => ({ ...prev, responseTimeScore: Math.min(100, Math.max(0, Number(event.target.value) || 0)) }))} /></div>
              </div>
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
        <div className="btn-row"><button type="button" className="ghost" onClick={() => setActivePage('list')}>{t(locale, 'common.actions.backToList')}</button></div>
        {selectedSupplier ? renderDetailTabs() : <p className="muted">{t(locale, 'common.selectRow')}</p>}
        <pre className="result">{supplierResult}</pre>
      </section>
    );
  }

  if (activePage === 'create') {
    return (
      <section className="card">
        <h2>{t(locale, 'suppliers.createTitle')}</h2>
        {renderCreateTabs()}
        <div className="btn-row">
          <button type="button" onClick={onSaveSupplier}>{t(locale, 'suppliers.createButton')}</button>
          <button type="button" className="ghost" onClick={() => { onCancelEditSupplier(); setActivePage('list'); }}>{t(locale, 'common.actions.cancel')}</button>
        </div>
        <pre className="result">{supplierResult}</pre>
      </section>
    );
  }

  return (
    <section className="card">
      <div className="leads-list-header">
        <h2>{t(locale, 'suppliers.tableTitle')} › {supplierScopeLabel}</h2>
        <div className="leads-list-header-actions">
          <span className="leads-list-count">{filteredSuppliers.length} {t(locale, 'suppliers.tableTitle').toLowerCase()}</span>
          <div className="icon-menu-wrap" ref={supplierExportMenuRef}>
            <button
              ref={supplierExportToggleRef}
              type="button"
              className="ghost icon-btn"
              onClick={() => setShowSupplierExportMenu((previous) => !previous)}
              aria-label={t(locale, 'suppliers.exportVisible')}
              aria-expanded={showSupplierExportMenu}
              title={t(locale, 'suppliers.exportVisible')}
            >
              ⬇
            </button>
            {showSupplierExportMenu ? (
              <div className="icon-menu">
                <button type="button" className="ghost icon-menu-item" onClick={() => { exportSuppliersToCsv('visible'); setShowSupplierExportMenu(false); }} disabled={!canExportVisibleSupplierCsv}>
                  {t(locale, 'suppliers.exportVisible')}
                </button>
                <button type="button" className="ghost icon-menu-item" onClick={() => { exportSuppliersToCsv('all'); setShowSupplierExportMenu(false); }} disabled={!canExportAllSupplierCsv}>
                  {t(locale, 'suppliers.exportAll')}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <div className="btn-row leads-actions-row list-primary-toolbar">
        <input
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') {
              if (filteredSuppliers.length === 0) return;
              event.preventDefault();
              focusFirstSupplierRowAction();
              return;
            }
            if (event.key === 'Enter') {
              if (filteredSuppliers.length === 0) return;
              event.preventDefault();
              onViewSupplier(filteredSuppliers[0].id);
              setActivePage('detail');
              return;
            }
            if (event.key !== 'Escape') return;
            if (!searchTerm.trim()) return;
            setSearchTerm('');
          }}
          placeholder={t(locale, 'common.searchPlaceholder')}
        />
        <button
          type="button"
          onClick={() => {
            onStartCreateSupplier();
            setActiveTab('classification');
            setActivePage('create');
          }}
        >
          {t(locale, 'common.actions.addNew')}
        </button>
        <div className="icon-menu-wrap view-menu-wrap" ref={supplierViewMenuRef}>
          <button
            ref={supplierViewToggleRef}
            type="button"
            className="ghost view-menu-toggle"
            onClick={() => setShowSupplierViewMenu((previous) => !previous)}
            aria-expanded={showSupplierViewMenu}
          >
            {`${t(locale, 'suppliers.viewLabel')}: ${supplierScopeLabel} (${filteredSuppliers.length})`}
          </button>
          {showSupplierViewMenu ? (
            <div className="icon-menu view-menu">
              <button type="button" className="ghost icon-menu-item" onClick={() => { setSupplierListScope('active'); setShowSupplierViewMenu(false); }}>
                <span className="menu-item-check" aria-hidden="true">{supplierListScope === 'active' ? '✓' : ''}</span>
                <span className="menu-item-label">{`${t(locale, 'suppliers.scopeActive')} (${supplierScopeCounts.active})`}</span>
              </button>
              <button type="button" className="ghost icon-menu-item" onClick={() => { setSupplierListScope('archived'); setShowSupplierViewMenu(false); }}>
                <span className="menu-item-check" aria-hidden="true">{supplierListScope === 'archived' ? '✓' : ''}</span>
                <span className="menu-item-label">{`${t(locale, 'suppliers.scopeArchived')} (${supplierScopeCounts.archived})`}</span>
              </button>
              <button type="button" className="ghost icon-menu-item" onClick={() => { setSupplierListScope('all'); setShowSupplierViewMenu(false); }}>
                <span className="menu-item-check" aria-hidden="true">{supplierListScope === 'all' ? '✓' : ''}</span>
                <span className="menu-item-label">{`${t(locale, 'suppliers.scopeAll')} (${supplierScopeCounts.all})`}</span>
              </button>
            </div>
          ) : null}
        </div>
        <button
          ref={supplierMoreFiltersToggleRef}
          type="button"
          className="ghost"
          onClick={() => setShowSupplierMoreFilters((previous) => !previous)}
          aria-expanded={showSupplierMoreFilters}
        >
          {showSupplierMoreFilters ? t(locale, 'common.actions.lessFilters') : `${t(locale, 'common.actions.moreFilters')}${activeSummaryChips.length > 0 ? ` (${activeSummaryChips.length})` : ''}`}
        </button>
      </div>
      {showSupplierMoreFilters ? (
        <div ref={supplierMoreFiltersPanelRef} className="list-secondary-panel">
          <div className="btn-row list-secondary-header">
            <button type="button" className="ghost" onClick={onRefreshSuppliers}>{t(locale, 'common.actions.refresh')}</button>
            <button type="button" className="ghost" onClick={() => setActiveQueuePreset(null)} disabled={!activeQueuePreset}>{t(locale, 'suppliers.clearQueue')}</button>
            <button type="button" className="ghost" onClick={() => setSearchTerm('')} disabled={!searchTerm.trim()}>{t(locale, 'suppliers.clearSearch')}</button>
            <button type="button" className="ghost" onClick={() => { setSupplierListScope('active'); setActiveQueuePreset(null); setSearchTerm(''); }}>{t(locale, 'suppliers.resetFilters')}</button>
          </div>
          <div className="btn-row leads-quick-filters">
            <button
              type="button"
              className={activeQueuePreset === 'blacklisted' ? 'secondary' : 'ghost'}
              aria-pressed={activeQueuePreset === 'blacklisted'}
              onClick={() => setActiveQueuePreset((prev) => (prev === 'blacklisted' ? null : 'blacklisted'))}
            >
              {t(locale, 'suppliers.blacklistedQueue')} ({blacklistedCount})
            </button>
            <button
              type="button"
              className={activeQueuePreset === 'highRisk' ? 'secondary' : 'ghost'}
              aria-pressed={activeQueuePreset === 'highRisk'}
              onClick={() => setActiveQueuePreset((prev) => (prev === 'highRisk' ? null : 'highRisk'))}
            >
              {t(locale, 'suppliers.highRiskQueue')} ({highRiskCount})
            </button>
            <button
              type="button"
              className={activeQueuePreset === 'lowPerformance' ? 'secondary' : 'ghost'}
              aria-pressed={activeQueuePreset === 'lowPerformance'}
              onClick={() => setActiveQueuePreset((prev) => (prev === 'lowPerformance' ? null : 'lowPerformance'))}
            >
              {t(locale, 'suppliers.lowPerformanceQueue')} ({lowPerformanceCount})
            </button>
            <button
              type="button"
              className={activeQueuePreset === 'expiringContracts' ? 'secondary' : 'ghost'}
              aria-pressed={activeQueuePreset === 'expiringContracts'}
              onClick={() => setActiveQueuePreset((prev) => (prev === 'expiringContracts' ? null : 'expiringContracts'))}
            >
              {t(locale, 'suppliers.expiryQueue')} ({expiringCount})
            </button>
          </div>
        </div>
      ) : null}
      {activeSummaryChips.length > 0 ? (
        <div className="leads-active-summary">
          <div className="leads-active-summary-header">
            <span className="muted leads-active-summary-label">{t(locale, 'suppliers.activeSummaryTitle')}</span>
            <div className="btn-row">
              <button type="button" className="ghost" onClick={() => setActiveQueuePreset(null)} disabled={!activeQueuePreset}>{t(locale, 'suppliers.clearQueue')}</button>
              <button type="button" className="ghost" onClick={() => setSearchTerm('')} disabled={!searchTerm.trim()}>{t(locale, 'suppliers.clearSearch')}</button>
              <button type="button" className="ghost" onClick={() => { setSupplierListScope('active'); setActiveQueuePreset(null); setSearchTerm(''); }}>
                {t(locale, 'suppliers.activeSummaryReset')}
              </button>
            </div>
          </div>
          <div className="leads-active-summary-chips">
            {activeSummaryChips.map((chip) => (
              <button key={chip.id} type="button" className="leads-summary-chip" aria-label={`${t(locale, 'suppliers.activeSummaryRemoveFilter')}: ${chip.label}`} onClick={chip.onClick}>
                {chip.label} ×
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <p className="muted leads-scope-count">{t(locale, 'suppliers.scopeCount').replace('{visible}', String(filteredSuppliers.length)).replace('{total}', String(suppliers.length))}</p>
      <div className="leads-grid-layout">
        <div className="leads-grid-main">
          <table ref={suppliersTableRef} className="leads-grid-table">
            <thead>
              <tr>
                {selectedSupplierListColumns.map((column) => <th key={column.key}>{column.label}</th>)}
                <th>
                  <div className="table-header-actions">
                    <span>{t(locale, 'common.tableAction')}</span>
                    <button
                      ref={supplierColumnsToggleRef}
                      type="button"
                      className="ghost icon-btn table-header-gear"
                      onClick={() => setShowSupplierColumnsPanel((previous) => !previous)}
                      aria-pressed={showSupplierColumnsPanel}
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
              {filteredSuppliers.length === 0 ? <tr><td colSpan={selectedSupplierListColumns.length + 1}>{t(locale, 'suppliers.empty')}</td></tr> : filteredSuppliers.map((supplier) => (
                <tr key={supplier.id} className={`clickable-row ${selectedSupplierId === supplier.id ? 'selected' : ''}`} onClick={() => { onViewSupplier(supplier.id); setActivePage('detail'); }}>
                  {selectedSupplierListColumns.map((column) => (
                    <Fragment key={`${supplier.id}-${column.key}`}>
                      {column.cell(supplier)}
                    </Fragment>
                  ))}
                  <td>
                <div className="btn-row table-actions">
                  <button type="button" className="ghost" onClick={(event) => { event.stopPropagation(); onViewSupplier(supplier.id); setActivePage('detail'); }}>
                    {t(locale, 'common.actions.view')}
                  </button>
                  {pendingDeleteSupplierId === supplier.id ? (
                    <>
                      <button type="button" className="secondary" onClick={(event) => { event.stopPropagation(); onDeleteSupplier(supplier.id); }}>
                        {t(locale, 'common.actions.confirmDelete')}
                      </button>
                      <button type="button" className="ghost" onClick={(event) => { event.stopPropagation(); onCancelDeleteSupplier(); }}>
                        {t(locale, 'common.actions.cancel')}
                      </button>
                    </>
                  ) : (
                    <button type="button" className="ghost" onClick={(event) => { event.stopPropagation(); onRequestDeleteSupplier(supplier.id); }}>
                      {t(locale, 'common.actions.delete')}
                    </button>
                  )}
                </div>
                {deleteSupplierError?.id === supplier.id ? (
                  <div className="inline-delete-error">
                    <div>{deleteSupplierError.message}</div>
                    <button type="button" className="secondary" onClick={(event) => { event.stopPropagation(); onForceDeleteSupplier(supplier.id); }}>
                      {t(locale, 'common.actions.deleteAll')}
                    </button>
                  </div>
                ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <aside
          ref={supplierColumnsPanelRef}
          className={`leads-columns-panel ${showSupplierColumnsPanel ? 'is-open' : 'is-closed'}`}
          aria-hidden={!showSupplierColumnsPanel}
        >
            <div className="leads-columns-panel-header">
              <strong>{t(locale, 'common.visibleColumns')}</strong>
              <button type="button" className="ghost" onClick={() => setShowSupplierColumnsPanel(false)}>{t(locale, 'common.actions.cancel')}</button>
            </div>
            <input
              value={supplierColumnsFilterTerm}
              onChange={(event) => setSupplierColumnsFilterTerm(event.target.value)}
              placeholder={t(locale, 'common.searchPlaceholder')}
            />
            <div className="btn-row">
              <button type="button" className="ghost" onClick={() => setSupplierListColumns([...defaultSupplierListColumns])}>{t(locale, 'common.actions.resetDefaults')}</button>
              <button type="button" className="ghost" onClick={() => setAllSupplierColumnGroupsExpanded(true)}>{t(locale, 'common.actions.expandAll')}</button>
              <button type="button" className="ghost" onClick={() => setAllSupplierColumnGroupsExpanded(false)}>{t(locale, 'common.actions.collapseAll')}</button>
            </div>
            <div className="checkbox-grid">
              <details className="column-group selected-column-group" open>
                <summary className="column-group-title">{t(locale, 'common.columnGroups.selected')}</summary>
                <p className="selected-column-hint muted">{t(locale, 'common.visibleColumnsReorderHint')}</p>
                {selectedSupplierOverlayColumns.map((column, index) => (
                  <div
                    key={`selected-${column.key}`}
                    className="leads-column-item is-selected is-draggable"
                    style={{ justifyContent: 'space-between' }}
                    draggable
                    tabIndex={0}
                    onDragStart={() => setDraggedSupplierColumnKey(column.key)}
                    onDragEnd={() => setDraggedSupplierColumnKey(null)}
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
                      moveSupplierListColumn(column.key, moveUpShortcut ? 'up' : 'down');
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      if (!draggedSupplierColumnKey || draggedSupplierColumnKey === column.key) return;
                      reorderSupplierListColumn(draggedSupplierColumnKey, column.key);
                    }}
                  >
                    <span className="selected-column-order" aria-label={`Order ${index + 1}`}>{index + 1}</span>
                    <label>
                      <input
                        type="checkbox"
                        checked
                        onChange={() => toggleSupplierListColumn(column.key)}
                        disabled={supplierListColumns.length <= 1}
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
                          moveSupplierListColumn(column.key, 'up');
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
                          moveSupplierListColumn(column.key, 'down');
                        }}
                        disabled={index === selectedSupplierOverlayColumns.length - 1}
                      >
                        ↓
                      </button>
                      <span className="muted" aria-hidden="true">↕</span>
                    </div>
                  </div>
                ))}
              </details>
              {groupedFilteredSupplierColumns.map((entry) => (
                <details
                  key={entry.group}
                  className="column-group"
                  open={supplierColumnGroupsExpanded[entry.group]}
                  onToggle={(event) => setSupplierColumnGroupExpanded(entry.group, event.currentTarget.open)}
                >
                  <summary className="column-group-title">{supplierColumnGroupLabels[entry.group]}</summary>
                  {entry.columns.map((column) => {
                    const isSelected = supplierListColumns.includes(column.key);
                    return (
                      <div
                        key={column.key}
                        className={`leads-column-item ${isSelected ? 'is-selected' : ''}`}
                      >
                        <label>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSupplierListColumn(column.key)}
                            disabled={isSelected && supplierListColumns.length <= 1}
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
