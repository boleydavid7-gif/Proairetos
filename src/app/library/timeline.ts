export interface LibraryTimelineExpansion {
  years: Record<string, boolean>;
  months: Record<string, boolean>;
}

const STORAGE_KEY = 'proairetos.reflect.library.timeline.v1';

function booleanMap(value: unknown): Record<string, boolean> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, boolean] => typeof entry[1] === 'boolean'),
  );
}

/** Expansion is a device-level reading preference, not synced content. */
export function loadLibraryTimelineExpansion(): LibraryTimelineExpansion {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { years: {}, months: {} };
    const saved = JSON.parse(raw) as { years?: unknown; months?: unknown };
    return { years: booleanMap(saved.years), months: booleanMap(saved.months) };
  } catch {
    return { years: {}, months: {} };
  }
}

export function saveLibraryTimelineExpansion(expansion: LibraryTimelineExpansion): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(expansion));
  } catch {
    // The timeline remains usable if browser storage is unavailable.
  }
}
