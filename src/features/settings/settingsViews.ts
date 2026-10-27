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
  | 'about'
  | 'inbox'
  | 'health'
  | 'together'
  | 'install';

// Another screen can ask Settings to open straight onto one page (say, from a backup offer).
let requestedView: View | null = null;

/** Pages folded into another: older links and reminders still land in the right place. */
const FOLDED: Partial<Record<View, View>> = {
  lock: 'privacy',
  delete: 'backup',
  import: 'backup',
  offers: 'today',
  calendar: 'calendars',
  profile: 'account',
  sources: 'about',
};

/** The page that shows a view, after folding. */
export function shownView(view: View): View {
  return FOLDED[view] ?? view;
}

export function openSettingsAt(view: View): void {
  // A link can carry any word; one that names no page opens the list instead of an empty page.
  requestedView = view in viewTitles ? shownView(view) : null;
}

export const viewTitles: Record<View, string> = {
  lock: 'Privacy and lock',
  notifications: 'Notifications',
  profile: 'Your name',
  day: 'When your day starts',
  calendar: 'Share to your calendar',
  calendars: 'Calendars',
  weather: 'Weather',
  offers: 'Quiet offers',
  today: 'What’s included',
  appearance: 'Appearance',
  help: 'Help and feedback',
  sources: 'Where this comes from',
  account: 'Account and sync',
  import: 'Bring things in',
  backup: 'Your data',
  privacy: 'Privacy and lock',
  delete: 'Delete everything',
  news: 'What’s new',
  store: 'Store',
  about: 'About Proairetos',
  inbox: 'Capture from anywhere',
  health: 'Health data',
  together: 'Shared list',
  install: 'Install Proairetos',
};

/** The page asked for, once. */
export function takeRequestedView(): View | null {
  const requested = requestedView;
  requestedView = null;
  return requested;
}
