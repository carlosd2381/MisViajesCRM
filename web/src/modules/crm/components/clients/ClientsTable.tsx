import { t } from '../../i18n';
import { CLIENTS_LIST_ALL_COLUMNS, CLIENTS_LIST_DEFAULT_COLUMNS, type ClientListColumnKey } from '../../list-column-defaults';
import type { Client, Locale } from '../../types';
import { loadViewPrefs, saveViewPrefs } from '../../view-prefs';
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';

interface ClientsTableProps {
  locale: Locale;
  clients: Client[];
  totalClientsCount: number;
  clientListScope: 'researching' | 'quoted' | 'deposit_paid' | 'confirmed' | 'traveling' | 'returned' | 'closed' | 'all';
  onClientListScopeChange: (scope: 'researching' | 'quoted' | 'deposit_paid' | 'confirmed' | 'traveling' | 'returned' | 'closed' | 'all') => void;
  clientScopeCounts: {
    researching: number;
    quoted: number;
    depositPaid: number;
    confirmed: number;
    traveling: number;
    returned: number;
    closed: number;
    all: number;
  };
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  selectedClientId: string | null;
  pendingDeleteClientId: string | null;
  deleteClientError: { id: string; message: string } | null;
  onRefreshClients: () => void;
  onStartNewProfile: () => void;
  onViewClient: (clientId: string) => void;
  onRequestDeleteClient: (clientId: string) => void;
  onCancelDeleteClient: () => void;
  onDeleteClient: (clientId: string) => void;
  onForceDeleteClient: (clientId: string) => void;
}

export function ClientsTable({
  locale,
  clients,
  totalClientsCount,
  clientListScope,
  onClientListScopeChange,
  clientScopeCounts,
  searchTerm,
  onSearchTermChange,
  selectedClientId,
  pendingDeleteClientId,
  deleteClientError,
  onRefreshClients,
  onStartNewProfile,
  onViewClient,
  onRequestDeleteClient,
  onCancelDeleteClient,
  onDeleteClient,
  onForceDeleteClient,
}: ClientsTableProps) {
  type ClientColumnGroupKey = 'identity' | 'contact' | 'work' | 'profile' | 'ownership';
  type ClientsTablePrefs = {
    visibleColumns?: ClientListColumnKey[];
    columnGroupsExpanded?: Partial<Record<ClientColumnGroupKey, boolean>>;
  };
  const CLIENTS_TABLE_PREFS_KEY = 'misviajescrm.web.clients.tableprefs';
  const allClientListColumns: ClientListColumnKey[] = [...CLIENTS_LIST_ALL_COLUMNS];
  const defaultClientListColumns: ClientListColumnKey[] = [...CLIENTS_LIST_DEFAULT_COLUMNS];
  const clientColumnGroupKeys: ClientColumnGroupKey[] = ['identity', 'contact', 'work', 'profile', 'ownership'];

  function restoreVisibleColumns(): ClientListColumnKey[] {
    const prefs = loadViewPrefs<ClientsTablePrefs>(CLIENTS_TABLE_PREFS_KEY);
    const next = prefs?.visibleColumns;
    if (!Array.isArray(next)) return allClientListColumns;
    const allowedColumns = next.filter((column): column is ClientListColumnKey => allClientListColumns.includes(column));
    return allowedColumns.length > 0 ? allowedColumns : allClientListColumns;
  }

  function restoreColumnGroupsExpanded(): Record<ClientColumnGroupKey, boolean> {
    const defaults = Object.fromEntries(clientColumnGroupKeys.map((group) => [group, false])) as Record<ClientColumnGroupKey, boolean>;
    const prefs = loadViewPrefs<ClientsTablePrefs>(CLIENTS_TABLE_PREFS_KEY);
    const next = prefs?.columnGroupsExpanded;
    if (!next || typeof next !== 'object' || Array.isArray(next)) return defaults;

    const restored = { ...defaults };
    for (const group of clientColumnGroupKeys) {
      if (typeof next[group] === 'boolean') {
        restored[group] = next[group];
      }
    }
    return restored;
  }

  const [visibleColumns, setVisibleColumns] = useState<ClientListColumnKey[]>(restoreVisibleColumns);
  const [columnGroupsExpanded, setColumnGroupsExpanded] = useState<Record<ClientColumnGroupKey, boolean>>(restoreColumnGroupsExpanded);
  const [showColumnsPanel, setShowColumnsPanel] = useState(false);
  const [showClientExportMenu, setShowClientExportMenu] = useState(false);
  const [showClientViewMenu, setShowClientViewMenu] = useState(false);
  const [columnsFilterTerm, setColumnsFilterTerm] = useState('');
  const [draggedColumnKey, setDraggedColumnKey] = useState<ClientListColumnKey | null>(null);
  const columnsPanelRef = useRef<HTMLDivElement | null>(null);
  const columnsToggleRef = useRef<HTMLButtonElement | null>(null);
  const clientExportMenuRef = useRef<HTMLDivElement | null>(null);
  const clientExportToggleRef = useRef<HTMLButtonElement | null>(null);
  const clientViewMenuRef = useRef<HTMLDivElement | null>(null);
  const clientViewToggleRef = useRef<HTMLButtonElement | null>(null);

  function humanizeRawValue(value: string): string {
    return value
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  function contactMethodLabel(value: string): string {
    const key = `labels.contactMethod.${value}`;
    const translated = t(locale, key);
    return translated === key ? humanizeRawValue(value) : translated;
  }

  useEffect(() => {
    saveViewPrefs(CLIENTS_TABLE_PREFS_KEY, { visibleColumns, columnGroupsExpanded });
  }, [visibleColumns, columnGroupsExpanded]);

  useEffect(() => {
    if (!showColumnsPanel || typeof window === 'undefined') return;

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedInsidePanel = Boolean(columnsPanelRef.current?.contains(target));
      const clickedToggleButton = Boolean(columnsToggleRef.current?.contains(target));
      if (clickedInsidePanel || clickedToggleButton) return;
      setShowColumnsPanel(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setShowColumnsPanel(false);
    };

    window.addEventListener('mousedown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [showColumnsPanel]);

  useEffect(() => {
    if (!showClientExportMenu || typeof window === 'undefined') return;

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedInsideMenu = Boolean(clientExportMenuRef.current?.contains(target));
      const clickedToggleButton = Boolean(clientExportToggleRef.current?.contains(target));
      if (clickedInsideMenu || clickedToggleButton) return;
      setShowClientExportMenu(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setShowClientExportMenu(false);
    };

    window.addEventListener('mousedown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [showClientExportMenu]);

  useEffect(() => {
    if (!showClientViewMenu || typeof window === 'undefined') return;

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedInsideMenu = Boolean(clientViewMenuRef.current?.contains(target));
      const clickedToggleButton = Boolean(clientViewToggleRef.current?.contains(target));
      if (clickedInsideMenu || clickedToggleButton) return;
      setShowClientViewMenu(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setShowClientViewMenu(false);
    };

    window.addEventListener('mousedown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [showClientViewMenu]);

  function clientScopeLabel(scope: ClientsTableProps['clientListScope']): string {
    switch (scope) {
      case 'researching':
        return t(locale, 'clients.scopeResearching');
      case 'quoted':
        return t(locale, 'clients.scopeQuoted');
      case 'deposit_paid':
        return t(locale, 'clients.scopeDepositPaid');
      case 'confirmed':
        return t(locale, 'clients.scopeConfirmed');
      case 'traveling':
        return t(locale, 'clients.scopeTraveling');
      case 'returned':
        return t(locale, 'clients.scopeReturned');
      case 'closed':
        return t(locale, 'clients.scopeClosed');
      default:
        return t(locale, 'clients.scopeAll');
    }
  }

  const activeClientScopeLabel = clientScopeLabel(clientListScope);

  function toggleVisibleColumn(columnKey: ClientListColumnKey) {
    setVisibleColumns((previous) => {
      const isSelected = previous.includes(columnKey);
      if (isSelected) {
        if (previous.length <= 1) return previous;
        return previous.filter((key) => key !== columnKey);
      }
      return [columnKey, ...previous];
    });
  }

  function reorderVisibleColumn(fromColumnKey: ClientListColumnKey, toColumnKey: ClientListColumnKey) {
    setVisibleColumns((previous) => {
      const fromIndex = previous.indexOf(fromColumnKey);
      const toIndex = previous.indexOf(toColumnKey);
      if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return previous;
      const next = [...previous];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }

  function moveVisibleColumn(columnKey: ClientListColumnKey, direction: 'up' | 'down') {
    const currentIndex = visibleColumns.indexOf(columnKey);
    if (currentIndex === -1) return;
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= visibleColumns.length) return;
    const targetColumnKey = visibleColumns[targetIndex];
    reorderVisibleColumn(columnKey, targetColumnKey);
  }

  function setAllClientColumnGroupsExpanded(expanded: boolean) {
    setColumnGroupsExpanded((previous) => {
      const next = { ...previous };
      for (const group of clientColumnGroupKeys) {
        next[group] = expanded;
      }
      return next;
    });
  }

  function setClientColumnGroupExpanded(group: ClientColumnGroupKey, expanded: boolean) {
    setColumnGroupsExpanded((previous) => ({ ...previous, [group]: expanded }));
  }

  const clientsTableColumnsConfig = useMemo(() => [
    { key: 'id' as const, group: 'identity' as const, label: t(locale, 'common.tableId'), cell: (client: Client) => <td title={client.id}>{client.id.slice(0, 8)}</td> },
    { key: 'name' as const, group: 'identity' as const, label: t(locale, 'clients.tableName'), cell: (client: Client) => <td>{client.firstName} {client.paternalLastName}</td> },
    { key: 'firstName' as const, group: 'identity' as const, label: t(locale, 'clients.fields.firstName'), cell: (client: Client) => <td>{client.firstName || '—'}</td> },
    { key: 'paternalLastName' as const, group: 'identity' as const, label: t(locale, 'clients.fields.paternalLastName'), cell: (client: Client) => <td>{client.paternalLastName || '—'}</td> },
    { key: 'maternalLastName' as const, group: 'identity' as const, label: t(locale, 'clients.fields.maternalLastName'), cell: (client: Client) => <td>{client.maternalLastName || '—'}</td> },
    { key: 'leadOrigin' as const, group: 'ownership' as const, label: t(locale, 'clients.tableLeadOrigin'), cell: (client: Client) => <td>{client.leadId ? client.leadId.slice(0, 8) : t(locale, 'clients.manual')}</td> },
    { key: 'contact' as const, group: 'contact' as const, label: t(locale, 'clients.tableContact'), cell: (client: Client) => <td>{client.contacts?.[0]?.value ?? '—'}</td> },
    { key: 'email' as const, group: 'contact' as const, label: t(locale, 'leads.email'), cell: (client: Client) => <td>{client.contacts?.find((contact) => contact.type === 'email')?.value ?? '—'}</td> },
    { key: 'phone' as const, group: 'contact' as const, label: t(locale, 'leads.phone'), cell: (client: Client) => <td>{client.contacts?.find((contact) => contact.type === 'cell' || contact.type === 'home' || contact.type === 'office' || contact.type === 'whatsapp_primary')?.value ?? '—'}</td> },
    {
      key: 'preferredContactMethod' as const,
      group: 'contact' as const,
      label: t(locale, 'clients.fields.preferredContactMethod'),
      cell: (client: Client) => {
        const preferredContactMethod = client.travelPreferences?.preferredContactMethod;
        return <td>{typeof preferredContactMethod === 'string' && preferredContactMethod.trim() ? contactMethodLabel(preferredContactMethod) : '—'}</td>;
      }
    },
    { key: 'companyName' as const, group: 'work' as const, label: t(locale, 'clients.fields.company'), cell: (client: Client) => <td>{client.companyName || '—'}</td> },
    { key: 'jobTitle' as const, group: 'work' as const, label: t(locale, 'clients.fields.jobTitle'), cell: (client: Client) => <td>{client.jobTitle || '—'}</td> },
    { key: 'birthDate' as const, group: 'profile' as const, label: t(locale, 'clients.fields.birthDate'), cell: (client: Client) => <td>{client.birthDate || '—'}</td> },
  ], [locale]);

  const selectedColumns = visibleColumns
    .map((key) => clientsTableColumnsConfig.find((column) => column.key === key))
    .filter((column): column is (typeof clientsTableColumnsConfig)[number] => Boolean(column));

  const filteredColumnsConfig = clientsTableColumnsConfig.filter((column) => {
    const term = columnsFilterTerm.trim().toLowerCase();
    if (!term) return true;
    return column.label.toLowerCase().includes(term);
  });

  const clientsColumnGroupOrder = clientColumnGroupKeys;
  const clientsColumnGroupLabels: Record<(typeof clientsColumnGroupOrder)[number], string> = {
    identity: t(locale, 'common.columnGroups.identity'),
    contact: t(locale, 'common.columnGroups.contact'),
    work: t(locale, 'common.columnGroups.work'),
    profile: t(locale, 'common.columnGroups.profile'),
    ownership: t(locale, 'common.columnGroups.ownership'),
  };

  const groupedFilteredClientColumns = clientsColumnGroupOrder
    .map((group) => ({
      group,
      columns: filteredColumnsConfig.filter((column) => column.group === group)
    }))
    .filter((entry) => entry.columns.length > 0);

  const selectedClientOverlayColumns = visibleColumns
    .map((key) => clientsTableColumnsConfig.find((column) => column.key === key))
    .filter((column): column is (typeof clientsTableColumnsConfig)[number] => Boolean(column));

  const clientExportColumnsConfig = [
    { key: 'id' as const, label: t(locale, 'common.tableId'), value: (client: Client) => client.id },
    { key: 'name' as const, label: t(locale, 'clients.tableName'), value: (client: Client) => `${client.firstName} ${client.paternalLastName}`.trim() },
    { key: 'firstName' as const, label: t(locale, 'clients.fields.firstName'), value: (client: Client) => client.firstName ?? '' },
    { key: 'paternalLastName' as const, label: t(locale, 'clients.fields.paternalLastName'), value: (client: Client) => client.paternalLastName ?? '' },
    { key: 'maternalLastName' as const, label: t(locale, 'clients.fields.maternalLastName'), value: (client: Client) => client.maternalLastName ?? '' },
    { key: 'leadOrigin' as const, label: t(locale, 'clients.tableLeadOrigin'), value: (client: Client) => client.leadId ? client.leadId.slice(0, 8) : t(locale, 'clients.manual') },
    { key: 'contact' as const, label: t(locale, 'clients.tableContact'), value: (client: Client) => client.contacts?.[0]?.value ?? '' },
    { key: 'email' as const, label: t(locale, 'leads.email'), value: (client: Client) => client.contacts?.find((contact) => contact.type === 'email')?.value ?? '' },
    { key: 'phone' as const, label: t(locale, 'leads.phone'), value: (client: Client) => client.contacts?.find((contact) => contact.type === 'cell' || contact.type === 'home' || contact.type === 'office' || contact.type === 'whatsapp_primary')?.value ?? '' },
    {
      key: 'preferredContactMethod' as const,
      label: t(locale, 'clients.fields.preferredContactMethod'),
      value: (client: Client) => {
        const preferredContactMethod = client.travelPreferences?.preferredContactMethod;
        return typeof preferredContactMethod === 'string' && preferredContactMethod.trim() ? contactMethodLabel(preferredContactMethod) : '';
      }
    },
    { key: 'companyName' as const, label: t(locale, 'clients.fields.company'), value: (client: Client) => client.companyName ?? '' },
    { key: 'jobTitle' as const, label: t(locale, 'clients.fields.jobTitle'), value: (client: Client) => client.jobTitle ?? '' },
    { key: 'birthDate' as const, label: t(locale, 'clients.fields.birthDate'), value: (client: Client) => client.birthDate ?? '' },
  ];

  const visibleClientExportColumns = visibleColumns
    .map((key) => clientExportColumnsConfig.find((column) => column.key === key))
    .filter((column): column is (typeof clientExportColumnsConfig)[number] => Boolean(column));

  const canExportVisibleClientCsv = clients.length > 0 && visibleClientExportColumns.length > 0;
  const canExportAllClientCsv = clients.length > 0;

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

  function exportClientsToCsv(scope: 'visible' | 'all') {
    const scopedColumns = scope === 'all' ? clientExportColumnsConfig : visibleClientExportColumns;
    if (clients.length === 0 || scopedColumns.length === 0) return;

    const rows = clients.map((client) => scopedColumns.map((column) => column.value(client)));
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
    const scopeStamp = `${clients.length}-of-${totalClientsCount}`;
    const columnStamp = scope === 'all' ? 'all-columns' : 'visible-columns';
    link.href = url;
    link.download = `${t(locale, 'clients.exportFilenamePrefix')}-${localeStamp}-${exportDateStamp}_${exportTimeStamp}-${scopeStamp}-${columnStamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <section className="card">
      <div className="leads-list-header">
        <h2>{t(locale, 'clients.tableTitle')}</h2>
        <div className="leads-list-header-actions">
          <span className="leads-list-count">{clients.length} {t(locale, 'clients.tableTitle').toLowerCase()}</span>
          <div className="icon-menu-wrap" ref={clientExportMenuRef}>
            <button
              ref={clientExportToggleRef}
              type="button"
              className="ghost icon-btn"
              onClick={() => setShowClientExportMenu((previous) => !previous)}
              aria-label={t(locale, 'clients.exportVisible')}
              aria-expanded={showClientExportMenu}
              title={t(locale, 'clients.exportVisible')}
            >
              ⬇
            </button>
            {showClientExportMenu ? (
              <div className="icon-menu">
                <button type="button" className="ghost icon-menu-item" onClick={() => { exportClientsToCsv('visible'); setShowClientExportMenu(false); }} disabled={!canExportVisibleClientCsv}>
                  {t(locale, 'clients.exportVisible')}
                </button>
                <button type="button" className="ghost icon-menu-item" onClick={() => { exportClientsToCsv('all'); setShowClientExportMenu(false); }} disabled={!canExportAllClientCsv}>
                  {t(locale, 'clients.exportAll')}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <div className="btn-row leads-actions-row list-primary-toolbar">
        <input
          value={searchTerm}
          onChange={(event) => onSearchTermChange(event.target.value)}
          placeholder={t(locale, 'common.searchPlaceholder')}
        />
        <button type="button" onClick={onStartNewProfile}>{t(locale, 'common.actions.addNew')}</button>
        <div className="icon-menu-wrap view-menu-wrap" ref={clientViewMenuRef}>
          <button
            ref={clientViewToggleRef}
            type="button"
            className="ghost view-menu-toggle"
            onClick={() => setShowClientViewMenu((previous) => !previous)}
            aria-expanded={showClientViewMenu}
          >
            {`${t(locale, 'clients.viewLabel')}: ${activeClientScopeLabel} (${clients.length})`}
          </button>
          {showClientViewMenu ? (
            <div className="icon-menu view-menu">
              <button type="button" className="ghost icon-menu-item" onClick={() => { onClientListScopeChange('researching'); setShowClientViewMenu(false); }}>
                <span className="menu-item-check" aria-hidden="true">{clientListScope === 'researching' ? '✓' : ''}</span>
                <span className="menu-item-label">{`${t(locale, 'clients.scopeResearching')} (${clientScopeCounts.researching})`}</span>
              </button>
              <button type="button" className="ghost icon-menu-item" onClick={() => { onClientListScopeChange('quoted'); setShowClientViewMenu(false); }}>
                <span className="menu-item-check" aria-hidden="true">{clientListScope === 'quoted' ? '✓' : ''}</span>
                <span className="menu-item-label">{`${t(locale, 'clients.scopeQuoted')} (${clientScopeCounts.quoted})`}</span>
              </button>
              <button type="button" className="ghost icon-menu-item" onClick={() => { onClientListScopeChange('deposit_paid'); setShowClientViewMenu(false); }}>
                <span className="menu-item-check" aria-hidden="true">{clientListScope === 'deposit_paid' ? '✓' : ''}</span>
                <span className="menu-item-label">{`${t(locale, 'clients.scopeDepositPaid')} (${clientScopeCounts.depositPaid})`}</span>
              </button>
              <button type="button" className="ghost icon-menu-item" onClick={() => { onClientListScopeChange('confirmed'); setShowClientViewMenu(false); }}>
                <span className="menu-item-check" aria-hidden="true">{clientListScope === 'confirmed' ? '✓' : ''}</span>
                <span className="menu-item-label">{`${t(locale, 'clients.scopeConfirmed')} (${clientScopeCounts.confirmed})`}</span>
              </button>
              <button type="button" className="ghost icon-menu-item" onClick={() => { onClientListScopeChange('traveling'); setShowClientViewMenu(false); }}>
                <span className="menu-item-check" aria-hidden="true">{clientListScope === 'traveling' ? '✓' : ''}</span>
                <span className="menu-item-label">{`${t(locale, 'clients.scopeTraveling')} (${clientScopeCounts.traveling})`}</span>
              </button>
              <button type="button" className="ghost icon-menu-item" onClick={() => { onClientListScopeChange('returned'); setShowClientViewMenu(false); }}>
                <span className="menu-item-check" aria-hidden="true">{clientListScope === 'returned' ? '✓' : ''}</span>
                <span className="menu-item-label">{`${t(locale, 'clients.scopeReturned')} (${clientScopeCounts.returned})`}</span>
              </button>
              <button type="button" className="ghost icon-menu-item" onClick={() => { onClientListScopeChange('closed'); setShowClientViewMenu(false); }}>
                <span className="menu-item-check" aria-hidden="true">{clientListScope === 'closed' ? '✓' : ''}</span>
                <span className="menu-item-label">{`${t(locale, 'clients.scopeClosed')} (${clientScopeCounts.closed})`}</span>
              </button>
              <button type="button" className="ghost icon-menu-item" onClick={() => { onClientListScopeChange('all'); setShowClientViewMenu(false); }}>
                <span className="menu-item-check" aria-hidden="true">{clientListScope === 'all' ? '✓' : ''}</span>
                <span className="menu-item-label">{`${t(locale, 'clients.scopeAll')} (${clientScopeCounts.all})`}</span>
              </button>
            </div>
          ) : null}
        </div>
        <button type="button" className="ghost" onClick={onRefreshClients}>{t(locale, 'common.actions.refresh')}</button>
      </div>
      <p className="muted leads-scope-count">{t(locale, 'clients.scopeCount').replace('{visible}', String(clients.length)).replace('{total}', String(totalClientsCount))}</p>
      <div className="leads-grid-layout">
        <div className="leads-grid-main">
          <table className="leads-grid-table">
            <thead><tr>{selectedColumns.map((column) => <th key={column.key}>{column.label}</th>)}<th><div className="table-header-actions"><span>{t(locale, 'common.tableAction')}</span><button ref={columnsToggleRef} type="button" className="ghost icon-btn table-header-gear" onClick={() => setShowColumnsPanel((previous) => !previous)} aria-pressed={showColumnsPanel} aria-label={t(locale, 'common.visibleColumns')} title={t(locale, 'common.visibleColumns')}>⚙</button></div></th></tr></thead>
            <tbody>
              {clients.length === 0 ? <tr><td colSpan={selectedColumns.length + 1}>{t(locale, 'clients.noClients')}</td></tr> : clients.map((client) => (
                <tr key={client.id} onClick={() => onViewClient(client.id)} className={`clickable-row ${selectedClientId === client.id ? 'selected' : ''}`}>
                  {selectedColumns.map((column) => (
                    <Fragment key={`${client.id}-${column.key}`}>
                      {column.cell(client)}
                    </Fragment>
                  ))}
                  <td>
                <div className="btn-row table-actions">
                  <button
                    type="button"
                    className="ghost"
                    onClick={(event) => { event.stopPropagation(); onViewClient(client.id); }}
                  >
                    {t(locale, 'common.actions.view')}
                  </button>
                  {pendingDeleteClientId === client.id ? (
                    <>
                      <button
                        type="button"
                        className="secondary"
                        onClick={(event) => { event.stopPropagation(); onDeleteClient(client.id); }}
                      >
                        {t(locale, 'common.actions.confirmDelete')}
                      </button>
                      <button
                        type="button"
                        className="ghost"
                        onClick={(event) => { event.stopPropagation(); onCancelDeleteClient(); }}
                      >
                        {t(locale, 'common.actions.cancel')}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="ghost"
                      onClick={(event) => { event.stopPropagation(); onRequestDeleteClient(client.id); }}
                    >
                      {t(locale, 'common.actions.delete')}
                    </button>
                  )}
                </div>
                {deleteClientError?.id === client.id ? (
                  <div className="inline-delete-error">
                    <div>{deleteClientError.message}</div>
                    <button
                      type="button"
                      className="secondary"
                      onClick={(event) => { event.stopPropagation(); onForceDeleteClient(client.id); }}
                    >
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
          ref={columnsPanelRef}
          className={`leads-columns-panel ${showColumnsPanel ? 'is-open' : 'is-closed'}`}
          aria-hidden={!showColumnsPanel}
        >
            <div className="leads-columns-panel-header">
              <strong>{t(locale, 'common.visibleColumns')}</strong>
              <button type="button" className="ghost" onClick={() => setShowColumnsPanel(false)}>{t(locale, 'common.actions.cancel')}</button>
            </div>
            <input
              value={columnsFilterTerm}
              onChange={(event) => setColumnsFilterTerm(event.target.value)}
              placeholder={t(locale, 'common.searchPlaceholder')}
            />
            <div className="btn-row">
              <button type="button" className="ghost" onClick={() => setVisibleColumns([...defaultClientListColumns])}>{t(locale, 'common.actions.resetDefaults')}</button>
              <button type="button" className="ghost" onClick={() => setAllClientColumnGroupsExpanded(true)}>{t(locale, 'common.actions.expandAll')}</button>
              <button type="button" className="ghost" onClick={() => setAllClientColumnGroupsExpanded(false)}>{t(locale, 'common.actions.collapseAll')}</button>
            </div>
            <div className="checkbox-grid">
              <details className="column-group selected-column-group" open>
                <summary className="column-group-title">{t(locale, 'common.columnGroups.selected')}</summary>
                <p className="selected-column-hint muted">{t(locale, 'common.visibleColumnsReorderHint')}</p>
                {selectedClientOverlayColumns.map((column, index) => (
                  <div
                    key={`selected-${column.key}`}
                    className="leads-column-item is-selected is-draggable"
                    style={{ justifyContent: 'space-between' }}
                    draggable
                    tabIndex={0}
                    onDragStart={() => setDraggedColumnKey(column.key)}
                    onDragEnd={() => setDraggedColumnKey(null)}
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
                      moveVisibleColumn(column.key, moveUpShortcut ? 'up' : 'down');
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      if (!draggedColumnKey || draggedColumnKey === column.key) return;
                      reorderVisibleColumn(draggedColumnKey, column.key);
                    }}
                  >
                    <span className="selected-column-order" aria-label={`Order ${index + 1}`}>{index + 1}</span>
                    <label>
                      <input
                        type="checkbox"
                        checked
                        onChange={() => toggleVisibleColumn(column.key)}
                        disabled={visibleColumns.length <= 1}
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
                          moveVisibleColumn(column.key, 'up');
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
                          moveVisibleColumn(column.key, 'down');
                        }}
                        disabled={index === selectedClientOverlayColumns.length - 1}
                      >
                        ↓
                      </button>
                      <span className="muted" aria-hidden="true">↕</span>
                    </div>
                  </div>
                ))}
              </details>
              {groupedFilteredClientColumns.map((entry) => (
                <details
                  key={entry.group}
                  className="column-group"
                  open={columnGroupsExpanded[entry.group]}
                  onToggle={(event) => setClientColumnGroupExpanded(entry.group, event.currentTarget.open)}
                >
                  <summary className="column-group-title">{clientsColumnGroupLabels[entry.group]}</summary>
                  {entry.columns.map((column) => {
                    const isSelected = visibleColumns.includes(column.key);
                    return (
                      <div
                        key={column.key}
                        className={`leads-column-item ${isSelected ? 'is-selected' : ''}`}
                      >
                        <label>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleVisibleColumn(column.key)}
                            disabled={isSelected && visibleColumns.length <= 1}
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
