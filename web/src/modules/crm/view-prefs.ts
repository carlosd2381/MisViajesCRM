export function loadViewPrefs<T extends Record<string, unknown>>(storageKey: string): Partial<T> | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(storageKey);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    return parsed as Partial<T>;
  } catch {
    return null;
  }
}

export function saveViewPrefs(storageKey: string, payload: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(storageKey, JSON.stringify(payload));
}
