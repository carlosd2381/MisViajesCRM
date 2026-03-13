import { t } from '../i18n';
import type { Locale, ViewKey } from '../types';
import misViajesLogo from '../../../assets/MisViajesLogoTransparent.png';

export interface SidebarLink {
  key: string;
  label: string;
  functional: boolean;
}

interface SidebarProps {
  locale: Locale;
  view: ViewKey;
  links: SidebarLink[];
  onSelectView: (view: ViewKey) => void;
}

export function Sidebar({ locale, view, links, onSelectView }: SidebarProps) {
  return (
    <aside className="crm-sidebar">
      <div className="crm-brand">
        <img src={misViajesLogo} alt={t(locale, 'app.title')} className="crm-brand-logo" />
      </div>
      <div className="crm-menu-title">{t(locale, 'app.navigation')}</div>
      {links.map((link) => {
        const active = (link.key === view) || (!link.functional && view === 'placeholder' && link.key !== 'dashboard' && link.key !== 'leads' && link.key !== 'clients');
        return (
          <button
            key={link.key}
            type="button"
            className={`crm-menu-link ${active ? 'active' : ''} ${!link.functional ? 'locked' : ''}`}
            onClick={() => onSelectView(link.functional ? (link.key as ViewKey) : 'placeholder')}
          >
            {link.label}{!link.functional ? ` (${t(locale, 'app.soon')})` : ''}
          </button>
        );
      })}
    </aside>
  );
}
