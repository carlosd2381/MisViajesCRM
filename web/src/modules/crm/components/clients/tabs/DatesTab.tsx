import { t } from '../../../i18n';
import type { ClientTabSharedProps } from '../types';

export function DatesTab({ locale, profile, updateProfileField }: ClientTabSharedProps) {
  return (
    <div className="sub-card">
      <h3>{t(locale, 'clients.sections.importantDates')}</h3>
      <div className="profile-grid-2">
        <div className="field"><label>{t(locale, 'clients.fields.birthDate')}</label><input type="date" value={profile.birthDate} onChange={(event) => updateProfileField('birthDate', event.target.value)} /></div>
        <div className="field"><label>{t(locale, 'clients.fields.anniversaryDate')}</label><input type="date" value={profile.anniversaryDate} onChange={(event) => updateProfileField('anniversaryDate', event.target.value)} /></div>
      </div>
    </div>
  );
}
