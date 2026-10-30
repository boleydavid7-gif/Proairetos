export type OnboardingStep = {
  title: string;
  lines: string[];
  action: string;
  brand?: boolean;
  /** The form for name and shifts. */
  form?: boolean;
  /** A panel in place of the form: Home Screen steps, or the other apps. */
  panel?: 'home-screen' | 'apps' | 'plans';
};

export const onboardingSteps: OnboardingStep[] = [
  {
    title: 'Proairetos',
    lines: ['Greek for “chosen deliberately.”', 'A calm place to choose where your time and attention go.'],
    action: 'Get started',
    brand: true,
  },
  {
    title: 'Yours to choose',
    lines: [
      'Not everything that happens is up to you. Where your attention goes is.',
      'Write things down as they come. Today shows only what you pick.',
    ],
    action: 'Continue',
  },
  {
    title: 'On your Home Screen',
    lines: ['Open it in one tap, like any other app.'],
    action: 'Continue',
    panel: 'home-screen',
  },
  {
    title: 'More apps',
    lines: ['Add only the ones you need.'],
    action: 'Continue',
    panel: 'apps',
  },
  {
    title: 'Prices and sync',
    lines: ['Proairetos is free. Sync is optional.'],
    action: 'Continue',
    panel: 'plans',
  },
  {
    title: 'Make it yours',
    lines: ['You can change any of this in Settings.'],
    action: 'Begin',
    form: true,
  },
];
