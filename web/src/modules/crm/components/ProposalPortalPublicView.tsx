import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { t } from '../i18n';
import type { Locale, PortalProposalActionEvent, PortalProposalView } from '../types';

interface ProposalPortalPublicViewProps {
  locale: Locale;
  proposalHash: string;
  onLoadProposal: (hash: string) => Promise<{ proposal: PortalProposalView | null; status: number; message: string }>;
  onApprove: (hash: string, message?: string) => Promise<{ ok: boolean; message: string; data: PortalProposalActionEvent | null }>;
  onRequestRevision: (hash: string, feedback: string) => Promise<{ ok: boolean; message: string; data: PortalProposalActionEvent | null }>;
}

type PortalUnavailableReason = 'invalid_hash' | 'not_found_or_inactive' | 'unknown';
type PortalSectionId = 'portal-overview' | 'portal-financial' | 'portal-actions' | 'portal-history';
const PORTAL_SECTION_IDS: PortalSectionId[] = ['portal-overview', 'portal-financial', 'portal-actions', 'portal-history'];

function isPortalHashFormatValid(hash: string): boolean {
  return /^[a-zA-Z0-9]{16,64}$/.test(hash);
}

function localizedPortalEnumLabel(locale: Locale, keyPrefix: string, value: string): string {
  const key = `${keyPrefix}.${value}`;
  const translated = t(locale, key);
  return translated === key ? value : translated;
}

function actionLabel(locale: Locale, action: PortalProposalActionEvent['action']): string {
  return localizedPortalEnumLabel(locale, 'itineraries.portalAction', action);
}

function publicationStatusLabel(locale: Locale, status: PortalProposalView['publication']['status']): string {
  return localizedPortalEnumLabel(locale, 'itineraries.portalPublicationStatus', status);
}

function actorTypeLabel(locale: Locale, actorType: PortalProposalActionEvent['actorType']): string {
  return localizedPortalEnumLabel(locale, 'itineraries.portalActorType', actorType);
}

function formatCurrency(locale: Locale, amount: number, currency: 'MXN' | 'USD' | 'EUR'): string {
  const languageTag = locale === 'es-MX' ? 'es-MX' : 'en-US';
  return new Intl.NumberFormat(languageTag, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

function formatActionDate(locale: Locale, value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  const languageTag = locale === 'es-MX' ? 'es-MX' : 'en-US';
  return new Intl.DateTimeFormat(languageTag, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(parsed);
}

function actionBadgeClass(action: PortalProposalActionEvent['action']): string {
  if (action === 'approve') return 'portal-action-badge approve';
  if (action === 'request_revision') return 'portal-action-badge revise';
  return 'portal-action-badge open';
}

export function ProposalPortalPublicView({
  locale,
  proposalHash,
  onLoadProposal,
  onApprove,
  onRequestRevision
}: ProposalPortalPublicViewProps) {
  const [proposal, setProposal] = useState<PortalProposalView | null>(null);
  const [statusText, setStatusText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isActionRunning, setIsActionRunning] = useState(false);
  const [approveMessage, setApproveMessage] = useState('');
  const [revisionFeedback, setRevisionFeedback] = useState('');
  const [unavailableReason, setUnavailableReason] = useState<PortalUnavailableReason>('unknown');
  const [unavailableDetail, setUnavailableDetail] = useState('');
  const [activeSection, setActiveSection] = useState<PortalSectionId>('portal-overview');
  const unavailableSectionRef = useRef<HTMLElement | null>(null);

  function scrollToSection(sectionId: PortalSectionId) {
    if (typeof document === 'undefined') return;
    setActiveSection(sectionId);
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function requestNewLink() {
    if (typeof window === 'undefined') return;
    const subject = encodeURIComponent(t(locale, 'itineraries.portalRequestNewLinkSubject'));
    const body = encodeURIComponent(`${t(locale, 'itineraries.portalReference')}: ${proposalHash}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }

  const sortedActions = useMemo(() => {
    if (!proposal) return [];
    return [...proposal.actions].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }, [proposal]);

  const publicationIsActive = proposal?.publication.status === 'active';
  const hasValidProposalHash = isPortalHashFormatValid(proposalHash);

  const unavailableTitle = unavailableReason === 'invalid_hash'
    ? t(locale, 'itineraries.portalInvalidLinkTitle')
    : unavailableReason === 'not_found_or_inactive'
      ? t(locale, 'itineraries.portalNotFoundTitle')
      : t(locale, 'itineraries.portalUnavailableTitle');

  const unavailableDescription = unavailableReason === 'invalid_hash'
    ? t(locale, 'itineraries.portalInvalidLinkDescription')
    : unavailableReason === 'not_found_or_inactive'
      ? t(locale, 'itineraries.portalNotFoundDescription')
      : t(locale, 'itineraries.portalUnavailableDescription');

  const loadProposal = useCallback(async () => {
    try {
      setIsLoading(true);
      setUnavailableDetail('');
      if (!isPortalHashFormatValid(proposalHash)) {
        setProposal(null);
        setUnavailableReason('invalid_hash');
        setStatusText('');
        return;
      }

      const loaded = await onLoadProposal(proposalHash);
      if (!loaded.proposal) {
        setProposal(null);
        setUnavailableReason(loaded.status === 404 ? 'not_found_or_inactive' : 'unknown');
        setUnavailableDetail(loaded.message);
        setStatusText('');
        return;
      }

      setProposal(loaded.proposal);
      setUnavailableReason('unknown');
      setUnavailableDetail('');
      setStatusText('');
    } catch {
      setProposal(null);
      setUnavailableReason('unknown');
      setUnavailableDetail('');
      setStatusText('');
    } finally {
      setIsLoading(false);
    }
  }, [onLoadProposal, proposalHash]);

  useEffect(() => {
    void loadProposal();
  }, [loadProposal]);

  useEffect(() => {
    if (!isLoading && !proposal) {
      unavailableSectionRef.current?.focus();
    }
  }, [isLoading, proposal]);

  useEffect(() => {
    if (typeof window === 'undefined' || !proposal) return;

    const sections = PORTAL_SECTION_IDS
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => Boolean(element));

    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio);

        if (visibleEntries.length === 0) return;

        const nextId = visibleEntries[0]?.target.id as PortalSectionId | undefined;
        if (!nextId) return;
        setActiveSection(nextId);
      },
      {
        root: null,
        rootMargin: '-96px 0px -45% 0px',
        threshold: [0.2, 0.5, 0.75]
      }
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [proposal]);

  async function approveProposal() {
    if (isActionRunning || !publicationIsActive) return;
    try {
      setIsActionRunning(true);
      const response = await onApprove(proposalHash, approveMessage || undefined);
      setStatusText(response.message);
      if (response.ok) {
        await loadProposal();
      }
    } catch {
      setStatusText(t(locale, 'itineraries.portalActionError'));
    } finally {
      setIsActionRunning(false);
    }
  }

  async function requestRevision() {
    if (!revisionFeedback.trim() || isActionRunning || !publicationIsActive) {
      if (!revisionFeedback.trim()) setStatusText(t(locale, 'itineraries.portalFeedbackRequired'));
      return;
    }

    try {
      setIsActionRunning(true);
      const response = await onRequestRevision(proposalHash, revisionFeedback.trim());
      setStatusText(response.message);
      if (response.ok) {
        await loadProposal();
      }
    } catch {
      setStatusText(t(locale, 'itineraries.portalActionError'));
    } finally {
      setIsActionRunning(false);
    }
  }

  return (
    <>
      <a className="portal-skip-link" href="#portal-main-content">{t(locale, 'itineraries.portalSkipToContent')}</a>
      <main
        id="portal-main-content"
        className="crm-content portal-public-shell"
        style={{ minHeight: '100vh', maxWidth: '920px', margin: '0 auto' }}
      >
      <section className="card">
        <h2>{t(locale, 'itineraries.portalPublicTitle')}</h2>
        <p className="muted">{t(locale, 'itineraries.portalPublicSubtitle')}</p>
        {hasValidProposalHash ? (
          <div className="btn-row">
            <button type="button" className="ghost" disabled={isLoading || isActionRunning} onClick={() => void loadProposal()}>
              {t(locale, 'itineraries.portalRefreshCta')}
            </button>
          </div>
        ) : null}
      </section>

      {proposal ? (
        <nav className="card portal-public-nav" aria-label={t(locale, 'itineraries.portalNavTitle')}>
          <button
            type="button"
            className="ghost"
            aria-current={activeSection === 'portal-overview' ? 'location' : undefined}
            onClick={() => scrollToSection('portal-overview')}
          >
            {t(locale, 'itineraries.portalNavOverview')}
          </button>
          <button
            type="button"
            className="ghost"
            aria-current={activeSection === 'portal-financial' ? 'location' : undefined}
            onClick={() => scrollToSection('portal-financial')}
          >
            {t(locale, 'itineraries.portalNavFinancial')}
          </button>
          <button
            type="button"
            className="ghost"
            aria-current={activeSection === 'portal-actions' ? 'location' : undefined}
            onClick={() => scrollToSection('portal-actions')}
          >
            {t(locale, 'itineraries.portalNavActions')}
          </button>
          <button
            type="button"
            className="ghost"
            aria-current={activeSection === 'portal-history' ? 'location' : undefined}
            onClick={() => scrollToSection('portal-history')}
          >
            {t(locale, 'itineraries.portalNavHistory')}
          </button>
        </nav>
      ) : null}

      {statusText ? <div className="status warn" role="status" aria-live="polite">{statusText}</div> : null}
      {isLoading ? <div className="status" role="status" aria-live="polite">{t(locale, 'itineraries.portalLoading')}</div> : null}

      {!isLoading && !proposal ? (
        <section
          ref={unavailableSectionRef}
          className="card portal-unavailable-state"
          role="status"
          aria-live="polite"
          tabIndex={-1}
        >
          <h3>{unavailableTitle}</h3>
          <p className="muted">{unavailableDescription}</p>
          {unavailableDetail ? <p className="muted">{unavailableDetail}</p> : null}
          <p id="portal-reference" className="muted">{`${t(locale, 'itineraries.portalReference')}: ${proposalHash}`}</p>
          <div className="btn-row">
            {unavailableReason === 'invalid_hash' ? (
              <>
                <button
                  type="button"
                  className="ghost"
                  onClick={requestNewLink}
                  aria-describedby="portal-reference"
                  aria-label={`${t(locale, 'itineraries.portalRequestNewLinkCta')}. ${t(locale, 'itineraries.portalReference')}: ${proposalHash}`}
                >
                  {t(locale, 'itineraries.portalRequestNewLinkCta')}
                </button>
                <p className="muted">{t(locale, 'itineraries.portalRequestNewLinkHint')}</p>
              </>
            ) : (
              <button
                type="button"
                onClick={() => void loadProposal()}
                aria-describedby="portal-reference"
                aria-label={`${t(locale, 'itineraries.portalRetryCta')}. ${t(locale, 'itineraries.portalReference')}: ${proposalHash}`}
              >
                {t(locale, 'itineraries.portalRetryCta')}
              </button>
            )}
          </div>
        </section>
      ) : null}

      {proposal ? (
        <>
          <section className="card portal-proposal-hero">
            <div className="portal-hero-topline">
              <h3>{proposal.itinerary.title}</h3>
              <span className={`portal-publication-badge ${proposal.publication.status}`}>
                {publicationStatusLabel(locale, proposal.publication.status)}
              </span>
            </div>
            <p className="muted">{t(locale, 'itineraries.portalHeroHint')}</p>
            <div className="btn-row">
              <button type="button" disabled={!publicationIsActive} onClick={() => scrollToSection('portal-actions')}>
                {t(locale, 'itineraries.portalHeroPrimaryCta')}
              </button>
              <button type="button" className="ghost" onClick={() => scrollToSection('portal-history')}>
                {t(locale, 'itineraries.portalHeroSecondaryCta')}
              </button>
            </div>
          </section>

          {!publicationIsActive ? (
            <div className="status blocked">
              {proposal.publication.status === 'expired'
                ? t(locale, 'itineraries.portalExpiredWarning')
                : t(locale, 'itineraries.portalRevokedWarning')}
            </div>
          ) : null}

          <section id="portal-overview" className="card">
            <h3>{t(locale, 'itineraries.portalItineraryTitle')}</h3>
            <p><strong>{proposal.itinerary.title}</strong></p>
            <p className="muted">{`${t(locale, 'itineraries.portalStatusLabel')}: ${publicationStatusLabel(locale, proposal.publication.status)}`}</p>
            <p className="muted">{`${t(locale, 'itineraries.publishedAt')}: ${formatActionDate(locale, proposal.publication.publishedAt)}`}</p>
            {proposal.publication.expiresAt ? <p className="muted">{`${t(locale, 'itineraries.proposalExpiresAt')}: ${formatActionDate(locale, proposal.publication.expiresAt)}`}</p> : null}
            {proposal.publication.lastViewedAt ? <p className="muted">{`${t(locale, 'itineraries.lastViewedAt')}: ${formatActionDate(locale, proposal.publication.lastViewedAt)}`}</p> : null}
          </section>

          <section id="portal-financial" className="card">
            <h3>{t(locale, 'itineraries.portalFinancialTitle')}</h3>
            <div className="portal-summary-grid">
              <article className="sub-card">
                <p className="muted">{t(locale, 'itineraries.portalGrossTotal')}</p>
                <p><strong>{formatCurrency(locale, proposal.itinerary.grossTotal, proposal.itinerary.currency)}</strong></p>
              </article>
              <article className="sub-card">
                <p className="muted">{t(locale, 'itineraries.portalNetTotal')}</p>
                <p><strong>{formatCurrency(locale, proposal.itinerary.netTotal, proposal.itinerary.currency)}</strong></p>
              </article>
              <article className="sub-card">
                <p className="muted">{t(locale, 'itineraries.portalMarkupAmount')}</p>
                <p><strong>{formatCurrency(locale, proposal.itinerary.markupAmount, proposal.itinerary.currency)}</strong></p>
              </article>
              <article className="sub-card">
                <p className="muted">{t(locale, 'itineraries.portalServiceFee')}</p>
                <p><strong>{formatCurrency(locale, proposal.itinerary.serviceFeeAmount, proposal.itinerary.currency)}</strong></p>
              </article>
            </div>
          </section>

          <section id="portal-actions" className="card">
            <div className="field">
              <label>{t(locale, 'itineraries.portalApproveMessage')}</label>
              <textarea value={approveMessage} onChange={(event) => setApproveMessage(event.target.value)} />
            </div>
            <button type="button" disabled={isActionRunning} onClick={() => void approveProposal()}>
              {t(locale, 'itineraries.portalApproveCta')}
            </button>

            <div className="field" style={{ marginTop: '1rem' }}>
              <label>{t(locale, 'itineraries.portalRevisionFeedback')}</label>
              <textarea value={revisionFeedback} onChange={(event) => setRevisionFeedback(event.target.value)} />
            </div>
            <button type="button" className="ghost" disabled={isActionRunning || !publicationIsActive || !revisionFeedback.trim()} onClick={() => void requestRevision()}>
              {t(locale, 'itineraries.portalRevisionCta')}
            </button>
          </section>

          <section id="portal-history" className="card" aria-labelledby="portal-history-title">
            <h3 id="portal-history-title">{t(locale, 'itineraries.portalActionsTitle')}</h3>
            {sortedActions.length === 0 ? <p className="muted">{t(locale, 'itineraries.portalNoActions')}</p> : null}
            {sortedActions.length > 0 ? (
              <ol className="portal-history-list" aria-label={t(locale, 'itineraries.portalActionsTitle')}>
                {sortedActions.map((action, index) => {
                  const eventTitleId = `portal-event-title-${action.id}`;
                  const eventDate = formatActionDate(locale, action.createdAt);
                  return (
                    <li key={action.id}>
                      <article className="card portal-history-item" aria-labelledby={eventTitleId}>
                        <div className="portal-history-topline">
                          <h4 id={eventTitleId} className={actionBadgeClass(action.action)}>{actionLabel(locale, action.action)}</h4>
                          <span className="muted">{`${t(locale, 'itineraries.eventAt')}: ${eventDate}`}</span>
                        </div>
                        <p className="muted">{`${t(locale, 'itineraries.actorType')}: ${actorTypeLabel(locale, action.actorType)}`}</p>
                        <p className="muted">{`${t(locale, 'itineraries.portalEventNumber')}: ${index + 1}`}</p>
                        {action.message ? <p className="muted">{action.message}</p> : null}
                      </article>
                    </li>
                  );
                })}
              </ol>
            ) : null}
          </section>
        </>
      ) : null}
      </main>
    </>
  );
}
