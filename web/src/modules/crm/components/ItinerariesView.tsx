import { useMemo, useState } from 'react';
import { t } from '../i18n';
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
    setMovingItineraryId(itineraryId);
    const response = await onMovePipeline(itineraryId, toStatus);
    setActionResult(response.message);
    setMovingItineraryId(null);
  }

  async function openBuilder(itineraryId: string) {
    setSelectedItineraryId(itineraryId);
    setPublication(null);
    setPortalPreview(null);
    setPortalMessage('');
    setPortalFeedback('');
    setPublishExpiresAt('');
    const loadedDays = await onListDays(itineraryId);
    setDays(loadedDays);
    setSelectedDayId(loadedDays[0]?.id ?? null);
    if (loadedDays[0]?.id) {
      const loadedActivities = await onListDayActivities(itineraryId, loadedDays[0].id);
      setActivities(loadedActivities);
    } else {
      setActivities([]);
    }
  }

  async function selectDay(dayId: string) {
    setSelectedDayId(dayId);
    if (!selectedItineraryId) return;
    const loadedActivities = await onListDayActivities(selectedItineraryId, dayId);
    setActivities(loadedActivities);
  }

  async function submitCreateDay() {
    if (!selectedItineraryId || !dayForm.title.trim()) return;
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
  }

  async function submitUpdateDay(day: ItineraryDay) {
    if (!selectedItineraryId) return;
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
  }

  async function submitCreateActivity() {
    if (!selectedItineraryId || !selectedDayId || !activityForm.title.trim()) return;
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
    setActivities(loadedActivities);
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
  }

  async function toggleOptional(activity: ItineraryDayActivity) {
    if (!selectedItineraryId || !selectedDayId) return;
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
    setActivities(loadedActivities);
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

  async function searchLibrary() {
    const results = await onSearchDestinationLibrary({
      location: libraryQuery.location || undefined,
      category: libraryQuery.category,
      limit: 10
    });
    setLibraryResults(results);
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
      {actionResult ? <p className="muted">{actionResult}</p> : null}
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
                      {t(locale, 'itineraries.openBuilder')}
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
          <h3>{t(locale, 'itineraries.builderTitle').replace('{title}', selectedItinerary.title)}</h3>
          <p className="muted">{`${t(locale, 'itineraries.total')}: ${currencyFormatter(locale, selectedItinerary.currency).format(selectedItinerary.grossTotal)}`}</p>

          <section className="card">
            <h3>{t(locale, 'itineraries.proposalTitle')}</h3>
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
                <p className="muted">{`${t(locale, 'itineraries.portalStatus')}: ${portalPreview.publication.status}`}</p>
                <p className="muted">{`${t(locale, 'itineraries.portalActionsCount')}: ${portalPreview.actions.length}`}</p>
                {portalPreview.publication.lastViewedAt ? <p className="muted">{`${t(locale, 'itineraries.lastViewedAt')}: ${portalPreview.publication.lastViewedAt}`}</p> : null}
                <div className="field">
                  <label>{t(locale, 'itineraries.portalApproveMessage')}</label>
                  <input value={portalMessage} onChange={(event) => setPortalMessage(event.target.value)} />
                </div>
                <button type="button" className="ghost" disabled={isPortalActionRunning || isLoadingPortal} onClick={() => void approveFromPortal()}>{t(locale, 'itineraries.portalApprove')}</button>
                <div className="field">
                  <label>{t(locale, 'itineraries.portalRevisionFeedback')}</label>
                  <textarea value={portalFeedback} onChange={(event) => setPortalFeedback(event.target.value)} />
                </div>
                <button type="button" className="ghost" disabled={isPortalActionRunning || isLoadingPortal || !portalFeedback.trim()} onClick={() => void requestRevisionFromPortal()}>{t(locale, 'itineraries.portalRequestRevision')}</button>
                <div>
                  <h3>{t(locale, 'itineraries.portalTimeline')}</h3>
                  {portalActions.length === 0 ? <p className="muted">{t(locale, 'itineraries.portalTimelineEmpty')}</p> : null}
                  {portalActions.map((event) => (
                    <article key={event.id} className="card">
                      <p><strong>{event.action}</strong></p>
                      <p className="muted">{`${t(locale, 'itineraries.actorType')}: ${event.actorType}`}</p>
                      <p className="muted">{`${t(locale, 'itineraries.eventAt')}: ${event.createdAt}`}</p>
                      {event.message ? <p className="muted">{event.message}</p> : null}
                    </article>
                  ))}
                </div>
              </div>
            ) : null}
          </section>

          <div className="two-col">
            <section className="card">
              <h3>{t(locale, 'itineraries.daysTitle')}</h3>
              <div className="field">
                <label>{t(locale, 'itineraries.dayIndex')}</label>
                <input type="number" value={dayForm.dayIndex} onChange={(event) => setDayForm((previous) => ({ ...previous, dayIndex: Number(event.target.value) || 1 }))} />
              </div>
              <div className="field">
                <label>{t(locale, 'itineraries.dayTitle')}</label>
                <input value={dayForm.title} onChange={(event) => setDayForm((previous) => ({ ...previous, title: event.target.value }))} />
              </div>
              <div className="field">
                <label>{t(locale, 'itineraries.dayDate')}</label>
                <input type="date" value={dayForm.dayDate} onChange={(event) => setDayForm((previous) => ({ ...previous, dayDate: event.target.value }))} />
              </div>
              <div className="field">
                <label>{t(locale, 'itineraries.summary')}</label>
                <textarea value={dayForm.summary} onChange={(event) => setDayForm((previous) => ({ ...previous, summary: event.target.value }))} />
              </div>
              <button type="button" onClick={() => void submitCreateDay()}>{t(locale, 'itineraries.addDay')}</button>

              <div>
                {days.map((day) => (
                  <article key={day.id} className="card">
                    <button type="button" className="ghost" onClick={() => void selectDay(day.id)}>{`${t(locale, 'itineraries.dayLabel')} ${day.dayIndex}`}</button>
                    <div className="field">
                      <label>{t(locale, 'itineraries.dayTitle')}</label>
                      <input
                        value={day.title}
                        onChange={(event) => setDays((previous) => previous.map((item) => item.id === day.id ? { ...item, title: event.target.value } : item))}
                      />
                    </div>
                    <button type="button" className="ghost" onClick={() => void submitUpdateDay(day)}>{t(locale, 'common.actions.save')}</button>
                  </article>
                ))}
              </div>
            </section>

            <section className="card">
              <h3>{t(locale, 'itineraries.activitiesTitle')}</h3>
              {selectedDayId ? (
                <>
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
                    <button type="button" className="ghost" onClick={() => void searchLibrary()}>{t(locale, 'itineraries.searchLibrary')}</button>
                    <div>
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
                    <input value={activityForm.title} onChange={(event) => setActivityForm((previous) => ({ ...previous, title: event.target.value }))} />
                  </div>
                  <div className="field">
                    <label>{t(locale, 'itineraries.category')}</label>
                    <select value={activityForm.category} onChange={(event) => setActivityForm((previous) => ({ ...previous, category: event.target.value as ItineraryDayActivityCategory }))}>
                      {ACTIVITY_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <label>{t(locale, 'itineraries.priceNet')}</label>
                    <input type="number" value={activityForm.priceNet} onChange={(event) => setActivityForm((previous) => ({ ...previous, priceNet: event.target.value }))} />
                  </div>
                  <div className="field">
                    <label>{t(locale, 'itineraries.priceGross')}</label>
                    <input type="number" value={activityForm.priceGross} onChange={(event) => setActivityForm((previous) => ({ ...previous, priceGross: event.target.value }))} />
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
                  <button type="button" onClick={() => void submitCreateActivity()}>{t(locale, 'itineraries.addActivity')}</button>

                  <div>
                    {activities.map((activity) => (
                      <article key={activity.id} className="card">
                        <p><strong>{`${activity.activityIndex}. ${activity.title}`}</strong></p>
                        <p className="muted">{`${t(locale, 'itineraries.total')}: ${currencyFormatter(locale, selectedItinerary.currency).format(activity.priceGross)}`}</p>
                        {activity.mediaUrl ? <img src={activity.mediaUrl} alt={activity.title} style={{ width: '100%', borderRadius: '0.4rem' }} /> : null}
                        {activity.latitude !== undefined && activity.longitude !== undefined ? (
                          <p className="muted">
                            <a href={`https://www.openstreetmap.org/?mlat=${activity.latitude}&mlon=${activity.longitude}#map=14/${activity.latitude}/${activity.longitude}`} target="_blank" rel="noreferrer">
                              {t(locale, 'itineraries.viewMap')}
                            </a>
                          </p>
                        ) : null}
                        <button type="button" className="ghost" onClick={() => void toggleOptional(activity)}>
                          {activity.optionalEnabled ? t(locale, 'itineraries.disableOptional') : t(locale, 'itineraries.enableOptional')}
                        </button>
                      </article>
                    ))}
                  </div>
                </>
              ) : <p className="muted">{t(locale, 'itineraries.selectDay')}</p>}
            </section>
          </div>
        </section>
      ) : null}
    </section>
  );
}
