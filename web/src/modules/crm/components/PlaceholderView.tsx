import { t } from '../i18n';
import type { Locale } from '../types';

interface PlaceholderViewProps {
  locale: Locale;
}

export function PlaceholderView({ locale }: PlaceholderViewProps) {
  return (
    <section className="card placeholder">
      <h2>{t(locale, 'placeholder.title')}</h2>
      <p>{t(locale, 'placeholder.description')}</p>
    </section>
  );
}
