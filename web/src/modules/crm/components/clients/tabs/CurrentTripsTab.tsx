import { list, t } from '../../../i18n';
import type { ClientTabSharedProps } from '../types';

export function CurrentTripsTab({ locale, profile, updateProfileField }: ClientTabSharedProps) {
  const serviceTypes = list(locale, 'options.leadServiceTypes');

  function updateLinkedRef(index: number, value: string) {
    const next = [...profile.currentTripLinkedRefs];
    next[index] = value;
    updateProfileField('currentTripLinkedRefs', next);
  }

  function addLinkedRef() {
    updateProfileField('currentTripLinkedRefs', [...profile.currentTripLinkedRefs, '']);
  }

  function removeLinkedRef(index: number) {
    updateProfileField('currentTripLinkedRefs', profile.currentTripLinkedRefs.filter((_, itemIndex) => itemIndex !== index));
  }

  return (
    <div className="sub-card">
      <h3>{t(locale, 'clients.sections.currentTrips')}</h3>
      <div className="field"><label>{t(locale, 'clients.fields.currentTripDestination')}</label><input value={profile.currentTripDestination} onChange={(event) => updateProfileField('currentTripDestination', event.target.value)} /></div>
      <div className="profile-grid-2">
        <div className="field"><label>{t(locale, 'clients.fields.currentTripDate')}</label><input type="date" value={profile.currentTripDate} onChange={(event) => updateProfileField('currentTripDate', event.target.value)} /></div>
        <div className="field"><label>{t(locale, 'clients.fields.currentTripTravelers')}</label><input value={profile.currentTripTravelers} onChange={(event) => updateProfileField('currentTripTravelers', event.target.value)} /></div>
      </div>
      <div className="field">
        <label>{t(locale, 'clients.fields.currentTripServices')}</label>
        <div className="checkbox-grid">
          {serviceTypes.map((serviceType) => {
            const checked = profile.currentTripServices.includes(serviceType);
            return (
              <label key={serviceType}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => {
                    updateProfileField(
                      'currentTripServices',
                      checked
                        ? profile.currentTripServices.filter((item) => item !== serviceType)
                        : [...profile.currentTripServices, serviceType]
                    );
                  }}
                />
                {serviceType}
              </label>
            );
          })}
        </div>
      </div>
      <div className="field"><label>{t(locale, 'clients.fields.currentTripPreferences')}</label><input value={profile.currentTripPreferences} onChange={(event) => updateProfileField('currentTripPreferences', event.target.value)} /></div>
      <div className="field"><label>{t(locale, 'clients.fields.currentTripNotes')}</label><textarea value={profile.currentTripNotes} onChange={(event) => updateProfileField('currentTripNotes', event.target.value)} /></div>
      <div className="field"><label>{t(locale, 'clients.fields.currentTripProposalRef')}</label><input value={profile.currentTripProposalRef} onChange={(event) => updateProfileField('currentTripProposalRef', event.target.value)} /></div>
      <div className="field">
        <label>{t(locale, 'clients.fields.currentTripLinkedRefs')}</label>
        {profile.currentTripLinkedRefs.map((linkedRef, index) => (
          <div key={`current-trip-link-${index}`} className="trip-link-row">
            <input
              value={linkedRef}
              placeholder={t(locale, 'clients.placeholders.currentTripLink')}
              onChange={(event) => updateLinkedRef(index, event.target.value)}
            />
            <button type="button" className="ghost" onClick={() => removeLinkedRef(index)}>{t(locale, 'common.actions.delete')}</button>
          </div>
        ))}
        <button type="button" className="ghost" onClick={addLinkedRef}>{t(locale, 'clients.actions.addCurrentTripLink')}</button>
      </div>
    </div>
  );
}
