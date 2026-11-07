// Settings' pages by name, kept apart from the Settings screen so other screens can ask for one without loading it.

export type View =
  | 'lock'
  | 'notifications'
  | 'attention'
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
  | 'assistant'
  | 'health'
  | 'together'
  | 'household'
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
  sources: 'about',
  profile: 'account',
};

/** The page that shows a view, after folding. */
export function shownView(view: View): View {
  return FOLDED[view] ?? view;
}

const requestListeners = new Set<() => void>();

/** Settings already on screen hears a request at once; one not yet open reads it when it opens. */
export function onSettingsRequest(listener: () => void): () => void {
  requestListeners.add(listener);
  return () => requestListeners.delete(listener);
}

export function openSettingsAt(view: View): void {
  // A link can carry any word; one that names no page opens the list instead of an empty page.
  requestedView = view in viewTitles ? shownView(view) : null;
  requestListeners.forEach((listener) => listener());
}

export const viewTitles: Record<View, string> = {
  lock: 'Privacy and lock',
  notifications: 'Notifications',
  assistant: 'Browser assistant',
  attention: 'Attention',
  profile: 'Profile',
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
  store: 'App Store',
  about: 'About Proairetos',
  inbox: 'Capture from anywhere',
  health: 'Health data',
  together: 'Shared list',
  household: 'Family',
  install: 'Install Proairetos',
};

/** The page asked for, once. */
export function takeRequestedView(): View | null {
  const requested = requestedView;
  requestedView = null;
  return requested;
}
