import type { IncomingMessage, ServerResponse } from 'node:http';
import { DEFAULT_LOCALE } from '../i18n/default-locale';
import { resolveLocale } from '../i18n/resolve-locale';
import type { SupportedLocale } from '../i18n/supported-locales';

export async function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];

  for await (const chunk of req) {
    chunks.push(Buffer.from(chunk));
  }

  const rawBody = Buffer.concat(chunks).toString('utf8').trim();
  if (!rawBody) return {};

  return JSON.parse(rawBody) as Record<string, unknown>;
}

export function sendJson(res: ServerResponse, statusCode: number, payload: unknown): void {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

export function notFound(res: ServerResponse, locale = DEFAULT_LOCALE): void {
  const message = locale === 'es-MX' ? 'Recurso no encontrado' : 'Resource not found';
  sendJson(res, 404, { message });
}

export function parsePathSegments(url?: string): string[] {
  if (!url) return [];
  const pathname = new URL(url, 'http://localhost').pathname;
  return pathname.split('/').filter(Boolean);
}

export function extractLocale(req: IncomingMessage): SupportedLocale {
  const raw = req.headers['x-locale'];
  const localeHeader = Array.isArray(raw) ? raw[0] : raw;
  return resolveLocale(localeHeader);
}
