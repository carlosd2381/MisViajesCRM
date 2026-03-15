export type BuilderSectionKey = 'proposal' | 'days' | 'activities';

export const BUILDER_SECTION_STORAGE_KEY = 'misviajescrm.itineraries.builder.sections';
export const BUILDER_SECTION_KEYS: BuilderSectionKey[] = ['proposal', 'days', 'activities'];
export const BUILDER_SECTION_SHORTCUT_HINT_ID = 'builder-section-shortcut-hint';
export const COLLAPSE_ALL_SHORTCUT = 'Alt+Shift+C';
export const EXPAND_ALL_SHORTCUT = 'Alt+Shift+E';

export const BUILDER_SECTION_CONTAINER_IDS: Record<BuilderSectionKey, string> = {
  proposal: 'builder-section-proposal',
  days: 'builder-section-days',
  activities: 'builder-section-activities'
};

export function loadBuilderSectionVisibility(): Record<BuilderSectionKey, boolean> {
  const defaults: Record<BuilderSectionKey, boolean> = {
    proposal: true,
    days: true,
    activities: true
  };

  if (typeof window === 'undefined') return defaults;

  try {
    const raw = window.sessionStorage.getItem(BUILDER_SECTION_STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<Record<BuilderSectionKey, boolean>>;
    return {
      proposal: parsed.proposal ?? true,
      days: parsed.days ?? true,
      activities: parsed.activities ?? true
    };
  } catch {
    return defaults;
  }
}

export function visibilityForAllSections(value: boolean): Record<BuilderSectionKey, boolean> {
  return Object.fromEntries(BUILDER_SECTION_KEYS.map((section) => [section, value])) as Record<BuilderSectionKey, boolean>;
}

export function isAllSectionsExpanded(visibility: Record<BuilderSectionKey, boolean>): boolean {
  return BUILDER_SECTION_KEYS.every((section) => visibility[section]);
}

export function isAllSectionsCollapsed(visibility: Record<BuilderSectionKey, boolean>): boolean {
  return BUILDER_SECTION_KEYS.every((section) => !visibility[section]);
}

export function countOpenSections(visibility: Record<BuilderSectionKey, boolean>): number {
  return BUILDER_SECTION_KEYS.filter((section) => visibility[section]).length;
}
