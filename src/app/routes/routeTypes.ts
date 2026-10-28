export type AppRoute =
  | 'today'
  | 'reflect'
  | 'capture'
  | 'compass'
  | 'plan'
  | 'journal'
  | 'insights'
  | 'schedule'
  | 'review'
  | 'settings'
  | 'calendar'
  | 'meditate';

export const routePaths: Record<AppRoute, string> = {
  today: '/today',
  reflect: '/reflect',
  capture: '/capture',
  compass: '/compass',
  plan: '/plan',
  journal: '/journal',
  insights: '/insights',
  schedule: '/schedule',
  review: '/review',
  settings: '/settings',
  calendar: '/calendar',
  meditate: '/meditate',
};

export const defaultRoute: AppRoute = 'today';

/** Where a page that sits under a main tab belongs, for a page opened straight from its address. */
export const parentRoute: Partial<Record<AppRoute, AppRoute>> = {
  compass: 'reflect',
  journal: 'reflect',
  insights: 'reflect',
  meditate: 'reflect',
  review: 'reflect',
  schedule: 'settings',
  settings: 'today',
};
