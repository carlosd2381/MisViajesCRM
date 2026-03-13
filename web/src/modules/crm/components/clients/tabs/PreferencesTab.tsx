import { list, t } from '../../../i18n';
import type { ClientProfileForm, Locale } from '../../../types';

interface PreferencesTabProps {
  locale: Locale;
  profile: ClientProfileForm;
  updateProfileField: <K extends keyof ClientProfileForm>(key: K, value: ClientProfileForm[K]) => void;
  toggleArrayField: (field: 'accommodations' | 'vibePreferences' | 'activityPreferences', value: string) => void;
}

export function PreferencesTab({ locale, profile, updateProfileField, toggleArrayField }: PreferencesTabProps) {
  return (
    <div className="sub-card">
      <h3>{t(locale, 'clients.sections.travelPreferences')}</h3>
      <div className="profile-grid-2">
        <div>
          <p className="note">{t(locale, 'clients.preferences.seat')}</p>
          {list(locale, 'options.seatOptions').map((value) => (
            <label key={value}><input type="radio" name="seat" checked={profile.seatPreference === value} onChange={() => updateProfileField('seatPreference', value)} /> {value}</label>
          ))}
        </div>
        <div>
          <p className="note">{t(locale, 'clients.preferences.bed')}</p>
          {list(locale, 'options.bedOptions').map((value) => (
            <label key={value}><input type="radio" name="bed" checked={profile.bedPreference === value} onChange={() => updateProfileField('bedPreference', value)} /> {value}</label>
          ))}
        </div>
      </div>
      <div className="field"><label>{t(locale, 'clients.fields.mealPreference')}</label><input value={profile.mealPreference} onChange={(event) => updateProfileField('mealPreference', event.target.value)} /></div>

      <p className="note">{t(locale, 'clients.preferences.accommodations')}</p>
      <div className="checkbox-grid">
        {list(locale, 'options.accommodations').map((item) => (
          <label key={item}><input type="checkbox" checked={profile.accommodations.includes(item)} onChange={() => toggleArrayField('accommodations', item)} /> {item}</label>
        ))}
      </div>

      <p className="note">{t(locale, 'clients.preferences.vibes')}</p>
      <div className="checkbox-grid">
        {list(locale, 'options.vibes').map((item) => (
          <label key={item}><input type="checkbox" checked={profile.vibePreferences.includes(item)} onChange={() => toggleArrayField('vibePreferences', item)} /> {item}</label>
        ))}
      </div>

      <p className="note">{t(locale, 'clients.preferences.activities')}</p>
      <div className="checkbox-grid">
        {list(locale, 'options.activities').map((item) => (
          <label key={item}><input type="checkbox" checked={profile.activityPreferences.includes(item)} onChange={() => toggleArrayField('activityPreferences', item)} /> {item}</label>
        ))}
      </div>
    </div>
  );
}
