import type { Entry } from '../core/rhythm';

/** Only the four practical next steps in Diaita's timeline lead to their companion apps. */
export function timelineHref(entry: Pick<Entry, 'key' | 'kind'>): string | undefined {
  switch (entry.kind) {
    case 'caffeine':
      return '/hydros/';
    case 'worry':
      return '/reflect';
    case 'wind-down':
      return '/meditate';
    case 'meal':
      return entry.key.startsWith('meal:') ? '/soma/' : undefined;
    default:
      return undefined;
  }
}
