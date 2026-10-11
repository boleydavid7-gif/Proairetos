// Settings' pages by name, kept apart from the Settings screen so other screens can ask for one without loading it.

export type View =
  | 'lock'
  | 'notifications'
  | 'import'
  | 'weather'
  | 'calendars'
  | 'help'
  | 'appearance'
  | 'today'
  | 'offers'
  | 'sources'
  | 'calendar'
  | 'day'
  | 'profile'
  | 'account'
  | 'backup'
  | 'privacy'
  | 'delete'
  | 'news'
  | 'store'
  | 'about';

// Another screen can ask Settings to open straight onto one page (say, from a backup offer).
let requestedView: View | null = null;
export function openSettingsAt(view: View): void {
  // A link can carry any word; one that names no page opens the list instead of an empty page.
  requestedView = view in viewTitles ? view : null;
}

export const viewTitles: Record<View, string> = {
  lock: 'Lock Reflect',
  notifications: 'Notifications',
  profile: 'Your name',
  day: 'When your day starts',
  calendar: 'Share to your calendar',
  calendars: 'Calendars',
  weather: 'Weather',
  offers: 'Quiet offers',
  today: 'What’s included',
  appearance: 'Appearance',
  help: 'Help & feedback',
  sources: 'Where this comes from',
  account: 'Account',
  import: 'Bring things in',
  backup: 'Back up and restore',
  privacy: 'Privacy',
  delete: 'Delete everything',
  news: 'What’s new',
  store: 'Store',
  about: 'About Proairetos',
};

/** The page asked for, once. */
export function takeRequestedView(): View | null {
  const requested = requestedView;
  requestedView = null;
  return requested;
}
