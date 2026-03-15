import { t } from './i18n';
import type { Locale, ViewKey } from './types';

export function titleFromView(locale: Locale, currentView: ViewKey): string {
  const labels: Record<ViewKey, string> = {
    dashboard: t(locale, 'nav.dashboard'),
    leads: t(locale, 'nav.leads'),
    clients: t(locale, 'nav.clients'),
    itineraries: t(locale, 'nav.itineraries'),
    suppliers: t(locale, 'nav.suppliers'),
    settings: t(locale, 'nav.settings'),
    placeholder: t(locale, 'nav.module')
  };
  return labels[currentView];
}

export function responseMessage(raw: unknown, fallback: string): string {
  const message = (raw as { message?: unknown } | null | undefined)?.message;
  return typeof message === 'string' && message.trim().length > 0 ? message : fallback;
}

export function deleteConflictMessage(locale: Locale, module: 'lead' | 'client' | 'supplier'): string {
  if (module === 'lead') return t(locale, 'status.deleteConflictLead');
  if (module === 'client') return t(locale, 'status.deleteConflictClient');
  return t(locale, 'status.deleteConflictSupplier');
}

function cascadeDeletePhrase(locale: Locale): string {
  return locale === 'es-MX' ? 'Eliminar todo' : 'Delete all';
}

export function requestCascadeDeleteConfirmation(locale: Locale): string | null {
  const phrase = cascadeDeletePhrase(locale);
  const promptText = locale === 'es-MX'
    ? `Escribe "${phrase}" para confirmar el borrado total.`
    : `Type "${phrase}" to confirm full deletion.`;
  return window.prompt(promptText, '')?.trim() ?? null;
}