export type OnboardingStep = {
  title: string;
  lines: string[];
  action: string;
  brand?: boolean;
  /** The form for name, values, and shifts. */
  form?: boolean;
};

export const onboardingSteps: OnboardingStep[] = [
  {
    title: 'Proairetos',
    lines: ['Clarity today.', 'A steadier tomorrow.'],
    action: 'Get Started',
    brand: true,
  },
  {
    title: 'Capture first',
    lines: ['Get things out of your head the moment they arrive.', 'Sorting can wait.'],
    action: 'Continue',
  },
  {
    title: 'Yours to choose',
    lines: ['You decide what matters.', 'No scores, no streaks.'],
    action: 'Continue',
  },
  {
    title: 'Make it yours',
    lines: ['Everything can change later.'],
    action: 'Begin',
    form: true,
  },
];
