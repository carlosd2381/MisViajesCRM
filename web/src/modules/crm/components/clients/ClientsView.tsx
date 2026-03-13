import { useEffect, useMemo, useState } from 'react';
import { t } from '../../i18n';
import type { ClientsViewProps } from './types';
import { ClientsTable } from './ClientsTable';
import { ContactTab } from './tabs/ContactTab';
import { CurrentTripsTab } from './tabs/CurrentTripsTab';
import { DatesTab } from './tabs/DatesTab';
import { DocumentsTab } from './tabs/DocumentsTab';
import { FilesTab } from './tabs/FilesTab';
import { LoyaltyTab } from './tabs/LoyaltyTab';
import { NotesTab } from './tabs/NotesTab';
import { PreferencesTab } from './tabs/PreferencesTab';
import { RelationshipsTab } from './tabs/RelationshipsTab';
import { TripsTab } from './tabs/TripsTab';
import { VaccinesTab } from './tabs/VaccinesTab';

export function ClientsView({
  locale,
  profileTab,
  setProfileTab,
  profileTabs,
  profile,
  phones,
  emails,
  addresses,
  relationships,
  loyaltyPrograms,
  clients,
  selectedClientId,
  pendingDeleteClientId,
  deleteClientError,
  changedProfileSections,
  profileErrors,
  profileSaveResult,
  updateProfileField,
  toggleArrayField,
  setPhones,
  setEmails,
  setAddresses,
  setRelationships,
  setLoyaltyPrograms,
  setIsDirty,
  onCancel,
  onSave,
  onRefreshClients,
  onViewClient,
  onRequestDeleteClient,
  onCancelDeleteClient,
  onDeleteClient,
  onForceDeleteClient,
  onStartNewProfile,
}: ClientsViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activePage, setActivePage] = useState<'list' | 'detail' | 'create'>('list');
  const selectedClient = selectedClientId ? clients.find((client) => client.id === selectedClientId) ?? null : null;
  useEffect(() => {
    if (!selectedClientId) return;
    setActivePage('detail');
  }, [selectedClientId]);

  const filteredClients = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return clients;
    return clients.filter((client) =>
      client.id.toLowerCase().includes(term)
      || client.firstName.toLowerCase().includes(term)
      || client.paternalLastName.toLowerCase().includes(term)
      || (client.contacts?.[0]?.value ?? '').toLowerCase().includes(term)
    );
  }, [clients, searchTerm]);

  function renderProfileTabs() {
    return (
      <div className="profile-shell">
        <aside className="profile-tabs">
          {profileTabs.map((tab) => (
            <button key={tab.key} type="button" className={`profile-tab-btn ${profileTab === tab.key ? 'active' : ''}`} onClick={() => setProfileTab(tab.key)}>{tab.label}</button>
          ))}
        </aside>

        <div>
          {profileTab === 'contact' ? (
            <ContactTab
              locale={locale}
              profile={profile}
              phones={phones}
              emails={emails}
              addresses={addresses}
              updateProfileField={updateProfileField}
              setPhones={setPhones}
              setEmails={setEmails}
              setAddresses={setAddresses}
              setIsDirty={setIsDirty}
            />
          ) : null}
          {profileTab === 'relationships' ? <RelationshipsTab locale={locale} clients={clients} relationships={relationships} setRelationships={setRelationships} setIsDirty={setIsDirty} /> : null}
          {profileTab === 'loyalty' ? <LoyaltyTab locale={locale} loyaltyPrograms={loyaltyPrograms} setLoyaltyPrograms={setLoyaltyPrograms} setIsDirty={setIsDirty} /> : null}
          {profileTab === 'currentTrips' ? <CurrentTripsTab locale={locale} profile={profile} updateProfileField={updateProfileField} /> : null}
          {profileTab === 'dates' ? <DatesTab locale={locale} profile={profile} updateProfileField={updateProfileField} /> : null}
          {profileTab === 'preferences' ? <PreferencesTab locale={locale} profile={profile} updateProfileField={updateProfileField} toggleArrayField={toggleArrayField} /> : null}
          {profileTab === 'documents' ? <DocumentsTab locale={locale} profile={profile} updateProfileField={updateProfileField} /> : null}
          {profileTab === 'vaccines' ? <VaccinesTab locale={locale} profile={profile} updateProfileField={updateProfileField} /> : null}
          {profileTab === 'files' ? <FilesTab locale={locale} /> : null}
          {profileTab === 'notes' ? <NotesTab locale={locale} profile={profile} updateProfileField={updateProfileField} /> : null}
          {profileTab === 'trips' ? <TripsTab locale={locale} profile={profile} updateProfileField={updateProfileField} /> : null}
        </div>
      </div>
    );
  }

  if (activePage === 'detail') {
    if (!selectedClient) {
      return (
        <section className="card">
          <h2>{t(locale, 'clients.detailTitle')}</h2>
          <div className="btn-row"><button type="button" className="ghost" onClick={() => setActivePage('list')}>{t(locale, 'common.actions.backToList')}</button></div>
          <p className="muted">{t(locale, 'common.selectRow')}</p>
        </section>
      );
    }

    return (
      <section className="card">
        <h2>{t(locale, 'clients.detailTitle')}</h2>
        <div className="btn-row"><button type="button" className="ghost" onClick={() => setActivePage('list')}>{t(locale, 'common.actions.backToList')}</button></div>

        {changedProfileSections.length > 0 ? (
          <p className="muted">{t(locale, 'clients.changedSections')}: {changedProfileSections.map((section) => t(locale, `clients.profileTabs.${section}`)).join(', ')}</p>
        ) : null}

        {renderProfileTabs()}

        <div className="profile-footer">
          <button type="button" className="ghost" onClick={() => setActivePage('list')}>{t(locale, 'common.actions.backToList')}</button>
          <button type="button" onClick={onSave}>{t(locale, 'common.actions.save')}</button>
        </div>

        {profileErrors.length > 0 ? <pre className="form-errors">{profileErrors.map((error) => `• ${error}`).join('\n')}</pre> : null}
        <pre className="result">{profileSaveResult}</pre>
      </section>
    );
  }

  if (activePage === 'create') {
    return (
      <section className="card">
        <h2>{t(locale, 'clients.title')}</h2>
        <div className="btn-row"><span className="pill">{t(locale, 'clients.modeNew')}</span></div>
        {changedProfileSections.length > 0 ? (
          <p className="muted">{t(locale, 'clients.changedSections')}: {changedProfileSections.map((section) => t(locale, `clients.profileTabs.${section}`)).join(', ')}</p>
        ) : null}
        {renderProfileTabs()}

        <div className="profile-footer">
          <button type="button" className="ghost" onClick={() => { onCancel(); setActivePage('list'); }}>{t(locale, 'common.actions.cancel')}</button>
          <button type="button" onClick={onSave}>{t(locale, 'common.actions.save')}</button>
        </div>

        {profileErrors.length > 0 ? <pre className="form-errors">{profileErrors.map((error) => `• ${error}`).join('\n')}</pre> : null}
        <pre className="result">{profileSaveResult}</pre>
      </section>
    );
  }

  return (
    <ClientsTable
      locale={locale}
      clients={filteredClients}
      searchTerm={searchTerm}
      onSearchTermChange={setSearchTerm}
      selectedClientId={selectedClientId}
      pendingDeleteClientId={pendingDeleteClientId}
      deleteClientError={deleteClientError}
      onRefreshClients={onRefreshClients}
      onStartNewProfile={() => {
        onStartNewProfile();
        setActivePage('create');
      }}
      onViewClient={(clientId) => {
        onViewClient(clientId);
        setActivePage('detail');
      }}
      onRequestDeleteClient={onRequestDeleteClient}
      onCancelDeleteClient={onCancelDeleteClient}
      onDeleteClient={onDeleteClient}
      onForceDeleteClient={onForceDeleteClient}
    />
  );
}
