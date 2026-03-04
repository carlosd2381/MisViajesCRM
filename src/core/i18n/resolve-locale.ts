import { DEFAULT_LOCALE } from './default-locale';
import { isSupportedLocale, type SupportedLocale } from './supported-locales';

export function resolveLocale(preferred?: string): SupportedLocale {
  if (!preferred) {
    return DEFAULT_LOCALE;
  }

  return isSupportedLocale(preferred) ? preferred : DEFAULT_LOCALE;
}
