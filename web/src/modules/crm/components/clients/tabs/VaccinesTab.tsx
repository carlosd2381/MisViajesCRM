import { t } from '../../../i18n';
import type { ClientTabSharedProps } from '../types';

export function VaccinesTab({ locale, profile, updateProfileField }: ClientTabSharedProps) {
  return (
    <div className="sub-card">
      <h3>{t(locale, 'clients.sections.vaccines')}</h3>
      <div className="field"><label>{t(locale, 'clients.fields.vaccineInfo')}</label><input value={profile.vaccineInfo} onChange={(event) => updateProfileField('vaccineInfo', event.target.value)} /></div>
    </div>
  );
}
