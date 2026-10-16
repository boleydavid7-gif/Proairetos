export type OnboardingStep = {
  title: string;
  lines: string[];
  action: string;
  brand?: boolean;
  /** The form for name, values, and shifts. */
  form?: boolean;
  /** A panel in place of the form: Home Screen steps, or the other apps. */
  panel?: 'home-screen' | 'apps';
};

export const onboardingSteps: OnboardingStep[] = [
  {
    title: 'Proairetos',
    lines: ['Clarity today.', 'A steadier tomorrow.'],
    action: 'Get started',
    brand: true,
  },
  {
    title: 'Capture first',
    lines: ['Get things out of your head the moment they arrive.', 'Sorting can wait. You decide what matters.'],
    action: 'Continue',
  },
  {
    title: 'On your Home Screen',
    lines: ['Add Proairetos like an app.'],
    action: 'Continue',
    panel: 'home-screen',
  },
  {
    title: 'More apps',
    lines: ['Add the ones you want, when you want.'],
    action: 'Continue',
    panel: 'apps',
  },
  {
    title: 'Make it yours',
    lines: ['Everything can change later.'],
    action: 'Begin',
    form: true,
  },
];
