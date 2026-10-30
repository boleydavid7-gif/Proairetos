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
    lines: [
      'Proairetos (προαιρετός) is ancient Greek for what is chosen deliberately.',
      'It comes from prohairesis (προαίρεσις), the Stoic name for our capacity to consider, judge and choose how we respond and act.',
      'We cannot control everything that happens to us, or give equal attention to everything that asks for it.',
      'We can become more deliberate about where our attention goes, how we use our time and what we put first.',
    ],
    action: 'Get started',
    brand: true,
  },
  {
    title: 'Yours to choose',
    lines: ['Write things down as they come.', 'Today shows only what you pick.'],
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
