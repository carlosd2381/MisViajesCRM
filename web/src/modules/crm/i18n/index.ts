import type { Locale } from '../types';
import { enUsMessages } from './en-US';
import { esMxMessages } from './es-MX';
import type { Dictionary } from './types';

export const messages: Record<Locale, Dictionary> = {
  'es-MX': esMxMessages,
  'en-US': enUsMessages,
};

export function t(locale: Locale, path: string): string {
  const parts = path.split('.');
  let current: unknown = messages[locale];

  for (const part of parts) {
    if (!current || typeof current !== 'object') {
      return path;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return typeof current === 'string' ? current : path;
}

export function list(locale: Locale, path: string): string[] {
  const parts = path.split('.');
  let current: unknown = messages[locale];

  for (const part of parts) {
    if (!current || typeof current !== 'object') {
      return [];
    }
    current = (current as Record<string, unknown>)[part];
  }

  return Array.isArray(current) ? current.map((item) => String(item)) : [];
}
