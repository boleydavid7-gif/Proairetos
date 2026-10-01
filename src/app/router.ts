export const routes = {
  now: '/now',
  day: '/day',
  life: '/life',
  reflect: '/reflect',
  capture: '/capture',
  settings: '/settings',
} as const;

export type AppRoute = keyof typeof routes;
