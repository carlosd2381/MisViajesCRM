import { t } from '../i18n';
import type { Locale, SessionAuth } from '../types';

interface AuthCardProps {
  locale: Locale;
  auth: SessionAuth;
  onChangeAuth: (next: SessionAuth | ((previous: SessionAuth) => SessionAuth)) => void;
  onIssueToken: () => void;
  onClearToken: () => void;
}

export function AuthCard({ locale, auth, onChangeAuth, onIssueToken, onClearToken }: AuthCardProps) {
  const roleLabel = (role: string): string => {
    const key = `labels.authRole.${role}`;
    const translated = t(locale, key);
    if (translated !== key) return translated;
    return role
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  return (
    <section className="card">
      <h2>{t(locale, 'auth.title')}</h2>
      <div className="profile-grid-3">
        <div className="field">
          <label>{t(locale, 'auth.userId')}</label>
          <input value={auth.userId} onChange={(event) => onChangeAuth((prev) => ({ ...prev, userId: event.target.value }))} />
        </div>
        <div className="field">
          <label>{t(locale, 'auth.role')}</label>
          <select value={auth.role} onChange={(event) => onChangeAuth((prev) => ({ ...prev, role: event.target.value }))}>
            <option value="owner">{roleLabel('owner')}</option>
            <option value="manager">{roleLabel('manager')}</option>
            <option value="agent">{roleLabel('agent')}</option>
            <option value="finance">{roleLabel('finance')}</option>
            <option value="operations">{roleLabel('operations')}</option>
          </select>
        </div>
        <div className="field">
          <label>{auth.accessToken ? t(locale, 'auth.modeToken') : t(locale, 'auth.modeHeader')}</label>
          <div className="btn-row">
            <button type="button" onClick={onIssueToken}>{t(locale, 'auth.issueToken')}</button>
            <button type="button" className="ghost" onClick={onClearToken}>{t(locale, 'auth.clearToken')}</button>
          </div>
        </div>
      </div>
    </section>
  );
}
