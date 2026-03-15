import { useEffect, useMemo, useRef, useState } from 'react';
import { t } from '../i18n';
import {
  BUILDER_SECTION_STORAGE_KEY,
  BUILDER_SECTION_CONTAINER_IDS,
  BUILDER_SECTION_KEYS,
  BUILDER_SECTION_SHORTCUT_HINT_ID,
  COLLAPSE_ALL_SHORTCUT,
  EXPAND_ALL_SHORTCUT,
  countOpenSections,
  isAllSectionsCollapsed,
  isAllSectionsExpanded,
  type BuilderSectionKey,
  loadBuilderSectionVisibility,
  visibilityForAllSections
} from './itinerariesBuilderA11y';
import type {
  DestinationLibraryItem,
  Itinerary,
  ItineraryDay,
  ItineraryDayActivity,
  ItineraryDayActivityCategory,
  ItineraryStatus,
  Locale,
  PortalProposalActionEvent,
  PortalProposalView,
  ProposalPublicationShare
} from '../types';

interface ItinerariesViewProps {
  locale: Locale;
  itineraries: Itinerary[];
  onRefreshItineraries: () => void;
  onMovePipeline: (itineraryId: string, toStatus: Extract<ItineraryStatus, 'sent' | 'revised' | 'accepted'>) => Promise<{ ok: boolean; message: string }>;
  onListDays: (itineraryId: string) => Promise<ItineraryDay[]>;
  onCreateDay: (
    itineraryId: string,
    payload: { dayIndex: number; title: string; dayDate?: string; summary?: string }
  ) => Promise<{ ok: boolean; data: ItineraryDay | null; message: string }>;
  onUpdateDay: (
    itineraryId: string,
    dayId: string,
    payload: Partial<Pick<ItineraryDay, 'dayIndex' | 'title' | 'dayDate' | 'summary'>>
  ) => Promise<{ ok: boolean; data: ItineraryDay | null; message: string }>;
  onListDayActivities: (itineraryId: string, dayId: string) => Promise<ItineraryDayActivity[]>;
  onCreateDayActivity: (
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
  ) => Promise<{ ok: boolean; data: { activity: ItineraryDayActivity; itinerary: Itinerary } | null; message: string }>;
  onUpdateDayActivity: (
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
  ) => Promise<{ ok: boolean; data: { activity: ItineraryDayActivity; itinerary: Itinerary } | null; message: string }>;
  onSearchDestinationLibrary: (query: {
    location?: string;
    category?: 'activity' | 'hotel' | 'dining' | 'transfer' | 'other';
    limit?: number;
  }) => Promise<DestinationLibraryItem[]>;
  onPublishProposal: (
    itineraryId: string,
    payload: { expiresAt?: string }
  ) => Promise<{ ok: boolean; data: ProposalPublicationShare | null; message: string }>;
  onLoadPortalProposal: (hash: string) => Promise<PortalProposalView | null>;
  onPortalApprove: (
    hash: string,
    message?: string
  ) => Promise<{ ok: boolean; data: PortalProposalActionEvent | null; message: string }>;
  onPortalRequestRevision: (
    hash: string,
    feedback: string
  ) => Promise<{ ok: boolean; data: PortalProposalActionEvent | null; message: string }>;
}

type PipelineColumnKey = 'draft' | 'sent' | 'revised' | 'accepted';

const PIPELINE_COLUMNS: PipelineColumnKey[] = ['draft', 'sent', 'revised', 'accepted'];
const ACTIVITY_CATEGORIES: ItineraryDayActivityCategory[] = ['flight', 'hotel', 'transfer', 'tour', 'dining', 'activity', 'insurance', 'fee', 'other'];
const LIBRARY_CATEGORIES: Array<'activity' | 'hotel' | 'dining' | 'transfer' | 'other'> = ['activity', 'hotel', 'dining', 'transfer', 'other'];

function statusLabel(locale: Locale, status: PipelineColumnKey): string {
  const key = `itineraries.status.${status}`;
  const translated = t(locale, key);
  return translated === key ? status : translated;
}

function portalActionLabel(locale: Locale, action: PortalProposalActionEvent['action']): string {
  const key = `itineraries.portalAction.${action}`;
  const translated = t(locale, key);
  return translated === key ? action : translated;
}

function portalStatusLabel(locale: Locale, status: PortalProposalView['publication']['status']): string {
  const key = `itineraries.portalPublicationStatus.${status}`;
  const translated = t(locale, key);
  return translated === key ? status : translated;
}

function portalActorTypeLabel(locale: Locale, actorType: PortalProposalActionEvent['actorType']): string {
  const key = `itineraries.portalActorType.${actorType}`;
  const translated = t(locale, key);
  return translated === key ? actorType : translated;
}

function formatPortalEventDate(locale: Locale, value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  const languageTag = locale === 'es-MX' ? 'es-MX' : 'en-US';
  return new Intl.DateTimeFormat(languageTag, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(parsed);
}

function currencyFormatter(locale: Locale, currency: Itinerary['currency']): Intl.NumberFormat {
  const languageTag = locale === 'es-MX' ? 'es-MX' : 'en-US';
  return new Intl.NumberFormat(languageTag, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function nextTransitionsFor(status: ItineraryStatus): Array<Extract<ItineraryStatus, 'sent' | 'revised' | 'accepted'>> {
  if (status === 'draft') return ['sent'];
  if (status === 'sent') return ['revised', 'accepted'];
  if (status === 'revised') return ['sent', 'accepted'];
  return [];
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));
}

function sectionShortcutAction(event: KeyboardEvent): 'collapse' | 'expand' | null {
  if (!event.altKey || !event.shiftKey || isTypingTarget(event.target)) return null;
  const key = event.key.toLowerCase();
  if (key === 'c') return 'collapse';
  if (key === 'e') return 'expand';
  return null;
}

function activityValidationKey(title: string, priceNet: number, priceGross: number): string | null {
  if (!title.trim()) return 'itineraries.activityValidationTitleRequired';
  if (priceNet < 0 || priceGross < 0) return 'itineraries.activityValidationPriceNonNegative';
  if (priceGross < priceNet) return 'itineraries.activityValidationGrossLowerThanNet';
  return null;
}

export function ItinerariesView({
  locale,
  itineraries,
  onRefreshItineraries,
  onMovePipeline,
  onListDays,
  onCreateDay,
  onUpdateDay,
  onListDayActivities,
  onCreateDayActivity,
  onUpdateDayActivity,
  onSearchDestinationLibrary,
  onPublishProposal,
  onLoadPortalProposal,
  onPortalApprove,
  onPortalRequestRevision
}: ItinerariesViewProps) {
  const [movingItineraryId, setMovingItineraryId] = useState<string | null>(null);
  const [actionResult, setActionResult] = useState('');
  const [selectedItineraryId, setSelectedItineraryId] = useState<string | null>(null);
  const [days, setDays] = useState<ItineraryDay[]>([]);
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const [activities, setActivities] = useState<ItineraryDayActivity[]>([]);
  const [dayForm, setDayForm] = useState({ dayIndex: 1, title: '', dayDate: '', summary: '' });
  const [activityForm, setActivityForm] = useState({
    activityIndex: 1,
    title: '',
    category: 'activity' as ItineraryDayActivityCategory,
    priceNet: '0',
    priceGross: '0',
    optionalEnabled: true,
    startsAtLocal: '',
    durationMinutes: '',
    descriptionEs: '',
    mediaUrl: '',
    latitude: '',
    longitude: ''
  });
  const [libraryQuery, setLibraryQuery] = useState({ location: '', category: 'activity' as (typeof LIBRARY_CATEGORIES)[number] });
  const [libraryResults, setLibraryResults] = useState<DestinationLibraryItem[]>([]);
  const [publishExpiresAt, setPublishExpiresAt] = useState('');
  const [publication, setPublication] = useState<ProposalPublicationShare | null>(null);
  const [portalPreview, setPortalPreview] = useState<PortalProposalView | null>(null);
  const [portalMessage, setPortalMessage] = useState('');
  const [portalFeedback, setPortalFeedback] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [isLoadingPortal, setIsLoadingPortal] = useState(false);
  const [isPortalActionRunning, setIsPortalActionRunning] = useState(false);
  const [isBuilderLoading, setIsBuilderLoading] = useState(false);
  const [isCreatingDay, setIsCreatingDay] = useState(false);
  const [savingDayId, setSavingDayId] = useState<string | null>(null);
  const [isSearchingLibrary, setIsSearchingLibrary] = useState(false);
  const [hasSearchedLibrary, setHasSearchedLibrary] = useState(false);
  const [isCreatingActivity, setIsCreatingActivity] = useState(false);
  const [togglingActivityId, setTogglingActivityId] = useState<string | null>(null);
  const [savingActivityId, setSavingActivityId] = useState<string | null>(null);
  const [isSavingAllActivities, setIsSavingAllActivities] = useState(false);
  const [isRefreshingDays, setIsRefreshingDays] = useState(false);
  const [isRefreshingActivities, setIsRefreshingActivities] = useState(false);
  const [activityFormErrorKey, setActivityFormErrorKey] = useState<string | null>(null);
  const [activityErrorById, setActivityErrorById] = useState<Record<string, string | null>>({});
  const [activityBaselineById, setActivityBaselineById] = useState<Record<string, ItineraryDayActivity>>({});
  const [builderSectionVisibility, setBuilderSectionVisibility] = useState<Record<BuilderSectionKey, boolean>>(() => loadBuilderSectionVisibility());
  const lastAnnouncementRef = useRef<{ message: string; at: number; source: 'button' | 'shortcut' } | null>(null);

  function syncActivities(nextActivities: ItineraryDayActivity[]) {
    setActivities(nextActivities);
    setActivityBaselineById(
      Object.fromEntries(nextActivities.map((activity) => [activity.id, activity])) as Record<string, ItineraryDayActivity>
    );
  }

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.sessionStorage.setItem(BUILDER_SECTION_STORAGE_KEY, JSON.stringify(builderSectionVisibility));
  }, [builderSectionVisibility]);

  function sectionStateAnnouncement(section: BuilderSectionKey, expanded: boolean): string {
    const sectionLabel = t(locale, `itineraries.sectionLabel.${section}`);
    const stateLabel = expanded
      ? t(locale, 'itineraries.sectionState.expanded')
      : t(locale, 'itineraries.sectionState.collapsed');
    return t(locale, 'itineraries.sectionStateAnnouncement').replace('{section}', sectionLabel).replace('{state}', stateLabel);
  }

  function allSectionsStateAnnouncement(source: 'button' | 'shortcut', expanded: boolean): string {
    if (expanded) {
      return source === 'shortcut'
        ? t(locale, 'itineraries.sectionsStateAllExpandedShortcut')
        : t(locale, 'itineraries.sectionsStateAllExpanded');
    }

    return source === 'shortcut'
      ? t(locale, 'itineraries.sectionsStateAllCollapsedShortcut')
      : t(locale, 'itineraries.sectionsStateAllCollapsed');
  }

  function toggleBuilderSection(section: BuilderSectionKey) {
    setBuilderSectionVisibility((previous) => {
      const nextExpanded = !previous[section];
      announceUniqueStatus(sectionStateAnnouncement(section, nextExpanded));

      return {
        ...previous,
        [section]: nextExpanded
      };
    });
  }

  function announceUniqueStatus(message: string, source: 'button' | 'shortcut' = 'button') {
    const now = Date.now();
    const lastAnnouncement = lastAnnouncementRef.current;
    const isShortcutRepeatWithinCooldown = source === 'shortcut'
      && lastAnnouncement?.source === 'shortcut'
      && lastAnnouncement.message === message
      && now - lastAnnouncement.at < 500;

    if (isShortcutRepeatWithinCooldown) return;

    lastAnnouncementRef.current = { message, at: now, source };
    setActionResult((previous) => (previous === message ? previous : message));
  }

  function collapseAllBuilderSections(source: 'button' | 'shortcut' = 'button') {
    setBuilderSectionVisibility(visibilityForAllSections(false));
    announceUniqueStatus(allSectionsStateAnnouncement(source, false), source);
  }

  function expandAllBuilderSections(source: 'button' | 'shortcut' = 'button') {
    setBuilderSectionVisibility(visibilityForAllSections(true));
    announceUniqueStatus(allSectionsStateAnnouncement(source, true), source);
  }

  useEffect(() => {
    if (!selectedItineraryId || typeof window === 'undefined') return;

    function onKeyDown(event: KeyboardEvent) {
      const action = sectionShortcutAction(event);
      if (!action) return;
      const allCollapsed = isAllSectionsCollapsed(builderSectionVisibility);
      const allExpanded = isAllSectionsExpanded(builderSectionVisibility);
      if (action === 'collapse' && !allCollapsed) {
        event.preventDefault();
        collapseAllBuilderSections('shortcut');
      }

      if (action === 'expand' && !allExpanded) {
        event.preventDefault();
        expandAllBuilderSections('shortcut');
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedItineraryId, builderSectionVisibility]);

  const columns = useMemo(() => {
    return PIPELINE_COLUMNS.map((columnKey) => {
      const items = itineraries
        .filter((itinerary) => itinerary.status === columnKey)
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

      return {
        key: columnKey,
        label: statusLabel(locale, columnKey),
        items
      };
    });
  }, [itineraries, locale]);

  const otherStatusCount = useMemo(() => {
    return itineraries.filter((itinerary) => !PIPELINE_COLUMNS.includes(itinerary.status as PipelineColumnKey)).length;
  }, [itineraries]);

  async function move(itineraryId: string, toStatus: Extract<ItineraryStatus, 'sent' | 'revised' | 'accepted'>) {
    try {
      setMovingItineraryId(itineraryId);
      const response = await onMovePipeline(itineraryId, toStatus);
      setActionResult(response.message);
    } catch {
      setActionResult(t(locale, 'itineraries.moveError'));
    } finally {
      setMovingItineraryId(null);
    }
  }

  async function openBuilder(itineraryId: string) {
    try {
      setIsBuilderLoading(true);
      setSelectedItineraryId(itineraryId);
      setPublication(null);
      setPortalPreview(null);
      setPortalMessage('');
      setPortalFeedback('');
      setPublishExpiresAt('');
      setLibraryResults([]);
      setHasSearchedLibrary(false);
      setActivityFormErrorKey(null);
      setActivityErrorById({});
      const loadedDays = await onListDays(itineraryId);
      setDays(loadedDays);
      setSelectedDayId(loadedDays[0]?.id ?? null);
      if (loadedDays[0]?.id) {
        const loadedActivities = await onListDayActivities(itineraryId, loadedDays[0].id);
        syncActivities(loadedActivities);
      } else {
        syncActivities([]);
      }
    } catch {
      setDays([]);
      syncActivities([]);
      setActionResult(t(locale, 'itineraries.builderError'));
    } finally {
      setIsBuilderLoading(false);
    }
  }

  async function selectDay(dayId: string) {
    if (dayId === selectedDayId) return;
    if (hasUnsavedActivityChanges()) {
      const shouldSwitchDay = typeof window !== 'undefined'
        ? window.confirm(t(locale, 'itineraries.confirmChangeDayUnsaved'))
        : true;
      if (!shouldSwitchDay) return;
    }

    try {
      setSelectedDayId(dayId);
      setActivityErrorById({});
      if (!selectedItineraryId) return;
      const loadedActivities = await onListDayActivities(selectedItineraryId, dayId);
      syncActivities(loadedActivities);
    } catch {
      syncActivities([]);
      setActionResult(t(locale, 'itineraries.builderError'));
    }
  }

  function closeBuilder() {
    setSelectedItineraryId(null);
    setSelectedDayId(null);
    setDays([]);
    syncActivities([]);
    setPublication(null);
    setPortalPreview(null);
    setPortalMessage('');
    setPortalFeedback('');
    setPublishExpiresAt('');
    setLibraryResults([]);
    setHasSearchedLibrary(false);
    setActivityFormErrorKey(null);
    setActivityErrorById({});
  }

  function requestCloseBuilder() {
    if (!hasUnsavedActivityChanges()) {
      closeBuilder();
      return;
    }

    const shouldClose = typeof window !== 'undefined'
      ? window.confirm(t(locale, 'itineraries.confirmCloseBuilderUnsaved'))
      : true;
    if (shouldClose) closeBuilder();
  }

  async function refreshDays() {
    if (!selectedItineraryId) return;
    if (hasUnsavedActivityChanges()) {
      const shouldRefreshDays = typeof window !== 'undefined'
        ? window.confirm(t(locale, 'itineraries.confirmRefreshDaysUnsaved'))
        : true;
      if (!shouldRefreshDays) return;
    }

    try {
      setIsRefreshingDays(true);
      const loadedDays = await onListDays(selectedItineraryId);
      setDays(loadedDays);
      if (loadedDays.length === 0) {
        setSelectedDayId(null);
        syncActivities([]);
        setActivityErrorById({});
        return;
      }
      const stillSelected = selectedDayId && loadedDays.some((day) => day.id === selectedDayId);
      const targetDayId = stillSelected ? selectedDayId : loadedDays[0].id;
      setSelectedDayId(targetDayId);
      const loadedActivities = await onListDayActivities(selectedItineraryId, targetDayId);
      syncActivities(loadedActivities);
      setActivityErrorById({});
    } catch {
      setActionResult(t(locale, 'itineraries.builderError'));
    } finally {
      setIsRefreshingDays(false);
    }
  }

  async function refreshActivities() {
    if (!selectedItineraryId || !selectedDayId) return;
    if (hasUnsavedActivityChanges()) {
      const shouldRefreshActivities = typeof window !== 'undefined'
        ? window.confirm(t(locale, 'itineraries.confirmRefreshActivitiesUnsaved'))
        : true;
      if (!shouldRefreshActivities) return;
    }

    try {
      setIsRefreshingActivities(true);
      const loadedActivities = await onListDayActivities(selectedItineraryId, selectedDayId);
      syncActivities(loadedActivities);
      setActivityErrorById({});
    } catch {
      setActionResult(t(locale, 'itineraries.builderError'));
    } finally {
      setIsRefreshingActivities(false);
    }
  }

  async function submitCreateDay() {
    if (!selectedItineraryId || !dayForm.title.trim()) return;
    try {
      setIsCreatingDay(true);
      const response = await onCreateDay(selectedItineraryId, {
        dayIndex: dayForm.dayIndex,
        title: dayForm.title,
        dayDate: dayForm.dayDate || undefined,
        summary: dayForm.summary || undefined
      });
      setActionResult(response.message);
      if (!response.ok) return;
      const loadedDays = await onListDays(selectedItineraryId);
      setDays(loadedDays);
      setDayForm((previous) => ({ ...previous, dayIndex: previous.dayIndex + 1, title: '', dayDate: '', summary: '' }));
    } catch {
      setActionResult(t(locale, 'itineraries.builderError'));
    } finally {
      setIsCreatingDay(false);
    }
  }

  async function submitUpdateDay(day: ItineraryDay) {
    if (!selectedItineraryId) return;
    try {
      setSavingDayId(day.id);
      const response = await onUpdateDay(selectedItineraryId, day.id, {
        dayIndex: day.dayIndex,
        title: day.title,
        dayDate: day.dayDate,
        summary: day.summary
      });
      setActionResult(response.message);
      if (!response.ok) return;
      const loadedDays = await onListDays(selectedItineraryId);
      setDays(loadedDays);
    } catch {
      setActionResult(t(locale, 'itineraries.builderError'));
    } finally {
      setSavingDayId(null);
    }
  }

  async function submitCreateActivity() {
    if (!selectedItineraryId || !selectedDayId) return;
    const createValidationKey = activityValidationKey(activityForm.title, Number(activityForm.priceNet), Number(activityForm.priceGross));
    if (createValidationKey) {
      setActivityFormErrorKey(createValidationKey);
      return;
    }
    try {
      setIsCreatingActivity(true);
      setActivityFormErrorKey(null);
      const response = await onCreateDayActivity(selectedItineraryId, selectedDayId, {
        activityIndex: activityForm.activityIndex,
        title: activityForm.title,
        category: activityForm.category,
        priceNet: Number(activityForm.priceNet),
        priceGross: Number(activityForm.priceGross),
        optionalEnabled: activityForm.optionalEnabled,
        startsAtLocal: activityForm.startsAtLocal || undefined,
        durationMinutes: activityForm.durationMinutes ? Number(activityForm.durationMinutes) : undefined,
        descriptionEs: activityForm.descriptionEs || undefined,
        mediaUrl: activityForm.mediaUrl || undefined,
        latitude: activityForm.latitude ? Number(activityForm.latitude) : undefined,
        longitude: activityForm.longitude ? Number(activityForm.longitude) : undefined
      });
      setActionResult(response.message);
      if (!response.ok) return;
      const loadedActivities = await onListDayActivities(selectedItineraryId, selectedDayId);
      syncActivities(loadedActivities);
      setActivityForm((previous) => ({
        ...previous,
        activityIndex: previous.activityIndex + 1,
        title: '',
        priceNet: '0',
        priceGross: '0',
        startsAtLocal: '',
        durationMinutes: '',
        descriptionEs: '',
        mediaUrl: '',
        latitude: '',
        longitude: ''
      }));
      setActivityFormErrorKey(null);
      setActivityErrorById({});
    } catch {
      setActionResult(t(locale, 'itineraries.builderError'));
    } finally {
      setIsCreatingActivity(false);
    }
  }

  async function toggleOptional(activity: ItineraryDayActivity) {
    if (!selectedItineraryId || !selectedDayId) return;
    try {
      setTogglingActivityId(activity.id);
      const response = await onUpdateDayActivity(selectedItineraryId, selectedDayId, activity.id, {
        optionalEnabled: !activity.optionalEnabled,
        priceNet: activity.priceNet,
        priceGross: activity.priceGross,
        activityIndex: activity.activityIndex,
        title: activity.title,
        category: activity.category
      });
      setActionResult(response.message);
      if (!response.ok) return;
      const loadedActivities = await onListDayActivities(selectedItineraryId, selectedDayId);
      syncActivities(loadedActivities);
    } catch {
      setActionResult(t(locale, 'itineraries.builderError'));
    } finally {
      setTogglingActivityId(null);
    }
  }

  async function submitUpdateActivity(activity: ItineraryDayActivity) {
    if (!selectedItineraryId || !selectedDayId) return;
    const updateValidationKey = activityValidationKey(activity.title, activity.priceNet, activity.priceGross);
    if (updateValidationKey) {
      setActivityErrorById((previous) => ({ ...previous, [activity.id]: updateValidationKey }));
      return;
    }
    try {
      setSavingActivityId(activity.id);
      setActivityErrorById((previous) => ({ ...previous, [activity.id]: null }));
      const response = await onUpdateDayActivity(selectedItineraryId, selectedDayId, activity.id, {
        activityIndex: activity.activityIndex,
        title: activity.title,
        category: activity.category,
        priceNet: activity.priceNet,
        priceGross: activity.priceGross,
        optionalEnabled: activity.optionalEnabled,
        startsAtLocal: activity.startsAtLocal ?? '',
        durationMinutes: activity.durationMinutes ?? 0,
        descriptionEs: activity.descriptionEs ?? '',
        mediaUrl: activity.mediaUrl ?? '',
        latitude: activity.latitude,
        longitude: activity.longitude
      });
      setActionResult(response.message);
      if (!response.ok) return;
      const loadedActivities = await onListDayActivities(selectedItineraryId, selectedDayId);
      syncActivities(loadedActivities);
    } catch {
      setActionResult(t(locale, 'itineraries.builderError'));
    } finally {
      setSavingActivityId(null);
    }
  }

  async function saveAllDirtyActivities() {
    if (!selectedItineraryId || !selectedDayId) return;
    const dirtyActivities = activities.filter((activity) => hasActivityLocalChanges(activity));
    if (dirtyActivities.length === 0) return;

    let hasValidationError = false;
    const nextErrors: Record<string, string | null> = {};
    for (const activity of dirtyActivities) {
      const validationKey = activityValidationKey(activity.title, activity.priceNet, activity.priceGross);
      nextErrors[activity.id] = validationKey;
      if (validationKey) hasValidationError = true;
    }
    setActivityErrorById((previous) => ({ ...previous, ...nextErrors }));
    if (hasValidationError) {
      setActionResult(t(locale, 'itineraries.saveAllActivitiesValidationError'));
      return;
    }

    let savedCount = 0;
    let failedCount = 0;
    try {
      setIsSavingAllActivities(true);
      for (const activity of dirtyActivities) {
        setSavingActivityId(activity.id);
        const response = await onUpdateDayActivity(selectedItineraryId, selectedDayId, activity.id, {
          activityIndex: activity.activityIndex,
          title: activity.title,
          category: activity.category,
          priceNet: activity.priceNet,
          priceGross: activity.priceGross,
          optionalEnabled: activity.optionalEnabled,
          startsAtLocal: activity.startsAtLocal ?? '',
          durationMinutes: activity.durationMinutes ?? 0,
          descriptionEs: activity.descriptionEs ?? '',
          mediaUrl: activity.mediaUrl ?? '',
          latitude: activity.latitude,
          longitude: activity.longitude
        });
        if (response.ok) {
          savedCount += 1;
        } else {
          failedCount += 1;
        }
      }

      const loadedActivities = await onListDayActivities(selectedItineraryId, selectedDayId);
      syncActivities(loadedActivities);
      setActivityErrorById({});
      setActionResult(
        t(locale, 'itineraries.saveAllActivitiesSummary')
          .replace('{saved}', String(savedCount))
          .replace('{failed}', String(failedCount))
      );
    } catch {
      setActionResult(t(locale, 'itineraries.builderError'));
    } finally {
      setSavingActivityId(null);
      setIsSavingAllActivities(false);
    }
  }

  function hasActivityLocalChanges(activity: ItineraryDayActivity): boolean {
    const baseline = activityBaselineById[activity.id];
    if (!baseline) return false;
    return (
      baseline.title !== activity.title
      || baseline.category !== activity.category
      || baseline.priceNet !== activity.priceNet
      || baseline.priceGross !== activity.priceGross
    );
  }

  function hasUnsavedActivityChanges(): boolean {
    return dirtyActivitiesCount > 0;
  }

  function discardActivityChanges(activityId: string) {
    const baseline = activityBaselineById[activityId];
    if (!baseline) return;
    setActivities((previous) => previous.map((activity) => activity.id === activityId ? { ...baseline } : activity));
    setActivityErrorById((previous) => ({ ...previous, [activityId]: null }));
  }

  function discardAllDirtyActivities() {
    if (dirtyActivitiesCount === 0) return;
    const shouldDiscard = typeof window !== 'undefined'
      ? window.confirm(t(locale, 'itineraries.confirmDiscardAllActivities'))
      : true;
    if (!shouldDiscard) return;

    setActivities((previous) => previous.map((activity) => {
      const baseline = activityBaselineById[activity.id];
      return baseline ? { ...baseline } : activity;
    }));
    setActivityErrorById({});
    setActionResult(t(locale, 'itineraries.discardAllActivitiesSummary').replace('{count}', String(dirtyActivitiesCount)));
  }

  function jumpToFirstInvalidActivity() {
    const firstInvalidActivityId = activities.find((activity) => Boolean(activityErrorById[activity.id]))?.id;
    if (!firstInvalidActivityId || typeof document === 'undefined') return;
    const cardElement = document.getElementById(`activity-card-${firstInvalidActivityId}`);
    if (!cardElement) return;
    cardElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const firstInput = cardElement.querySelector('input, select, textarea') as HTMLElement | null;
    firstInput?.focus();
  }

  const selectedItinerary = selectedItineraryId
    ? itineraries.find((itinerary) => itinerary.id === selectedItineraryId) ?? null
    : null;

  const shareUrl = publication
    ? `${typeof window === 'undefined' ? '' : window.location.origin}/api${publication.urlPath}`
    : '';

  const portalActions = useMemo(() => {
    if (!portalPreview) return [];
    return [...portalPreview.actions].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }, [portalPreview]);

  const dirtyActivitiesCount = activities.filter((activity) => hasActivityLocalChanges(activity)).length;

  const activityValidationErrorsCount = Object.values(activityErrorById).filter((value) => Boolean(value)).length + (activityFormErrorKey ? 1 : 0);

  const allBuilderSectionsExpanded = isAllSectionsExpanded(builderSectionVisibility);
  const allBuilderSectionsCollapsed = isAllSectionsCollapsed(builderSectionVisibility);
  const openBuilderSectionsCount = countOpenSections(builderSectionVisibility);

  const totalBuilderSections = BUILDER_SECTION_KEYS.length;

  const portalPreviewIsActive = portalPreview?.publication.status === 'active';

  async function searchLibrary() {
    try {
      setIsSearchingLibrary(true);
      const results = await onSearchDestinationLibrary({
        location: libraryQuery.location || undefined,
        category: libraryQuery.category,
        limit: 10
      });
      setHasSearchedLibrary(true);
      setLibraryResults(results);
    } catch {
      setHasSearchedLibrary(true);
      setLibraryResults([]);
      setActionResult(t(locale, 'itineraries.builderError'));
    } finally {
      setIsSearchingLibrary(false);
    }
  }

  function applyLibraryItem(item: DestinationLibraryItem) {
    setActivityForm((previous) => ({
      ...previous,
      title: item.title,
      category: item.category,
      descriptionEs: item.description ?? '',
      mediaUrl: item.mediaUrl ?? '',
      latitude: item.coordinates ? String(item.coordinates.latitude) : '',
      longitude: item.coordinates ? String(item.coordinates.longitude) : ''
    }));
  }

  async function publishProposal() {
    if (!selectedItineraryId) return;
    try {
      setIsPublishing(true);
      const response = await onPublishProposal(selectedItineraryId, {
        expiresAt: publishExpiresAt || undefined
      });
      setActionResult(response.message);
      if (!response.ok || !response.data) return;
      setPublication(response.data);
      await loadPortalPreview(response.data.hash);
    } catch {
      setActionResult(t(locale, 'itineraries.publishError'));
    } finally {
      setIsPublishing(false);
    }
  }

  async function loadPortalPreview(hash: string) {
    if (!hash) return;
    try {
      setIsLoadingPortal(true);
      const loaded = await onLoadPortalProposal(hash);
      if (!loaded) return;
      setPortalPreview(loaded);
    } catch {
      setActionResult(t(locale, 'itineraries.portalLoadError'));
    } finally {
      setIsLoadingPortal(false);
    }
  }

  async function approveFromPortal() {
    const hash = publication?.hash ?? portalPreview?.publication.hash;
    if (!hash || isPortalActionRunning) return;
    try {
      setIsPortalActionRunning(true);
      const response = await onPortalApprove(hash, portalMessage || undefined);
      setActionResult(response.message);
      await loadPortalPreview(hash);
    } catch {
      setActionResult(t(locale, 'itineraries.portalActionError'));
    } finally {
      setIsPortalActionRunning(false);
    }
  }

  async function requestRevisionFromPortal() {
    const hash = publication?.hash ?? portalPreview?.publication.hash;
    if (!hash || !portalFeedback.trim() || isPortalActionRunning) return;
    try {
      setIsPortalActionRunning(true);
      const response = await onPortalRequestRevision(hash, portalFeedback.trim());
      setActionResult(response.message);
      await loadPortalPreview(hash);
    } catch {
      setActionResult(t(locale, 'itineraries.portalActionError'));
    } finally {
      setIsPortalActionRunning(false);
    }
  }

  async function copyShareLink() {
    if (!shareUrl) return;
    if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
      setActionResult(t(locale, 'itineraries.copyNotAvailable'));
      return;
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setActionResult(t(locale, 'itineraries.copySuccess'));
    } catch {
      setActionResult(t(locale, 'itineraries.copyNotAvailable'));
    }
  }

  return (
    <section className="card">
      <div className="leads-list-header">
        <h2>{t(locale, 'itineraries.title')}</h2>
        <div className="btn-row">
          <button type="button" className="ghost" onClick={onRefreshItineraries}>{t(locale, 'common.actions.refresh')}</button>
        </div>
      </div>
      <p className="muted">{t(locale, 'itineraries.scopeCount').replace('{total}', String(itineraries.length))}</p>
      {otherStatusCount > 0 ? <p className="muted">{t(locale, 'itineraries.otherStatuses').replace('{count}', String(otherStatusCount))}</p> : null}
      {actionResult ? <p className="muted" role="status" aria-live="polite">{actionResult}</p> : null}
      <div className="two-col">
        {columns.map((column) => (
          <section key={column.key} className="card">
            <h3>{`${column.label} (${column.items.length})`}</h3>
            {column.items.length === 0 ? <p className="muted">{t(locale, 'itineraries.emptyColumn')}</p> : null}
            {column.items.map((itinerary) => {
              const nextTransitions = nextTransitionsFor(itinerary.status);
              const formatter = currencyFormatter(locale, itinerary.currency);

              return (
                <article key={itinerary.id} className="card">
                  <h3>{itinerary.title}</h3>
                  <p className="muted">{`${t(locale, 'itineraries.clientId')}: ${itinerary.clientId}`}</p>
                  <p className="muted">{`${t(locale, 'itineraries.total')}: ${formatter.format(itinerary.grossTotal)}`}</p>
                  <div className="btn-row">
                    <button type="button" className="ghost" onClick={() => void openBuilder(itinerary.id)}>
                      {isBuilderLoading && selectedItineraryId === itinerary.id ? t(locale, 'itineraries.loadingBuilder') : t(locale, 'itineraries.openBuilder')}
                    </button>
                    {nextTransitions.map((nextStatus) => (
                      <button
                        key={`${itinerary.id}_${nextStatus}`}
                        type="button"
                        className="ghost"
                        disabled={movingItineraryId === itinerary.id}
                        onClick={() => void move(itinerary.id, nextStatus)}
                      >
                        {t(locale, 'itineraries.moveTo').replace('{status}', statusLabel(locale, nextStatus as PipelineColumnKey))}
                      </button>
                    ))}
                  </div>
                </article>
              );
            })}
          </section>
        ))}
      </div>

      {selectedItinerary ? (
        <section className="card">
          <div className="leads-list-header">
            <h3>{t(locale, 'itineraries.builderTitle').replace('{title}', selectedItinerary.title)}</h3>
            <div className="btn-row">
              <span className="muted">{t(locale, 'itineraries.sectionsOpenSummary').replace('{open}', String(openBuilderSectionsCount)).replace('{total}', String(totalBuilderSections))}</span>
              <span id={BUILDER_SECTION_SHORTCUT_HINT_ID} className="muted">{t(locale, 'itineraries.sectionControlsShortcutHint')}</span>
              <button type="button" className="ghost" aria-describedby={BUILDER_SECTION_SHORTCUT_HINT_ID} aria-label={t(locale, 'itineraries.collapseAllAriaLabel').replace('{shortcut}', COLLAPSE_ALL_SHORTCUT)} aria-keyshortcuts={COLLAPSE_ALL_SHORTCUT} aria-pressed={allBuilderSectionsCollapsed} disabled={allBuilderSectionsCollapsed} onClick={() => collapseAllBuilderSections()}>{t(locale, 'common.actions.collapseAll')}</button>
              <button type="button" className="ghost" aria-describedby={BUILDER_SECTION_SHORTCUT_HINT_ID} aria-label={t(locale, 'itineraries.expandAllAriaLabel').replace('{shortcut}', EXPAND_ALL_SHORTCUT)} aria-keyshortcuts={EXPAND_ALL_SHORTCUT} aria-pressed={allBuilderSectionsExpanded} disabled={allBuilderSectionsExpanded} onClick={() => expandAllBuilderSections()}>{t(locale, 'common.actions.expandAll')}</button>
              <button
                type="button"
                className={`ghost${dirtyActivitiesCount > 0 ? ' warn' : ''}`}
                onClick={() => requestCloseBuilder()}
              >
                {t(locale, 'itineraries.closeBuilder')}
              </button>
            </div>
          </div>
          <p className="muted">{`${t(locale, 'itineraries.total')}: ${currencyFormatter(locale, selectedItinerary.currency).format(selectedItinerary.grossTotal)}`}</p>
          {allBuilderSectionsCollapsed ? <p className="muted">{t(locale, 'itineraries.sectionsStateAllCollapsed')}</p> : null}
          {allBuilderSectionsExpanded ? <p className="muted">{t(locale, 'itineraries.sectionsStateAllExpanded')}</p> : null}
          {dirtyActivitiesCount > 0
            ? <p className="muted">{t(locale, 'itineraries.dirtyActivitiesSummary').replace('{count}', String(dirtyActivitiesCount))}</p>
            : null}
          {isBuilderLoading ? <p className="muted">{t(locale, 'itineraries.loadingBuilder')}</p> : null}

          <section id={BUILDER_SECTION_CONTAINER_IDS.proposal} className="card">
            <div className="leads-list-header">
              <h3>{t(locale, 'itineraries.proposalTitle')}</h3>
              <div className="btn-row">
                <button type="button" className="ghost" aria-controls={BUILDER_SECTION_CONTAINER_IDS.proposal} aria-expanded={builderSectionVisibility.proposal} aria-pressed={!builderSectionVisibility.proposal} onClick={() => toggleBuilderSection('proposal')}>
                  {builderSectionVisibility.proposal ? t(locale, 'itineraries.collapseSection') : t(locale, 'itineraries.expandSection')}
                </button>
              </div>
            </div>
            {builderSectionVisibility.proposal ? (
              <>
            <div className="field">
              <label>{t(locale, 'itineraries.proposalExpiresAt')}</label>
              <input type="datetime-local" value={publishExpiresAt} onChange={(event) => setPublishExpiresAt(event.target.value)} />
            </div>
            <div className="btn-row">
              <button type="button" disabled={isPublishing} onClick={() => void publishProposal()}>{t(locale, 'itineraries.publishProposal')}</button>
              {publication ? (
                <button type="button" className="ghost" disabled={isLoadingPortal} onClick={() => void loadPortalPreview(publication.hash)}>
                  {t(locale, 'itineraries.loadPortalPreview')}
                </button>
              ) : null}
            </div>
            {isPublishing ? <p className="muted">{t(locale, 'itineraries.publishing')}</p> : null}
            {isLoadingPortal ? <p className="muted">{t(locale, 'itineraries.loadingPortal')}</p> : null}

            {publication ? (
              <div className="card">
                <p><strong>{t(locale, 'itineraries.shareLink')}</strong></p>
                <p className="muted">{shareUrl}</p>
                <p className="muted">{`${t(locale, 'itineraries.publishedAt')}: ${publication.publishedAt}`}</p>
                {publication.expiresAt ? <p className="muted">{`${t(locale, 'itineraries.proposalExpiresAt')}: ${publication.expiresAt}`}</p> : null}
                <div className="btn-row">
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => void copyShareLink()}
                  >
                    {t(locale, 'itineraries.copyLink')}
                  </button>
                  <a className="ghost" href={`/api${publication.urlPath}`} target="_blank" rel="noreferrer">
                    {t(locale, 'itineraries.openPortal')}
                  </a>
                </div>
              </div>
            ) : null}

            {portalPreview ? (
              <div className="card">
                <p className="muted">{`${t(locale, 'itineraries.portalStatus')}: ${portalStatusLabel(locale, portalPreview.publication.status)}`}</p>
                <p className="muted">{`${t(locale, 'itineraries.portalActionsCount')}: ${portalPreview.actions.length}`}</p>
                {portalPreview.publication.lastViewedAt ? <p className="muted">{`${t(locale, 'itineraries.lastViewedAt')}: ${formatPortalEventDate(locale, portalPreview.publication.lastViewedAt)}`}</p> : null}
                {!portalPreviewIsActive ? (
                  <p className="muted">
                    {portalPreview.publication.status === 'expired'
                      ? t(locale, 'itineraries.portalExpiredWarning')
                      : t(locale, 'itineraries.portalRevokedWarning')}
                  </p>
                ) : null}
                <div className="field">
                  <label>{t(locale, 'itineraries.portalApproveMessage')}</label>
                  <input value={portalMessage} onChange={(event) => setPortalMessage(event.target.value)} />
                </div>
                <button type="button" className="ghost" disabled={isPortalActionRunning || isLoadingPortal || !portalPreviewIsActive} onClick={() => void approveFromPortal()}>{t(locale, 'itineraries.portalApprove')}</button>
                <div className="field">
                  <label>{t(locale, 'itineraries.portalRevisionFeedback')}</label>
                  <textarea value={portalFeedback} onChange={(event) => setPortalFeedback(event.target.value)} />
                </div>
                <button type="button" className="ghost" disabled={isPortalActionRunning || isLoadingPortal || !portalPreviewIsActive || !portalFeedback.trim()} onClick={() => void requestRevisionFromPortal()}>{t(locale, 'itineraries.portalRequestRevision')}</button>
                <div>
                  <h3>{t(locale, 'itineraries.portalTimeline')}</h3>
                  {portalActions.length === 0 ? <p className="muted">{t(locale, 'itineraries.portalTimelineEmpty')}</p> : null}
                  {portalActions.map((event) => (
                    <article key={event.id} className="card">
                      <p><strong>{portalActionLabel(locale, event.action)}</strong></p>
                      <p className="muted">{`${t(locale, 'itineraries.actorType')}: ${portalActorTypeLabel(locale, event.actorType)}`}</p>
                      <p className="muted">{`${t(locale, 'itineraries.eventAt')}: ${formatPortalEventDate(locale, event.createdAt)}`}</p>
                      {event.message ? <p className="muted">{event.message}</p> : null}
                    </article>
                  ))}
                </div>
              </div>
            ) : null}
              </>
            ) : null}
          </section>

          <div className="two-col">
            <section id={BUILDER_SECTION_CONTAINER_IDS.days} className="card">
              <div className="leads-list-header">
                <h3>{t(locale, 'itineraries.daysTitle')}</h3>
                <div className="btn-row">
                  <button type="button" className="ghost" aria-controls={BUILDER_SECTION_CONTAINER_IDS.days} aria-expanded={builderSectionVisibility.days} aria-pressed={!builderSectionVisibility.days} onClick={() => toggleBuilderSection('days')}>
                    {builderSectionVisibility.days ? t(locale, 'itineraries.collapseSection') : t(locale, 'itineraries.expandSection')}
                  </button>
                  <button type="button" className="ghost" disabled={isRefreshingDays || isBuilderLoading} onClick={() => void refreshDays()}>
                    {isRefreshingDays ? t(locale, 'itineraries.loadingDays') : t(locale, 'itineraries.refreshDays')}
                  </button>
                </div>
              </div>
              {builderSectionVisibility.days ? (
                <>
              <div className="field">
                <label>{t(locale, 'itineraries.dayIndex')}</label>
                <input disabled={isCreatingDay || isBuilderLoading} type="number" value={dayForm.dayIndex} onChange={(event) => setDayForm((previous) => ({ ...previous, dayIndex: Number(event.target.value) || 1 }))} />
              </div>
              <div className="field">
                <label>{t(locale, 'itineraries.dayTitle')}</label>
                <input disabled={isCreatingDay || isBuilderLoading} value={dayForm.title} onChange={(event) => setDayForm((previous) => ({ ...previous, title: event.target.value }))} />
              </div>
              <div className="field">
                <label>{t(locale, 'itineraries.dayDate')}</label>
                <input disabled={isCreatingDay || isBuilderLoading} type="date" value={dayForm.dayDate} onChange={(event) => setDayForm((previous) => ({ ...previous, dayDate: event.target.value }))} />
              </div>
              <div className="field">
                <label>{t(locale, 'itineraries.summary')}</label>
                <textarea disabled={isCreatingDay || isBuilderLoading} value={dayForm.summary} onChange={(event) => setDayForm((previous) => ({ ...previous, summary: event.target.value }))} />
              </div>
              <button type="button" disabled={isCreatingDay || !dayForm.title.trim()} onClick={() => void submitCreateDay()}>{isCreatingDay ? t(locale, 'itineraries.creatingDay') : t(locale, 'itineraries.addDay')}</button>

              <div>
                {days.length === 0 ? <p className="muted">{t(locale, 'itineraries.emptyDays')}</p> : null}
                {days.map((day) => (
                  <article key={day.id} className="card">
                    <button type="button" className="ghost" aria-current={selectedDayId === day.id ? 'true' : undefined} disabled={selectedDayId === day.id || isBuilderLoading} onClick={() => void selectDay(day.id)}>{`${t(locale, 'itineraries.dayLabel')} ${day.dayIndex}`}</button>
                    <div className="field">
                      <label>{t(locale, 'itineraries.dayTitle')}</label>
                      <input
                          disabled={savingDayId === day.id || isBuilderLoading}
                        value={day.title}
                        onChange={(event) => setDays((previous) => previous.map((item) => item.id === day.id ? { ...item, title: event.target.value } : item))}
                      />
                    </div>
                    <button type="button" className="ghost" disabled={savingDayId === day.id} onClick={() => void submitUpdateDay(day)}>{savingDayId === day.id ? t(locale, 'itineraries.savingDay') : t(locale, 'common.actions.save')}</button>
                  </article>
                ))}
              </div>
                </>
              ) : null}
            </section>

            <section id={BUILDER_SECTION_CONTAINER_IDS.activities} className="card">
              <div className="leads-list-header">
                <h3>{t(locale, 'itineraries.activitiesTitle')}</h3>
                <div className="btn-row">
                  <button type="button" className="ghost" aria-controls={BUILDER_SECTION_CONTAINER_IDS.activities} aria-expanded={builderSectionVisibility.activities} aria-pressed={!builderSectionVisibility.activities} onClick={() => toggleBuilderSection('activities')}>
                    {builderSectionVisibility.activities ? t(locale, 'itineraries.collapseSection') : t(locale, 'itineraries.expandSection')}
                  </button>
                  <button type="button" className="ghost" disabled={isRefreshingActivities || isSavingAllActivities || !selectedDayId} onClick={() => void refreshActivities()}>
                    {isRefreshingActivities ? t(locale, 'itineraries.loadingActivities') : t(locale, 'itineraries.refreshActivities')}
                  </button>
                  <button type="button" className="ghost" disabled={isSavingAllActivities || dirtyActivitiesCount === 0 || activityValidationErrorsCount > 0} onClick={() => void saveAllDirtyActivities()}>
                    {isSavingAllActivities ? t(locale, 'itineraries.savingAllActivities') : t(locale, 'itineraries.saveAllActivities')}
                  </button>
                  <button type="button" className="ghost" disabled={isSavingAllActivities || dirtyActivitiesCount === 0} onClick={() => discardAllDirtyActivities()}>
                    {t(locale, 'itineraries.discardAllActivities')}
                  </button>
                  <button type="button" className="ghost" disabled={activityValidationErrorsCount === 0} onClick={() => jumpToFirstInvalidActivity()}>
                    {t(locale, 'itineraries.jumpToFirstValidationError')}
                  </button>
                </div>
              </div>
              {builderSectionVisibility.activities ? (
                <>
              {activityValidationErrorsCount > 0
                ? <p className="inline-delete-error">{t(locale, 'itineraries.validationErrorsSummary').replace('{count}', String(activityValidationErrorsCount))}</p>
                : null}
              {activityValidationErrorsCount > 0 && dirtyActivitiesCount > 0
                ? <p className="muted">{t(locale, 'itineraries.saveAllBlockedByValidationHint')}</p>
                : null}
              {selectedDayId ? (
                <>
                  <p className="muted">{t(locale, 'itineraries.selectedDaySummary').replace('{day}', String(days.find((day) => day.id === selectedDayId)?.dayIndex ?? '')).replace('{count}', String(activities.length))}</p>
                  <div className="card">
                    <h3>{t(locale, 'itineraries.libraryTitle')}</h3>
                    <div className="field">
                      <label>{t(locale, 'itineraries.libraryLocation')}</label>
                      <input value={libraryQuery.location} onChange={(event) => setLibraryQuery((previous) => ({ ...previous, location: event.target.value }))} />
                    </div>
                    <div className="field">
                      <label>{t(locale, 'itineraries.libraryCategory')}</label>
                      <select value={libraryQuery.category} onChange={(event) => setLibraryQuery((previous) => ({ ...previous, category: event.target.value as (typeof LIBRARY_CATEGORIES)[number] }))}>
                        {LIBRARY_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
                      </select>
                    </div>
                    <button type="button" className="ghost" disabled={isSearchingLibrary} onClick={() => void searchLibrary()}>{isSearchingLibrary ? t(locale, 'itineraries.searchingLibrary') : t(locale, 'itineraries.searchLibrary')}</button>
                    <div>
                      {hasSearchedLibrary && !isSearchingLibrary && libraryResults.length === 0 ? <p className="muted">{t(locale, 'itineraries.emptyLibraryResults')}</p> : null}
                      {libraryResults.map((item) => (
                        <article key={item.id} className="card">
                          <p><strong>{item.title}</strong></p>
                          <p className="muted">{item.description}</p>
                          {item.mediaUrl ? <img src={item.mediaUrl} alt={item.title} style={{ width: '100%', borderRadius: '0.4rem' }} /> : null}
                          {item.coordinates ? (
                            <p className="muted">
                              <a href={`https://www.openstreetmap.org/?mlat=${item.coordinates.latitude}&mlon=${item.coordinates.longitude}#map=14/${item.coordinates.latitude}/${item.coordinates.longitude}`} target="_blank" rel="noreferrer">
                                {t(locale, 'itineraries.viewMap')}
                              </a>
                            </p>
                          ) : null}
                          <button type="button" className="ghost" onClick={() => applyLibraryItem(item)}>{t(locale, 'itineraries.useItem')}</button>
                        </article>
                      ))}
                    </div>
                  </div>

                  <div className="field">
                    <label>{t(locale, 'itineraries.activityIndex')}</label>
                    <input type="number" value={activityForm.activityIndex} onChange={(event) => setActivityForm((previous) => ({ ...previous, activityIndex: Number(event.target.value) || 1 }))} />
                  </div>
                  <div className="field">
                    <label>{t(locale, 'itineraries.activityTitle')}</label>
                    <input
                      aria-invalid={Boolean(activityFormErrorKey)}
                      className={activityFormErrorKey ? 'input-invalid' : undefined}
                      value={activityForm.title}
                      onChange={(event) => {
                      const nextTitle = event.target.value;
                      setActivityForm((previous) => ({ ...previous, title: nextTitle }));
                      const nextValidationKey = activityValidationKey(nextTitle, Number(activityForm.priceNet), Number(activityForm.priceGross));
                      setActivityFormErrorKey(nextValidationKey);
                      }}
                    />
                  </div>
                  <div className="field">
                    <label>{t(locale, 'itineraries.category')}</label>
                    <select value={activityForm.category} onChange={(event) => setActivityForm((previous) => ({ ...previous, category: event.target.value as ItineraryDayActivityCategory }))}>
                      {ACTIVITY_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <label>{t(locale, 'itineraries.priceNet')}</label>
                    <input
                      aria-invalid={Boolean(activityFormErrorKey)}
                      className={activityFormErrorKey ? 'input-invalid' : undefined}
                      type="number"
                      value={activityForm.priceNet}
                      onChange={(event) => {
                      const nextPriceNet = event.target.value;
                      setActivityForm((previous) => ({ ...previous, priceNet: nextPriceNet }));
                      const nextValidationKey = activityValidationKey(activityForm.title, Number(nextPriceNet), Number(activityForm.priceGross));
                      setActivityFormErrorKey(nextValidationKey);
                      }}
                    />
                  </div>
                  <div className="field">
                    <label>{t(locale, 'itineraries.priceGross')}</label>
                    <input
                      aria-invalid={Boolean(activityFormErrorKey)}
                      className={activityFormErrorKey ? 'input-invalid' : undefined}
                      type="number"
                      value={activityForm.priceGross}
                      onChange={(event) => {
                      const nextPriceGross = event.target.value;
                      setActivityForm((previous) => ({ ...previous, priceGross: nextPriceGross }));
                      const nextValidationKey = activityValidationKey(activityForm.title, Number(activityForm.priceNet), Number(nextPriceGross));
                      setActivityFormErrorKey(nextValidationKey);
                      }}
                    />
                  </div>
                  <div className="field">
                    <label>{t(locale, 'itineraries.summary')}</label>
                    <textarea value={activityForm.descriptionEs} onChange={(event) => setActivityForm((previous) => ({ ...previous, descriptionEs: event.target.value }))} />
                  </div>
                  <div className="field">
                    <label>{t(locale, 'itineraries.mediaUrl')}</label>
                    <input value={activityForm.mediaUrl} onChange={(event) => setActivityForm((previous) => ({ ...previous, mediaUrl: event.target.value }))} />
                  </div>
                  <div className="two-col">
                    <div className="field">
                      <label>{t(locale, 'itineraries.latitude')}</label>
                      <input value={activityForm.latitude} onChange={(event) => setActivityForm((previous) => ({ ...previous, latitude: event.target.value }))} />
                    </div>
                    <div className="field">
                      <label>{t(locale, 'itineraries.longitude')}</label>
                      <input value={activityForm.longitude} onChange={(event) => setActivityForm((previous) => ({ ...previous, longitude: event.target.value }))} />
                    </div>
                  </div>
                  {activityFormErrorKey ? <p className="inline-delete-error">{t(locale, activityFormErrorKey)}</p> : null}
                  <button type="button" disabled={isCreatingActivity || isSavingAllActivities || Boolean(activityFormErrorKey)} onClick={() => void submitCreateActivity()}>{isCreatingActivity ? t(locale, 'itineraries.creatingActivity') : t(locale, 'itineraries.addActivity')}</button>

                  <div>
                    {activities.length === 0 ? <p className="muted">{t(locale, 'itineraries.emptyActivities')}</p> : null}
                    {activities.map((activity) => (
                      <article key={activity.id} id={`activity-card-${activity.id}`} className="card">
                        {hasActivityLocalChanges(activity) ? <p className="muted">{t(locale, 'itineraries.activityUnsavedChanges')}</p> : null}
                        {activityErrorById[activity.id] ? <p className="inline-delete-error">{t(locale, activityErrorById[activity.id] as string)}</p> : null}
                        <p><strong>{`${activity.activityIndex}. ${activity.title}`}</strong></p>
                        <div className="field">
                          <label>{t(locale, 'itineraries.activityTitle')}</label>
                          <input
                            aria-invalid={Boolean(activityErrorById[activity.id])}
                            className={activityErrorById[activity.id] ? 'input-invalid' : undefined}
                            disabled={savingActivityId === activity.id || isSavingAllActivities}
                            value={activity.title}
                            onChange={(event) => {
                              const nextTitle = event.target.value;
                              setActivities((previous) => previous.map((item) => item.id === activity.id ? { ...item, title: nextTitle } : item));
                              setActivityErrorById((previous) => {
                                const validation = activityValidationKey(nextTitle, activity.priceNet, activity.priceGross);
                                return { ...previous, [activity.id]: validation };
                              });
                            }}
                          />
                        </div>
                        <div className="field">
                          <label>{t(locale, 'itineraries.category')}</label>
                          <select
                            disabled={savingActivityId === activity.id || isSavingAllActivities}
                            value={activity.category}
                            onChange={(event) => setActivities((previous) => previous.map((item) => item.id === activity.id ? { ...item, category: event.target.value as ItineraryDayActivityCategory } : item))}
                          >
                            {ACTIVITY_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
                          </select>
                        </div>
                        <div className="two-col">
                          <div className="field">
                            <label>{t(locale, 'itineraries.priceNet')}</label>
                            <input
                              aria-invalid={Boolean(activityErrorById[activity.id])}
                              className={activityErrorById[activity.id] ? 'input-invalid' : undefined}
                              disabled={savingActivityId === activity.id || isSavingAllActivities}
                              type="number"
                              value={activity.priceNet}
                              onChange={(event) => {
                                const nextPriceNet = Number(event.target.value) || 0;
                                setActivities((previous) => previous.map((item) => item.id === activity.id ? { ...item, priceNet: nextPriceNet } : item));
                                setActivityErrorById((previous) => {
                                  const validation = activityValidationKey(activity.title, nextPriceNet, activity.priceGross);
                                  return { ...previous, [activity.id]: validation };
                                });
                              }}
                            />
                          </div>
                          <div className="field">
                            <label>{t(locale, 'itineraries.priceGross')}</label>
                            <input
                              aria-invalid={Boolean(activityErrorById[activity.id])}
                              className={activityErrorById[activity.id] ? 'input-invalid' : undefined}
                              disabled={savingActivityId === activity.id || isSavingAllActivities}
                              type="number"
                              value={activity.priceGross}
                              onChange={(event) => {
                                const nextPriceGross = Number(event.target.value) || 0;
                                setActivities((previous) => previous.map((item) => item.id === activity.id ? { ...item, priceGross: nextPriceGross } : item));
                                setActivityErrorById((previous) => {
                                  const validation = activityValidationKey(activity.title, activity.priceNet, nextPriceGross);
                                  return { ...previous, [activity.id]: validation };
                                });
                              }}
                            />
                          </div>
                        </div>
                        <p className="muted">{`${t(locale, 'itineraries.total')}: ${currencyFormatter(locale, selectedItinerary.currency).format(activity.priceGross)}`}</p>
                        {activity.mediaUrl ? <img src={activity.mediaUrl} alt={activity.title} style={{ width: '100%', borderRadius: '0.4rem' }} /> : null}
                        {activity.latitude !== undefined && activity.longitude !== undefined ? (
                          <p className="muted">
                            <a href={`https://www.openstreetmap.org/?mlat=${activity.latitude}&mlon=${activity.longitude}#map=14/${activity.latitude}/${activity.longitude}`} target="_blank" rel="noreferrer">
                              {t(locale, 'itineraries.viewMap')}
                            </a>
                          </p>
                        ) : null}
                        <div className="btn-row">
                          <button type="button" className="ghost" disabled={isSavingAllActivities || togglingActivityId === activity.id || savingActivityId === activity.id} onClick={() => void toggleOptional(activity)}>
                            {togglingActivityId === activity.id
                              ? t(locale, 'itineraries.savingDay')
                              : activity.optionalEnabled
                                ? t(locale, 'itineraries.disableOptional')
                                : t(locale, 'itineraries.enableOptional')}
                          </button>
                          <button type="button" className="ghost" disabled={isSavingAllActivities || savingActivityId === activity.id || Boolean(activityErrorById[activity.id])} onClick={() => void submitUpdateActivity(activity)}>
                            {savingActivityId === activity.id ? t(locale, 'itineraries.savingActivity') : t(locale, 'itineraries.saveActivity')}
                          </button>
                          <button type="button" className="ghost" disabled={isSavingAllActivities || savingActivityId === activity.id || !hasActivityLocalChanges(activity)} onClick={() => discardActivityChanges(activity.id)}>
                            {t(locale, 'itineraries.discardActivityChanges')}
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                </>
              ) : <p className="muted">{t(locale, 'itineraries.selectDay')}</p>}
                </>
              ) : null}
            </section>
          </div>
        </section>
      ) : null}
    </section>
  );
}
