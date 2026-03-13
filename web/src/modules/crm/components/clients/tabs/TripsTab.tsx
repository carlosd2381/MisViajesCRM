import { t } from '../../../i18n';
import type { ClientTabSharedProps } from '../types';

export function TripsTab({ locale, profile, updateProfileField }: ClientTabSharedProps) {
  return (
    <div className="sub-card">
      <h3>{t(locale, 'clients.sections.trips')}</h3>
      <div className="field"><label>{t(locale, 'clients.fields.pastTrips')}</label><input value={profile.pastTrips} onChange={(event) => updateProfileField('pastTrips', event.target.value)} /></div>
    </div>
  );
}
