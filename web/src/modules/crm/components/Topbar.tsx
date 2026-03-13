import { messages, t } from '../i18n';
import type { Locale } from '../types';

interface TopbarProps {
  title: string;
  locale: Locale;
  isDirty: boolean;
  onLocaleChange: (locale: Locale) => void;
}

export function Topbar({ title, locale, isDirty, onLocaleChange }: TopbarProps) {
  const localeLabel = (value: Locale): string => {
    const key = `app.localeNames.${value}`;
    const translated = t(locale, key);
    return translated === key ? value : translated;
  };

  return (
    <header className="crm-topbar">
      <h1>{title}</h1>
      <div className="crm-topbar-right">
        {isDirty ? <span className="dirty-pill">{t(locale, 'app.unsavedChanges')}</span> : null}
        <span className="user-pill">{t(locale, 'app.userBadge')} • {localeLabel(locale)}</span>
        <label className="user-pill" htmlFor="locale-select">{t(locale, 'app.localeLabel')}</label>
        <select id="locale-select" value={locale} onChange={(event) => onLocaleChange(event.target.value as Locale)}>
          {(Object.keys(messages) as Locale[]).map((item) => <option key={item} value={item}>{localeLabel(item)}</option>)}
        </select>
      </div>
    </header>
  );
}
