import { t } from '../../../i18n';
import type { ClientTabSharedProps } from '../types';

export function NotesTab({ locale, profile, updateProfileField }: ClientTabSharedProps) {
  return (
    <div className="sub-card">
      <h3>{t(locale, 'clients.sections.notes')}</h3>
      <div className="field"><label>{t(locale, 'clients.fields.notes')}</label><input value={profile.notes} onChange={(event) => updateProfileField('notes', event.target.value)} /></div>
    </div>
  );
}
